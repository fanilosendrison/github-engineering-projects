import { z } from "zod";

export const ProjectIdentitySchema = z.object({
	id: z.string().min(1),
	number: z.number().int().positive(),
	owner: z.string().min(1),
	title: z.string().min(1),
	url: z.string().url().optional(),
});

export const IssueIdentitySchema = z.object({
	id: z.string().min(1),
	number: z.number().int().positive(),
	repository: z.string().regex(/^[^/]+\/[^/]+$/),
});

export const ItemSnapshotSchema = z.object({
	project: ProjectIdentitySchema,
	issue: IssueIdentitySchema,
	itemId: z.string().min(1),
	fields: z.record(z.string(), z.string().nullable()),
});

export const ProjectSnapshotSchema = z.object({
	project: ProjectIdentitySchema,
	fields: z.array(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1),
			type: z.string().min(1),
			options: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
		}),
	),
	views: z.array(
		z.object({
			name: z.string().min(1),
			layout: z.string().min(1),
			filter: z.string(),
		}),
	),
});

export const CommandReceiptSchema = z.object({
	schemaVersion: z.literal(1),
	command: z.string().min(1),
	outcome: z.enum(["inspected", "applied", "noop"]),
	target: z.record(z.string(), z.union([z.string(), z.number()])),
	request: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
	before: z.unknown().nullable(),
	after: z.unknown().nullable(),
	postcondition: z.object({
		verified: z.boolean(),
		description: z.string().min(1),
	}),
});

export const ErrorReceiptSchema = z.object({
	schemaVersion: z.literal(1),
	error: z.object({
		code: z.string().min(1),
		message: z.string().min(1),
	}),
});

export type ProjectIdentity = z.infer<typeof ProjectIdentitySchema>;
export type IssueIdentity = z.infer<typeof IssueIdentitySchema>;
export type ItemSnapshot = z.infer<typeof ItemSnapshotSchema>;
export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;
export type ReceiptOutcome = "inspected" | "applied" | "noop";

export interface CommandReceipt<TBefore, TAfter> {
	readonly schemaVersion: 1;
	readonly command: string;
	readonly outcome: ReceiptOutcome;
	readonly target: Readonly<Record<string, string | number>>;
	readonly request: Readonly<Record<string, string | number | boolean>>;
	readonly before: TBefore | null;
	readonly after: TAfter | null;
	readonly postcondition: {
		readonly verified: boolean;
		readonly description: string;
	};
}

export function commandReceipt<TBefore, TAfter>(
	value: Omit<CommandReceipt<TBefore, TAfter>, "schemaVersion">,
): CommandReceipt<TBefore, TAfter> {
	return { schemaVersion: 1, ...value };
}
