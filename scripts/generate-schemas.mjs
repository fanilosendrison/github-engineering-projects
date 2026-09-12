import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
	CommandReceiptSchema,
	ErrorReceiptSchema,
	ItemSnapshotSchema,
	ProjectSnapshotSchema,
} from "../dist/tsc/receipts/schemas.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const schemaDirectory = path.join(repositoryRoot, "schemas");
await mkdir(schemaDirectory, { recursive: true });

const schemas = new Map([
	["command-receipt.schema.json", CommandReceiptSchema],
	["error-receipt.schema.json", ErrorReceiptSchema],
	["item-snapshot.schema.json", ItemSnapshotSchema],
	["project-snapshot.schema.json", ProjectSnapshotSchema],
]);

for (const [filename, schema] of schemas) {
	const jsonSchema = z.toJSONSchema(schema, { target: "draft-2020-12" });
	await writeFile(
		path.join(schemaDirectory, filename),
		`${JSON.stringify(jsonSchema, null, "\t")}\n`,
	);
}
