import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function computeTreeDigest(root: string): Promise<string> {
	const files = await collectFiles(root, "");
	const hash = createHash("sha256");
	for (const relativePath of files) {
		const content = await readFile(path.join(root, relativePath));
		hash.update(relativePath);
		hash.update("\0");
		hash.update(String(content.length));
		hash.update("\0");
		hash.update(content);
		hash.update("\0");
	}
	return hash.digest("hex");
}

async function collectFiles(
	root: string,
	relativeDirectory: string,
): Promise<string[]> {
	const absoluteDirectory = path.join(root, relativeDirectory);
	const entries = await readdir(absoluteDirectory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries.sort((left, right) =>
		left.name.localeCompare(right.name),
	)) {
		const relativePath = path.join(relativeDirectory, entry.name);
		const stats = await lstat(path.join(root, relativePath));
		if (stats.isSymbolicLink()) {
			throw new Error(`Release payload must not contain symlinks: ${relativePath}`);
		}
		if (stats.isDirectory()) {
			files.push(...(await collectFiles(root, relativePath)));
			continue;
		}
		if (!stats.isFile()) {
			throw new Error(`Release payload contains a special file: ${relativePath}`);
		}
		files.push(relativePath);
	}
	return files;
}
