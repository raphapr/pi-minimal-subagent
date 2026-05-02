export function processPiEvent(event: unknown, result: unknown): boolean;
export function processPiJsonLine(line: string, result: unknown): boolean;
export function getFinalAssistantText(messages: unknown[]): string;
export function getForkProgressText(result: unknown): string;
export const getSubagentProgressText: typeof getForkProgressText;
export function getResultSummaryText(result: unknown): string;
