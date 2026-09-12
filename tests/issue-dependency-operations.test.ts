import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GhExecutor } from "../src/github/types.ts";
import { IssueDependencyOperations } from "../src/issue-relations/issue-dependency-operations.ts";

class QueuedExecutor {
	readonly calls: string[][] = [];
	readonly #responses: string[];

	constructor(responses: readonly unknown[]) {
		this.#responses = responses.map((response) =>
			typeof response === "string" ? response : JSON.stringify(response),
		);
	}

	readonly execute: GhExecutor = async (args) => {
		this.calls.push([...args]);
		const stdout = this.#responses.shift();
		assert.notStrictEqual(stdout, undefined, "unexpected gh call");
		return { stdout: stdout ?? "", stderr: "" };
	};
}

const request = {
	repository: "example/repository",
	issueNumber: 42,
	blockerNumber: 41,
};

describe("IssueDependencyOperations", () => {
	it("returns noop when the exact blocker already exists", async () => {
		const executor = new QueuedExecutor([[{ id: 1001, number: 41 }]]);
		const receipt = await new IssueDependencyOperations(executor.execute).addBlocker(
			request,
		);
		assert.strictEqual(receipt.outcome, "noop");
		assert.strictEqual(executor.calls.length, 1);
	});

	it("adds and freshly verifies the exact blocker", async () => {
		const executor = new QueuedExecutor([
			[],
			{ id: 1001, number: 41 },
			"",
			[{ id: 1001, number: 41 }],
		]);
		const receipt = await new IssueDependencyOperations(executor.execute).addBlocker(
			request,
		);
		assert.strictEqual(receipt.outcome, "applied");
		assert.deepStrictEqual(receipt.after?.blockedBy, [41]);
		assert.ok(executor.calls[2]?.includes("issue_id=1001"));
	});

	it("rejects self-dependency before GitHub access", async () => {
		const executor = new QueuedExecutor([]);
		await assert.rejects(
			new IssueDependencyOperations(executor.execute).addBlocker({
				...request,
				blockerNumber: 42,
			}),
			/cannot block itself/,
		);
		assert.strictEqual(executor.calls.length, 0);
	});
});
