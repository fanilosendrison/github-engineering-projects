import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { GhExecutionError, runGh } from "../src/github/gh-process.ts";

const temporaryDirectories: string[] = [];

async function installFakeGh(source: string): Promise<string> {
	const directory = await mkdtemp(path.join(tmpdir(), "github-projects-gh-"));
	temporaryDirectories.push(directory);
	const executable = path.join(directory, "gh");
	await writeFile(executable, `#!/usr/bin/env node\n${source}\n`);
	await chmod(executable, 0o755);
	return directory;
}

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("runGh", () => {
	it("passes literal arguments without a shell", async () => {
		const directory = await installFakeGh(
			"process.stdout.write(JSON.stringify(process.argv.slice(2)));",
		);
		const argument = "field; echo injected";
		const result = await runGh(["api", argument], {
			env: { ...process.env, PATH: `${directory}:${process.env.PATH ?? ""}` },
		});
		assert.deepStrictEqual(JSON.parse(result.stdout), ["api", argument]);
	});

	it("redacts token-bearing diagnostics", async () => {
		const directory = await installFakeGh(
			'process.stderr.write("Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456"); process.exitCode = 1;',
		);
		await assert.rejects(
			runGh(["auth", "status"], {
				env: { ...process.env, PATH: `${directory}:${process.env.PATH ?? ""}` },
			}),
			(error: unknown) => {
				assert.ok(error instanceof GhExecutionError);
				assert.doesNotMatch(error.message, /ghp_/);
				assert.match(error.message, /\[REDACTED\]/);
				return true;
			},
		);
	});
});
