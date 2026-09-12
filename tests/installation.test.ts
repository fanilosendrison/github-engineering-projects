import assert from "node:assert/strict";
import {
	chmod,
	mkdir,
	mkdtemp,
	readdir,
	readlink,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { installStandalone } from "../src/installation/install-standalone.ts";

const temporaryDirectories: string[] = [];

async function makeFixture(): Promise<{
	payloadRoot: string;
	dataHome: string;
	binHome: string;
}> {
	const root = await mkdtemp(path.join(tmpdir(), "github-projects-install-"));
	temporaryDirectories.push(root);
	const payloadRoot = path.join(root, "payload");
	const dataHome = path.join(root, "data");
	const binHome = path.join(root, "bin-home");
	await mkdir(path.join(payloadRoot, "bin"), { recursive: true });
	await mkdir(path.join(payloadRoot, "dist"), { recursive: true });
	await writeFile(
		path.join(payloadRoot, "bin", "github-engineering-projects.mjs"),
		"launcher\n",
	);
	await writeFile(path.join(payloadRoot, "dist", "cli.mjs"), "runtime\n");
	return { payloadRoot, dataHome, binHome };
}

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map(async (directory) => {
			await makeTreeWritable(directory);
			await rm(directory, { recursive: true, force: true });
		}),
	);
});

async function makeTreeWritable(directory: string): Promise<void> {
	try {
		await chmod(directory, 0o755);
		const entries = await readdir(directory, { withFileTypes: true });
		for (const entry of entries) {
			const target = path.join(directory, entry.name);
			if (entry.isDirectory()) await makeTreeWritable(target);
			else if (entry.isFile()) await chmod(target, 0o644);
		}
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
			throw error;
		}
	}
}

describe("standalone installation", () => {
	it("installs an immutable release and stable links", async () => {
		const fixture = await makeFixture();
		const first = await installStandalone({ ...fixture, version: "0.1.0" });
		const second = await installStandalone({ ...fixture, version: "0.1.0" });

		assert.strictEqual(second.releaseDirectory, first.releaseDirectory);
		assert.strictEqual(
			await readlink(
				path.join(fixture.dataHome, "github-engineering-projects", "current"),
			),
			path.join("releases", path.basename(first.releaseDirectory)),
		);
		assert.strictEqual(
			await readlink(path.join(fixture.binHome, "github-engineering-projects")),
			path.join(
				"..",
				"data",
				"github-engineering-projects",
				"current",
				"bin",
				"github-engineering-projects.mjs",
			),
		);
	});
});
