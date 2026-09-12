import { ProjectItemNotFoundError } from "../github/project-v2-client.ts";
import {
	type CommandReceipt,
	commandReceipt,
	type ItemSnapshot,
} from "../receipts/schemas.ts";
import type {
	GithubProjectGateway,
	ItemInspectionRequest,
	SingleSelectRequest,
} from "./types.ts";

export interface AddItemRequest extends ItemInspectionRequest {
	readonly issueUrl: string;
}

export class ProjectItemOperations {
	private readonly gateway: GithubProjectGateway;

	constructor(gateway: GithubProjectGateway) {
		this.gateway = gateway;
	}

	async setSingleSelect(
		request: SingleSelectRequest,
	): Promise<CommandReceipt<ItemSnapshot, ItemSnapshot>> {
		const before = await this.gateway.inspectItem(request);
		if (before.fields[request.fieldName] === request.optionName) {
			return commandReceipt({
				command: "field.set",
				outcome: "noop",
				target: targetOf(request),
				request: {
					fieldName: request.fieldName,
					optionName: request.optionName,
				},
				before,
				after: before,
				postcondition: {
					verified: true,
					description: "The exact field already has the requested option",
				},
			});
		}

		const identity = await this.gateway.resolveSingleSelect(
			before.project.id,
			request.fieldName,
			request.optionName,
		);
		await this.gateway.editSingleSelect({
			projectId: before.project.id,
			itemId: before.itemId,
			...identity,
		});
		const after = await this.gateway.inspectItem(request);
		if (after.fields[request.fieldName] !== request.optionName) {
			throw new Error(
				`Field mutation postcondition failed: ${JSON.stringify(request.fieldName)} is not ${JSON.stringify(request.optionName)}`,
			);
		}

		return commandReceipt({
			command: "field.set",
			outcome: "applied",
			target: targetOf(request),
			request: { fieldName: request.fieldName, optionName: request.optionName },
			before,
			after,
			postcondition: {
				verified: true,
				description: "A fresh read observed the requested exact option",
			},
		});
	}

	async addItem(
		request: AddItemRequest,
	): Promise<CommandReceipt<ItemSnapshot | null, ItemSnapshot>> {
		let before: ItemSnapshot | null = null;
		try {
			before = await this.gateway.inspectItem(request);
		} catch (error) {
			if (!(error instanceof ProjectItemNotFoundError)) throw error;
		}
		if (before !== null) {
			return commandReceipt({
				command: "item.add",
				outcome: "noop",
				target: targetOf(request),
				request: { issueUrl: request.issueUrl },
				before,
				after: before,
				postcondition: {
					verified: true,
					description: "The Issue already has exactly one item in the Project",
				},
			});
		}

		await this.gateway.addItem(request);
		const after = await this.gateway.inspectItem(request);
		return commandReceipt({
			command: "item.add",
			outcome: "applied",
			target: targetOf(request),
			request: { issueUrl: request.issueUrl },
			before: null,
			after,
			postcondition: {
				verified: true,
				description: "A fresh read observed exactly one Project item",
			},
		});
	}
}

function targetOf(
	request: ItemInspectionRequest,
): Readonly<Record<string, string | number>> {
	return {
		projectOwner: request.projectOwner,
		projectNumber: request.projectNumber,
		repository: request.repository,
		issueNumber: request.issueNumber,
	};
}
