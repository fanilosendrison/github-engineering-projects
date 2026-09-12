import { spawn } from "node:child_process";
import type { GhResult, GhRunOptions } from "./types.ts";

const DEFAULT_TIMEOUT_MILLISECONDS = 30_000;
const DEFAULT_MAXIMUM_OUTPUT_BYTES = 4 * 1024 * 1024;

export class GhExecutionError extends Error {
	readonly code: string;
	readonly exitCode: number | null;

	constructor(code: string, message: string, exitCode: number | null = null) {
		super(message);
		this.name = "GhExecutionError";
		this.code = code;
		this.exitCode = exitCode;
	}
}

export function sanitizeDiagnostic(value: string): string {
	return value
		.replace(/Authorization\s*:\s*[^\r\n]+/gi, "Authorization: [REDACTED]")
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
		.replace(/\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{16,}\b/g, "[REDACTED]")
		.replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, "$1[REDACTED]@");
}

export async function runGh(
	args: readonly string[],
	options: GhRunOptions = {},
): Promise<GhResult> {
	const timeoutMilliseconds =
		options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
	const maximumOutputBytes = options.maximumOutputBytes ?? DEFAULT_MAXIMUM_OUTPUT_BYTES;

	return await new Promise<GhResult>((resolve, reject) => {
		const child = spawn("gh", [...args], {
			env: options.env ?? process.env,
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		});
		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let outputBytes = 0;
		let settled = false;

		const finishWithError = (error: GhExecutionError): void => {
			if (settled) return;
			settled = true;
			child.kill("SIGTERM");
			reject(error);
		};

		const capture = (target: Buffer[], chunk: Buffer): void => {
			outputBytes += chunk.length;
			if (outputBytes > maximumOutputBytes) {
				finishWithError(
					new GhExecutionError(
						"GH_OUTPUT_LIMIT",
						`gh output exceeded ${maximumOutputBytes} bytes`,
					),
				);
				return;
			}
			target.push(chunk);
		};

		child.stdout.on("data", (chunk: Buffer) => capture(stdoutChunks, chunk));
		child.stderr.on("data", (chunk: Buffer) => capture(stderrChunks, chunk));
		child.on("error", (cause: Error) => {
			finishWithError(
				new GhExecutionError(
					"GH_START_FAILED",
					sanitizeDiagnostic(`Unable to start gh: ${cause.message}`),
				),
			);
		});

		const timer = setTimeout(() => {
			finishWithError(
				new GhExecutionError(
					"GH_TIMEOUT",
					`gh exceeded the ${timeoutMilliseconds} ms timeout`,
				),
			);
		}, timeoutMilliseconds);
		timer.unref();

		child.on("close", (code) => {
			clearTimeout(timer);
			if (settled) return;
			settled = true;
			const stdout = Buffer.concat(stdoutChunks).toString("utf8");
			const stderr = Buffer.concat(stderrChunks).toString("utf8");
			if (code !== 0) {
				reject(
					new GhExecutionError(
						"GH_COMMAND_FAILED",
						sanitizeDiagnostic(stderr.trim() || `gh exited with status ${code}`),
						code,
					),
				);
				return;
			}
			resolve({ stdout, stderr: sanitizeDiagnostic(stderr) });
		});
	});
}
