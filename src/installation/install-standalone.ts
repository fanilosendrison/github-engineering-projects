import { randomBytes } from "node:crypto";
import {
	chmod,
	cp,
	lstat,
	mkdir,
	readdir,
	readlink,
	rename,
	rm,
	symlink,
} from "node:fs/promises";
import path from "node:path";
import { computeTreeDigest } from "./tree-digest.ts";

const APPLICATION_NAME = "proto-lithify";
const EXECUTABLE_NAME = "proto-lithify";

export interface InstallStandaloneRequest {
	readonly payloadRoot: string;
	readonly dataHome: string;
	readonly binHome: string;
	readonly version: string;
}

export interface InstallStandaloneResult {
	readonly releaseDirectory: string;
	readonly currentLink: string;
	readonly executableLink: string;
	readonly reused: boolean;
}

export async function installStandalone(
	request: InstallStandaloneRequest,
): Promise<InstallStandaloneResult> {
	validateRequest(request);
	const digest = await computeTreeDigest(request.payloadRoot);
	const applicationRoot = path.join(request.dataHome, APPLICATION_NAME);
	const releasesRoot = path.join(applicationRoot, "releases");
	const releaseName = `${request.version}-${digest}`;
	const releaseDirectory = path.join(releasesRoot, releaseName);
	await mkdir(releasesRoot, { recursive: true, mode: 0o755 });
	await mkdir(request.binHome, { recursive: true, mode: 0o755 });

	let reused = false;
	try {
		const stats = await lstat(releaseDirectory);
		if (!stats.isDirectory() || stats.isSymbolicLink()) {
			throw new Error(
				`Existing release path is not a physical directory: ${releaseDirectory}`,
			);
		}
		const existingDigest = await computeTreeDigest(releaseDirectory);
		if (existingDigest !== digest) {
			throw new Error(
				`Existing release content does not match its digest: ${releaseDirectory}`,
			);
		}
		reused = true;
	} catch (error) {
		if (!isMissing(error)) throw error;
		await createRelease(request.payloadRoot, releasesRoot, releaseDirectory);
	}
	await makeTreeReadOnly(releaseDirectory);

	const currentLink = path.join(applicationRoot, "current");
	await activateCurrent(applicationRoot, currentLink, releaseName);
	const executableLink = path.join(request.binHome, EXECUTABLE_NAME);
	const managedTarget = path.relative(
		request.binHome,
		path.join(currentLink, "bin", `${EXECUTABLE_NAME}.mjs`),
	);
	await ensureStableExecutable(executableLink, managedTarget);
	return { releaseDirectory, currentLink, executableLink, reused };
}

async function createRelease(
	payloadRoot: string,
	releasesRoot: string,
	releaseDirectory: string,
): Promise<void> {
	const staging = path.join(
		releasesRoot,
		`.staging-${randomBytes(16).toString("hex")}`,
	);
	try {
		await cp(payloadRoot, staging, {
			recursive: true,
			errorOnExist: true,
			force: false,
			verbatimSymlinks: true,
		});
		try {
			await rename(staging, releaseDirectory);
		} catch (error) {
			if (!isAlreadyExists(error)) throw error;
			const expectedDigest = await computeTreeDigest(payloadRoot);
			const observedDigest = await computeTreeDigest(releaseDirectory);
			if (expectedDigest !== observedDigest) throw error;
		}
	} finally {
		await rm(staging, { recursive: true, force: true });
	}
}

async function makeTreeReadOnly(directory: string): Promise<void> {
	const entries = await readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			await makeTreeReadOnly(target);
			await chmod(target, 0o555);
		} else if (entry.isFile()) {
			await chmod(
				target,
				target.endsWith(".mjs") && target.includes(`${path.sep}bin${path.sep}`)
					? 0o555
					: 0o444,
			);
		}
	}
	await chmod(directory, 0o555);
}

async function activateCurrent(
	applicationRoot: string,
	currentLink: string,
	releaseName: string,
): Promise<void> {
	const temporaryLink = path.join(
		applicationRoot,
		`.current-${randomBytes(16).toString("hex")}`,
	);
	await symlink(path.join("releases", releaseName), temporaryLink);
	try {
		await rename(temporaryLink, currentLink);
	} finally {
		await rm(temporaryLink, { force: true });
	}
}

async function ensureStableExecutable(
	executableLink: string,
	managedTarget: string,
): Promise<void> {
	try {
		const stats = await lstat(executableLink);
		if (!stats.isSymbolicLink()) {
			throw new Error(
				`Executable path already exists and is not a symlink: ${executableLink}`,
			);
		}
		const currentTarget = await readlink(executableLink);
		if (currentTarget !== managedTarget) {
			throw new Error(`Executable symlink has an unmanaged target: ${executableLink}`);
		}
	} catch (error) {
		if (!isMissing(error)) throw error;
		await symlink(managedTarget, executableLink);
	}
}

function validateRequest(request: InstallStandaloneRequest): void {
	for (const [name, value] of Object.entries({
		payloadRoot: request.payloadRoot,
		dataHome: request.dataHome,
		binHome: request.binHome,
	})) {
		if (!path.isAbsolute(value) || value.length === 0) {
			throw new Error(`${name} must be a non-empty absolute path`);
		}
	}
	if (!/^\d+\.\d+\.\d+$/.test(request.version)) {
		throw new Error("version must be a three-segment semantic version");
	}
}

function isMissing(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "EEXIST";
}
