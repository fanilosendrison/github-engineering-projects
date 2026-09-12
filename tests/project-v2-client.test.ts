import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProjectV2Client } from "../src/github/project-v2-client.ts";
import type { GhExecutor } from "../src/github/types.ts";

class QueuedExecutor {
	readonly calls: readonly string[][] = [];
	readonly #mutableCalls: string[][] = [];
	readonly #responses: string[];

	constructor(responses: readonly unknown[]) {
		this.calls = this.#mutableCalls;
		this.#responses = responses.map((response) => JSON.stringify(response));
	}

	readonly execute: GhExecutor = async (args) => {
		this.#mutableCalls.push([...args]);
		const response = this.#responses.shift();
		assert.notStrictEqual(response, undefined, "unexpected gh call");
		return { stdout: response ?? "", stderr: "" };
	};

	assertDrained(): void {
		assert.strictEqual(this.#responses.length, 0);
	}
}

const project = {
	id: "PVT_project",
	number: 3,
	title: "Engineering",
	url: "https://github.com/users/example/projects/3",
};

function projectItemPage(
	nodes: readonly unknown[],
	hasNextPage: boolean,
	endCursor: string | null,
): unknown {
	return {
		data: {
			repository: {
				issue: {
					id: "I_target",
					projectItems: { nodes, pageInfo: { hasNextPage, endCursor } },
				},
			},
		},
	};
}

describe("ProjectV2Client", () => {
	it("paginates Issue Project items before selecting the exact Project", async () => {
		const executor = new QueuedExecutor([
			project,
			projectItemPage([], true, "cursor-1"),
			projectItemPage([{ id: "PVTI_item", project: { ...project } }], false, null),
			{
				data: {
					node: {
						fieldValues: {
							nodes: [{ __typename: "ProjectV2ItemFieldRepositoryValue" }],
							pageInfo: { hasNextPage: false, endCursor: null },
						},
					},
				},
			},
		]);
		const client = new ProjectV2Client(executor.execute);
		const snapshot = await client.inspectItem({
			projectOwner: "example",
			projectNumber: 3,
			repository: "example/repository",
			issueNumber: 42,
		});

		assert.strictEqual(snapshot.itemId, "PVTI_item");
		assert.strictEqual(executor.calls.length, 4);
		assert.ok(executor.calls[2]?.some((argument) => argument === "cursor=cursor-1"));
		executor.assertDrained();
	});

	it("rejects ambiguous exact field names", async () => {
		const executor = new QueuedExecutor([
			{
				data: {
					node: {
						fields: {
							nodes: [
								{ id: "field-1", name: "Status", options: [] },
								{ id: "field-2", name: "Status", options: [] },
							],
							pageInfo: { hasNextPage: false, endCursor: null },
						},
					},
				},
			},
		]);
		const client = new ProjectV2Client(executor.execute);
		await assert.rejects(
			client.resolveSingleSelect("PVT_project", "Status", "Ready"),
			/exactly one field named "Status"/,
		);
	});
});
