import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
let temporaryDirectory: string;

before(async () => {
	temporaryDirectory = await mkdtemp(path.join(tmpdir(), "github-projects-cli-"));
	const ghPath = path.join(temporaryDirectory, "gh");
	await writeFile(
		ghPath,
		'#!/usr/bin/env node\nif (process.argv[2] === "--version") process.stdout.write("gh version 2.32.1\\n"); else if (process.argv[2] !== "auth" || process.argv[3] !== "status") process.exitCode = 3;\n',
	);
	await chmod(ghPath, 0o755);
});

after(async () => {
	await rm(temporaryDirectory, { recursive: true, force: true });
});

function runCli(args: readonly string[]) {
	return spawnSync(
		process.execPath,
		[path.join(repositoryRoot, "src/entrypoints/cli.ts"), ...args],
		{
			cwd: repositoryRoot,
			encoding: "utf8",
			env: { ...process.env, PATH: `${temporaryDirectory}:${process.env.PATH ?? ""}` },
			shell: false,
		},
	);
}

describe("CLI", () => {
	it("emits a versioned doctor receipt", () => {
		const result = runCli(["doctor"]);
		assert.strictEqual(result.status, 0, result.stderr);
		const receipt = JSON.parse(result.stdout);
		assert.strictEqual(receipt.schemaVersion, 1);
		assert.strictEqual(receipt.command, "doctor");
		assert.strictEqual(receipt.outcome, "inspected");
		assert.match(receipt.after.ghVersion, /^gh version 2\.32\.1/);
	});

	it("rejects semantic workflow commands", () => {
		const result = runCli(["start"]);
		assert.strictEqual(result.status, 2);
		assert.match(result.stderr, /UNKNOWN_COMMAND/);
		assert.strictEqual(result.stdout, "");
	});

	it("rejects duplicate flags before GitHub access", () => {
		const result = runCli([
			"project",
			"inspect",
			"--project-owner",
			"example",
			"--project-owner",
			"other",
			"--project-number",
			"3",
		]);
		assert.strictEqual(result.status, 2);
		assert.match(result.stderr, /DUPLICATE_FLAG/);
	});
});
