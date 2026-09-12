import { z } from "zod";
import type {
	GithubProjectGateway,
	ItemInspectionRequest,
} from "../project-items/types.ts";
import {
	type ItemSnapshot,
	ItemSnapshotSchema,
	type ProjectIdentity,
	type ProjectSnapshot,
	ProjectSnapshotSchema,
} from "../receipts/schemas.ts";
import type { GhExecutor } from "./types.ts";

const PageInfoSchema = z.object({
	hasNextPage: z.boolean(),
	endCursor: z.string().nullable(),
});

const ProjectViewSchema = z.object({
	id: z.string().min(1),
	number: z.number().int().positive(),
	title: z.string().min(1),
	url: z.string().url(),
});

const PROJECT_ITEMS_QUERY = `query($owner:String!,$repository:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$repository){issue(number:$number){id projectItems(first:100,after:$cursor){nodes{id project{id number title url}} pageInfo{hasNextPage endCursor}}}}}`;
const ITEM_FIELDS_QUERY = `query($itemId:ID!,$cursor:String){node(id:$itemId){... on ProjectV2Item{fieldValues(first:100,after:$cursor){nodes{__typename ... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2FieldCommon{name}}} ... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2FieldCommon{name}}} ... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2FieldCommon{name}}} ... on ProjectV2ItemFieldDateValue{date field{... on ProjectV2FieldCommon{name}}} ... on ProjectV2ItemFieldIterationValue{title field{... on ProjectV2FieldCommon{name}}}} pageInfo{hasNextPage endCursor}}}}}`;
const PROJECT_FIELDS_QUERY = `query($projectId:ID!,$cursor:String){node(id:$projectId){... on ProjectV2{fields(first:100,after:$cursor){nodes{__typename ... on ProjectV2Field{id name dataType} ... on ProjectV2IterationField{id name} ... on ProjectV2SingleSelectField{id name options{id name}}} pageInfo{hasNextPage endCursor}}}}}`;
const PROJECT_VIEWS_QUERY = `query($projectId:ID!,$cursor:String){node(id:$projectId){... on ProjectV2{views(first:100,after:$cursor){nodes{name layout filter} pageInfo{hasNextPage endCursor}}}}}`;

interface ConnectionPage<T> {
	readonly nodes: readonly T[];
	readonly pageInfo: z.infer<typeof PageInfoSchema>;
}

type JsonRecord = Readonly<Record<string, unknown>>;

function asRecord(value: unknown, description: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${description} must be an object`);
	}
	return value as JsonRecord;
}

function asString(value: unknown, description: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${description} must be a non-empty string`);
	}
	return value;
}

function splitRepository(repository: string): readonly [string, string] {
	const parts = repository.split("/");
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error(`repository must use owner/name: ${JSON.stringify(repository)}`);
	}
	return [parts[0], parts[1]];
}

function connection(value: unknown, description: string): ConnectionPage<JsonRecord> {
	const record = asRecord(value, description);
	const nodes = z.array(z.record(z.string(), z.unknown())).parse(record.nodes);
	const pageInfo = PageInfoSchema.parse(record.pageInfo);
	if (pageInfo.hasNextPage && pageInfo.endCursor === null) {
		throw new Error(`${description} has another page but no cursor`);
	}
	return { nodes, pageInfo };
}

export class ProjectItemNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ProjectItemNotFoundError";
	}
}

export class ProjectV2Client implements GithubProjectGateway {
	private readonly execute: GhExecutor;

	constructor(execute: GhExecutor) {
		this.execute = execute;
	}

	async getProject(owner: string, number: number): Promise<ProjectIdentity> {
		const output = await this.execute([
			"project",
			"view",
			String(number),
			"--owner",
			owner,
			"--format",
			"json",
		]);
		const parsed = ProjectViewSchema.parse(JSON.parse(output.stdout));
		return { ...parsed, owner };
	}

	async inspectProject(owner: string, number: number): Promise<ProjectSnapshot> {
		const project = await this.getProject(owner, number);
		const [fields, views] = await Promise.all([
			this.listFields(project.id),
			this.listViews(project.id),
		]);
		return ProjectSnapshotSchema.parse({ project, fields, views });
	}

	async inspectItem(request: ItemInspectionRequest): Promise<ItemSnapshot> {
		const project = await this.getProject(request.projectOwner, request.projectNumber);
		const [repositoryOwner, repositoryName] = splitRepository(request.repository);
		let cursor: string | null = null;
		let issueId: string | null = null;
		const matches: JsonRecord[] = [];

		do {
			const response = await this.graphql(PROJECT_ITEMS_QUERY, {
				owner: repositoryOwner,
				repository: repositoryName,
				number: request.issueNumber,
				cursor,
			});
			const repository = asRecord(
				asRecord(response.data, "GraphQL data").repository,
				"GraphQL repository",
			);
			const issueValue = repository.issue;
			if (issueValue === null) {
				throw new Error(
					`Issue ${request.repository}#${request.issueNumber} was not found`,
				);
			}
			const issue = asRecord(issueValue, "GraphQL Issue");
			issueId ??= asString(issue.id, "Issue id");
			const page = connection(issue.projectItems, "Issue Project items");
			for (const node of page.nodes) {
				const nodeProject = asRecord(node.project, "Project item Project");
				if (nodeProject.id === project.id) matches.push(node);
			}
			cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
		} while (cursor !== null);

		if (matches.length === 0) {
			throw new ProjectItemNotFoundError(
				`Issue ${request.repository}#${request.issueNumber} is not in Project ${request.projectOwner}/${request.projectNumber}`,
			);
		}
		if (matches.length !== 1) {
			throw new Error(
				`Expected exactly one Project item for ${request.repository}#${request.issueNumber} in ${request.projectOwner}/${request.projectNumber}; found ${matches.length}`,
			);
		}
		const itemId = asString(matches[0]?.id, "Project item id");
		const fields = await this.readItemFields(itemId);
		return ItemSnapshotSchema.parse({
			project,
			issue: {
				id: issueId,
				number: request.issueNumber,
				repository: request.repository,
			},
			itemId,
			fields,
		});
	}

