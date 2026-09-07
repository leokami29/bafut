/**
 * Errores estructurados del Creative Assets MCP.
 * El agente nunca ve stack traces; los detalles técnicos van a stderr.
 */

export type McpErrorCode =
  | "VALIDATION_ERROR"
  | "PROVIDER_ERROR"
  | "ASSET_NOT_FOUND"
  | "PROCESSING_ERROR"
  | "CAMPAIGN_NOT_FOUND"
  | "BRAND_NOT_FOUND"
  | "INVALID_OPERATION"
  | "INVALID_INPUT"
  | "TOOL_UNAVAILABLE"
  | "RATE_LIMIT"
  | "TIMEOUT";

export class McpToolError extends Error {
  code: McpErrorCode;
  details?: Record<string, unknown>;

  constructor(code: McpErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "McpToolError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details ?? {} };
  }
}
