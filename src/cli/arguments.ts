export class CliUsageError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "CliUsageError";
		this.code = code;
	}
}

interface ProjectArguments {
	readonly projectOwner: string;
	readonly projectNumber: number;
}

interface ItemArguments extends ProjectArguments {
	readonly repository: string;
	readonly issueNumber: number;
}

export type CliCommand =
	| { readonly name: "doctor" }
	| ({ readonly name: "project.inspect" } & ProjectArguments)
	| ({ readonly name: "item.inspect" } & ItemArguments)
	| ({ readonly name: "item.add"; readonly issueUrl: string } & ItemArguments)
	| ({
			readonly name: "field.set";
			readonly fieldName: string;
			readonly optionName: string;
	  } & ItemArguments)
	| {
			readonly name: "dependency.add-blocker";
			readonly repository: string;
			readonly issueNumber: number;
			readonly blockerNumber: number;
	  };

export function parseArguments(args: readonly string[]): CliCommand {
	if (args.length === 1 && args[0] === "doctor") return { name: "doctor" };
	const [subject, action, ...flagArguments] = args;
	const commandName = `${subject ?? ""}.${action ?? ""}`;

	if (commandName === "project.inspect") {
		const flags = parseFlags(flagArguments, ["project-owner", "project-number"]);
		return {
			name: commandName,
			projectOwner: flags["project-owner"],
			projectNumber: positiveInteger(flags["project-number"], "project-number"),
		};
	}

	if (commandName === "item.inspect") {
		const flags = parseFlags(flagArguments, itemFlagNames);
		return { name: commandName, ...itemArguments(flags) };
	}

	if (commandName === "item.add") {
		const flags = parseFlags(flagArguments, [...itemFlagNames, "issue-url"]);
		return {
			name: commandName,
			...itemArguments(flags),
			issueUrl: validIssueUrl(flags["issue-url"]),
		};
	}

	if (commandName === "field.set") {
		const flags = parseFlags(flagArguments, [
			...itemFlagNames,
			"field-name",
			"option-name",
		]);
		return {
			name: commandName,
			...itemArguments(flags),
			fieldName: flags["field-name"],
			optionName: flags["option-name"],
		};
	}

	if (commandName === "dependency.add-blocker") {
		const flags = parseFlags(flagArguments, ["repo", "issue", "blocker"]);
		return {
			name: commandName,
			repository: validRepository(flags.repo),
			issueNumber: positiveInteger(flags.issue, "issue"),
			blockerNumber: positiveInteger(flags.blocker, "blocker"),
		};
	}

	throw new CliUsageError(
		"UNKNOWN_COMMAND",
		`Unknown command: ${args.map((argument) => JSON.stringify(argument)).join(" ")}`,
	);
}

const itemFlagNames = ["project-owner", "project-number", "repo", "issue"] as const;

function itemArguments(
	flags: Readonly<Record<(typeof itemFlagNames)[number], string>>,
): ItemArguments {
	return {
		projectOwner: flags["project-owner"],
		projectNumber: positiveInteger(flags["project-number"], "project-number"),
		repository: validRepository(flags.repo),
		issueNumber: positiveInteger(flags.issue, "issue"),
	};
}

function parseFlags<const Name extends string>(
	args: readonly string[],
	expectedNames: readonly Name[],
): Record<Name, string> {
	const expected = new Set<string>(expectedNames);
	const values = new Map<Name, string>();
	for (let index = 0; index < args.length; index += 2) {
		const flag = args[index];
		const value = args[index + 1];
		if (flag === undefined || !flag.startsWith("--")) {
			throw new CliUsageError(
				"INVALID_ARGUMENT",
				`Expected a --flag at argument ${index + 1}`,
			);
		}
		const name = flag.slice(2) as Name;
		if (!expected.has(name)) {
			throw new CliUsageError("UNKNOWN_FLAG", `Unknown flag: ${flag}`);
		}
		if (value === undefined || value.startsWith("--")) {
			throw new CliUsageError("MISSING_FLAG_VALUE", `Missing value for ${flag}`);
		}
		if (values.has(name)) {
			throw new CliUsageError("DUPLICATE_FLAG", `Duplicate flag: ${flag}`);
		}
		values.set(name, value);
	}
	for (const name of expectedNames) {
		if (!values.has(name)) {
			throw new CliUsageError("MISSING_FLAG", `Missing required flag: --${name}`);
		}
	}
	return Object.fromEntries(values) as Record<Name, string>;
}

function positiveInteger(value: string, name: string): number {
	if (!/^[1-9]\d*$/.test(value)) {
		throw new CliUsageError("INVALID_INTEGER", `--${name} must be a positive integer`);
	}
	return Number(value);
}

function validRepository(value: string): string {
	if (!/^[^/\s]+\/[^/\s]+$/.test(value)) {
		throw new CliUsageError("INVALID_REPOSITORY", "--repo must use owner/name");
	}
	return value;
}

function validIssueUrl(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new CliUsageError("INVALID_ISSUE_URL", "--issue-url must be an absolute URL");
	}
	if (url.protocol !== "https:") {
		throw new CliUsageError("INVALID_ISSUE_URL", "--issue-url must use HTTPS");
	}
	return url.href;
}
