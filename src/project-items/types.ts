import type { ItemSnapshot } from "../receipts/schemas.ts";

export interface ItemInspectionRequest {
	readonly projectOwner: string;
	readonly projectNumber: number;
	readonly repository: string;
	readonly issueNumber: number;
}

export interface SingleSelectRequest extends ItemInspectionRequest {
	readonly fieldName: string;
	readonly optionName: string;
}

export interface GithubProjectGateway {
	inspectItem(request: ItemInspectionRequest): Promise<ItemSnapshot>;
	resolveSingleSelect(
		projectId: string,
		fieldName: string,
		optionName: string,
	): Promise<{ readonly fieldId: string; readonly optionId: string }>;
	editSingleSelect(request: {
		readonly projectId: string;
		readonly itemId: string;
		readonly fieldId: string;
		readonly optionId: string;
	}): Promise<void>;
	addItem(request: {
		readonly projectOwner: string;
		readonly projectNumber: number;
		readonly issueUrl: string;
	}): Promise<void>;
}
