import { chmod, cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const releaseRoot = path.join(repositoryRoot, "dist", "release");
const packageJson = JSON.parse(
	await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
await cp(path.join(repositoryRoot, "bin"), path.join(releaseRoot, "bin"), {
	recursive: true,
});
await cp(
	path.join(repositoryRoot, "dist", "tsc"),
	path.join(releaseRoot, "dist", "tsc"),
	{ recursive: true },
);
await cp(path.join(repositoryRoot, "schemas"), path.join(releaseRoot, "schemas"), {
	recursive: true,
});
const zodRoot = await realpath(path.join(repositoryRoot, "node_modules", "zod"));
await cp(zodRoot, path.join(releaseRoot, "node_modules", "zod"), {
	recursive: true,
});
await writeFile(
	path.join(releaseRoot, "package.json"),
	`${JSON.stringify(
		{
			name: packageJson.name,
			version: packageJson.version,
			type: "module",
			private: true,
		},
		null,
		2,
	)}\n`,
);
await chmod(path.join(releaseRoot, "bin", "proto-lithify.mjs"), 0o755);
