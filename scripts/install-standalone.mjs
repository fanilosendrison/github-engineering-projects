import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { installStandalone } from "../dist/tsc/installation/install-standalone.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
	await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const configuredDataHome = process.env.XDG_DATA_HOME?.trim();
const dataHome =
	configuredDataHome && configuredDataHome.length > 0
		? path.resolve(configuredDataHome)
		: path.join(homedir(), ".local", "share");
const binHome = path.join(homedir(), ".local", "bin");

const result = await installStandalone({
	payloadRoot: path.join(repositoryRoot, "dist", "release"),
	dataHome,
	binHome,
	version: packageJson.version,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
