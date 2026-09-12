import { spawnSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const testFiles = [
	"tests/gh-process.test.ts",
	"tests/issue-dependency-operations.test.ts",
	"tests/project-v2-client.test.ts",
	"tests/project-operations.test.ts",
	"tests/cli.test.ts",
	"tests/installation.test.ts",
].map((file) => path.join(repositoryRoot, file));

const result = spawnSync(
	process.execPath,
	[
		"--test",
		"--test-concurrency=1",
		"--test-timeout=30000",
		"--test-reporter=tap",
		...testFiles,
	],
	{ cwd: repositoryRoot, env: process.env, shell: false, stdio: "inherit" },
);

if (result.error) {
	throw result.error;
}
process.exitCode = result.status ?? 1;
