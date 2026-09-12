#!/usr/bin/env node

const minimum = Object.freeze({ major: 22, minor: 19, patch: 0 });
const [major, minor, patch] = process.versions.node.split(".").map(Number);
const supported =
	major > minimum.major ||
	(major === minimum.major &&
		(minor > minimum.minor || (minor === minimum.minor && patch >= minimum.patch)));

if (!supported) {
	process.stderr.write(
		`github-engineering-projects requires Node.js >= 22.19.0; found ${process.versions.node}.\n`,
	);
	process.exitCode = 2;
} else {
	const { runCli } = await import("../dist/tsc/entrypoints/cli.js");
	process.exitCode = await runCli(process.argv.slice(2));
}
