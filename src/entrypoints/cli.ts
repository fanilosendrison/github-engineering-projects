#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { CliUsageError, parseArguments } from "../cli/arguments.ts";
import { GhExecutionError, runGh, sanitizeDiagnostic } from "../github/gh-process.ts";
import { ProjectV2Client } from "../github/project-v2-client.ts";
import type { GhExecutor } from "../github/types.ts";
import { IssueDependencyOperations } from "../issue-relations/issue-dependency-operations.ts";
import { ProjectItemOperations } from "../project-items/project-item-operations.ts";
import {
	CommandReceiptSchema,
	commandReceipt,
	ErrorReceiptSchema,
} from "../receipts/schemas.ts";

export async function runCli(
	args: readonly string[],
	execute: GhExecutor = async (ghArgs) => await runGh(ghArgs),
): Promise<number> {
	try {
		const command = parseArguments(args);
		const client = new ProjectV2Client(execute);
		const projectItems = new ProjectItemOperations(client);
		const dependencies = new IssueDependencyOperations(execute);

		if (command.name === "doctor") {
			const version = await execute(["--version"]);
			await execute(["auth", "status"]);
			writeReceipt(
				commandReceipt({
					command: "doctor",
					outcome: "inspected",
					target: {},
					request: {},
					before: null,
					after: { ghVersion: version.stdout.trim(), authenticated: true },
					postcondition: {
						verified: true,
						description: "The official gh client is available and authenticated",
					},
				}),
			);
			return 0;
		}

		if (command.name === "project.inspect") {
			const after = await client.inspectProject(
				command.projectOwner,
				command.projectNumber,
			);
			writeReceipt(
				commandReceipt({
					command: command.name,
					outcome: "inspected",
					target: {
						projectOwner: command.projectOwner,
						projectNumber: command.projectNumber,
					},
					request: {},
					before: null,
					after,
					postcondition: {
						verified: true,
						description: "The Project snapshot was read from live GitHub state",
					},
				}),
			);
			return 0;
		}

		if (command.name === "item.inspect") {
			const after = await client.inspectItem(command);
			writeReceipt(
				commandReceipt({
					command: command.name,
					outcome: "inspected",
					target: itemTarget(command),
					request: {},
					before: null,
					after,
					postcondition: {
						verified: true,
						description: "Exactly one matching live Project item was observed",
					},
				}),
			);
			return 0;
		}

		if (command.name === "item.add") {
			writeReceipt(await projectItems.addItem(command));
			return 0;
		}

		if (command.name === "field.set") {
			writeReceipt(await projectItems.setSingleSelect(command));
			return 0;
		}

		writeReceipt(await dependencies.addBlocker(command));
		return 0;
	} catch (error) {
		const failure = classifyError(error);
		process.stderr.write(`${JSON.stringify(failure)}\n`);
		return error instanceof CliUsageError ? 2 : 1;
	}
}

function itemTarget(command: {
	readonly projectOwner: string;
	readonly projectNumber: number;
	readonly repository: string;
	readonly issueNumber: number;
}): Readonly<Record<string, string | number>> {
	return {
		projectOwner: command.projectOwner,
		projectNumber: command.projectNumber,
		repository: command.repository,
		issueNumber: command.issueNumber,
	};
}

function writeReceipt(value: unknown): void {
	const receipt = CommandReceiptSchema.parse(value);
	process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

function classifyError(error: unknown): unknown {
	const code =
		error instanceof CliUsageError || error instanceof GhExecutionError
			? error.code
			: "OPERATION_FAILED";
	const message = sanitizeDiagnostic(
		error instanceof Error ? error.message : String(error),
	);
	return ErrorReceiptSchema.parse({
		schemaVersion: 1,
		error: { code, message },
	});
}

function isDirectEntrypoint(): boolean {
	const entrypoint = process.argv[1];
	return (
		entrypoint !== undefined &&
		pathToFileURL(path.resolve(entrypoint)).href === import.meta.url
	);
}

if (isDirectEntrypoint()) {
	process.exitCode = await runCli(process.argv.slice(2));
}
