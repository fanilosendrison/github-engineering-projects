export interface GhResult {
	readonly stdout: string;
	readonly stderr: string;
}

export type GhExecutor = (args: readonly string[]) => Promise<GhResult>;

export interface GhRunOptions {
	readonly env?: NodeJS.ProcessEnv;
	readonly timeoutMilliseconds?: number;
	readonly maximumOutputBytes?: number;
}
