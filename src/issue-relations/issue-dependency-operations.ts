import { z } from "zod";
import type { GhExecutor } from "../github/types.ts";
import { type CommandReceipt, commandReceipt } from "../receipts/schemas.ts";

const IssueSchema = z.object({
	id: z.number().int().positive(),
	number: z.number().int().positive(),
});
const IssueListSchema = z.array(IssueSchema);

export interface AddBlockerRequest {
	readonly repository: string;
	readonly issueNumber: number;
	readonly blockerNumber: number;
}

interface DependencySnapshot {
	readonly blockedBy: readonly number[];
}

export class IssueDependencyOperations {
	private readonly execute: GhExecutor;

	constructor(execute: GhExecutor) {
		this.execute = execute;
	}

	async addBlocker(
		request: AddBlockerRequest,
	): Promise<CommandReceipt<DependencySnapshot, DependencySnapshot>> {
		validateRepository(request.repository);
		if (request.issueNumber === request.blockerNumber) {
			throw new Error("An Issue cannot block itself");
		}
		const before = await this.inspect(request.repository, request.issueNumber);
		if (before.blockedBy.includes(request.blockerNumber)) {
			return commandReceipt({
				command: "dependency.add-blocker",
				outcome: "noop",
				target: {
					repository: request.repository,
					issueNumber: request.issueNumber,
				},
				request: { blockerNumber: request.blockerNumber },
				before,
				after: before,
				postcondition: {
					verified: true,
					description: "The exact blocker relationship already exists",
				},
			});
		}

		const blocker = await this.getIssue(request.repository, request.blockerNumber);
		await this.execute([
			"api",
			"--method",
			"POST",
			`repos/${request.repository}/issues/${request.issueNumber}/dependencies/blocked_by`,
			"-F",
			`issue_id=${blocker.id}`,
		]);
		const after = await this.inspect(request.repository, request.issueNumber);
		if (!after.blockedBy.includes(request.blockerNumber)) {
			throw new Error("Blocker mutation postcondition failed");
		}
		return commandReceipt({
			command: "dependency.add-blocker",
			outcome: "applied",
			target: {
				repository: request.repository,
				issueNumber: request.issueNumber,
			},
			request: { blockerNumber: request.blockerNumber },
			before,
			after,
			postcondition: {
				verified: true,
				description: "A fresh read observed the exact blocker relationship",
			},
		});
	}

	private async getIssue(repository: string, issueNumber: number) {
		const result = await this.execute([
			"api",
			`repos/${repository}/issues/${issueNumber}`,
		]);
		return IssueSchema.parse(JSON.parse(result.stdout));
	}

	private async inspect(
		repository: string,
		issueNumber: number,
	): Promise<DependencySnapshot> {
		const result = await this.execute([
			"api",
			`repos/${repository}/issues/${issueNumber}/dependencies/blocked_by?per_page=100`,
		]);
		const issues = IssueListSchema.parse(JSON.parse(result.stdout));
		return {
			blockedBy: [...new Set(issues.map((issue) => issue.number))].sort(
				(left, right) => left - right,
			),
		};
	}
}

function validateRepository(repository: string): void {
	if (!/^[^/]+\/[^/]+$/.test(repository)) {
		throw new Error(`repository must use owner/name: ${JSON.stringify(repository)}`);
	}
}