	async resolveSingleSelect(
		projectId: string,
		fieldName: string,
		optionName: string,
	): Promise<{ readonly fieldId: string; readonly optionId: string }> {
		const fields = await this.listFields(projectId);
		const matches = fields.filter(
			(field) => field.name === fieldName && field.options !== undefined,
		);
		if (matches.length !== 1) {
			throw new Error(
				`Expected exactly one field named ${JSON.stringify(fieldName)}; found ${matches.length}`,
			);
		}
		const options =
			matches[0]?.options?.filter((option) => option.name === optionName) ?? [];
		if (options.length !== 1) {
			throw new Error(
				`Expected exactly one option named ${JSON.stringify(optionName)} in field ${JSON.stringify(fieldName)}; found ${options.length}`,
			);
		}
		return {
			fieldId: asString(matches[0]?.id, "field id"),
			optionId: asString(options[0]?.id, "option id"),
		};
	}

	async editSingleSelect(request: {
		readonly projectId: string;
		readonly itemId: string;
		readonly fieldId: string;
		readonly optionId: string;
	}): Promise<void> {
		await this.execute([
			"project",
			"item-edit",
			"--id",
			request.itemId,
			"--project-id",
			request.projectId,
			"--field-id",
			request.fieldId,
			"--single-select-option-id",
			request.optionId,
		]);
	}

	async addItem(request: {
		readonly projectOwner: string;
		readonly projectNumber: number;
		readonly issueUrl: string;
	}): Promise<void> {
		await this.execute([
			"project",
			"item-add",
			String(request.projectNumber),
			"--owner",
			request.projectOwner,
			"--url",
			request.issueUrl,
			"--format",
			"json",
		]);
	}

	private async graphql(
		query: string,
		variables: Readonly<Record<string, string | number | null>>,
	): Promise<JsonRecord> {
		const args = ["api", "graphql", "-f", `query=${query}`];
		for (const [name, value] of Object.entries(variables)) {
			if (value === null) continue;
			args.push(typeof value === "number" ? "-F" : "-f", `${name}=${value}`);
		}
		const output = await this.execute(args);
		return asRecord(JSON.parse(output.stdout), "GraphQL response");
	}

	private async readItemFields(itemId: string): Promise<Record<string, string | null>> {
		let cursor: string | null = null;
		const fields: Record<string, string | null> = {};
		do {
			const response = await this.graphql(ITEM_FIELDS_QUERY, { itemId, cursor });
			const node = asRecord(
				asRecord(response.data, "GraphQL data").node,
				"Project item",
			);
			const page = connection(node.fieldValues, "Project item field values");
			for (const fieldValue of page.nodes) {
				if (
					typeof fieldValue.field !== "object" ||
					fieldValue.field === null ||
					Array.isArray(fieldValue.field)
				) {
					continue;
				}
				const field = fieldValue.field as JsonRecord;
				const name = asString(field.name, "Project item field name");
				if (Object.hasOwn(fields, name)) {
					throw new Error(
						`Duplicate Project item field value for ${JSON.stringify(name)}`,
					);
				}
				const value =
					fieldValue.name ??
					fieldValue.text ??
					fieldValue.number ??
					fieldValue.date ??
					fieldValue.title ??
					null;
				fields[name] = value === null ? null : String(value);
			}
			cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
		} while (cursor !== null);
		return fields;
	}

	private async listFields(projectId: string): Promise<ProjectSnapshot["fields"]> {
		let cursor: string | null = null;
		const fields: ProjectSnapshot["fields"][number][] = [];
		do {
			const response = await this.graphql(PROJECT_FIELDS_QUERY, { projectId, cursor });
			const node = asRecord(asRecord(response.data, "GraphQL data").node, "Project");
			const page = connection(node.fields, "Project fields");
			for (const field of page.nodes) {
				if (typeof field.id !== "string" || typeof field.name !== "string") continue;
				const options = Array.isArray(field.options)
					? field.options.map((option) => {
							const record = asRecord(option, "single-select option");
							return {
								id: asString(record.id, "option id"),
								name: asString(record.name, "option name"),
							};
						})
					: undefined;
				fields.push({
					id: field.id,
					name: field.name,
					type:
						typeof field.dataType === "string"
							? field.dataType
							: typeof field.__typename === "string"
								? field.__typename
								: options === undefined
									? "UNKNOWN"
									: "SINGLE_SELECT",
					...(options === undefined ? {} : { options }),
				});
			}
			cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
		} while (cursor !== null);
		return fields;
	}

	private async listViews(projectId: string): Promise<ProjectSnapshot["views"]> {
		let cursor: string | null = null;
		const views: ProjectSnapshot["views"][number][] = [];
		do {
			const response = await this.graphql(PROJECT_VIEWS_QUERY, { projectId, cursor });
			const node = asRecord(asRecord(response.data, "GraphQL data").node, "Project");
			const page = connection(node.views, "Project views");
			for (const view of page.nodes) {
				views.push({
					name: asString(view.name, "view name"),
					layout: asString(view.layout, "view layout"),
					filter: typeof view.filter === "string" ? view.filter : "",
				});
			}
			cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
		} while (cursor !== null);
		return views;
	}
}
