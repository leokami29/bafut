/**
 * Contratos del motor de procesamiento visual (Fase 4).
 * Pipeline: input (temp) → processor → validate → storage → metadata.
 * RAW nunca se modifica: cada operación produce un asset DERIVADO.
 */

import { AssetMetadata } from "../types";

/** Registro de una operación dentro de la metadata (evolución compatible de Fase 3). */
export interface ProcessingOperationRecord {
  operation: string;
  tool: string;
  toolVersion?: string;
  options?: Record<string, unknown>;
  timestamp: string;
  inputAssetId: string;
  outputAssetId: string;
}

/** Un paso del pipeline declarado por el agente/CLI. */
export interface ProcessingStep {
  type: string;
  options?: Record<string, unknown>;
}

export interface ProcessorContext {
  /** Archivo de ENTRADA (copia en temp/; el raw nunca se toca). */
  inputPath: string;
  /** Archivo de SALIDA que el processor debe escribir (en temp/). */
  outputPath: string;
  /** Info del input, ya validada. */
  input: {
    mimeType: string;
    width?: number;
    height?: number;
    hasTransparency?: boolean;
  };
  options: Record<string, unknown>;
}

export interface ProcessorOutput {
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  hasTransparency?: boolean;
}

/** Contrato que toda operación debe implementar. */
export interface ImageProcessor {
  readonly name: string;
  /** Herramienta subyacente, para metadata. */
  readonly tool: string;
  readonly toolVersion?: string;
  process(ctx: ProcessorContext): Promise<ProcessorOutput>;
}

export interface ProcessAssetResult {
  asset: AssetMetadata;
  processed: boolean;
  cached: boolean;
  path: string;
  /** Trazabilidad de la cadena completa de derivaciones ejecutadas/reutilizadas. */
  chain: Array<{ assetId: string; operation: string; cached: boolean }>;
}

export type ProcessingErrorCode =
  | "unknown_operation"
  | "asset_not_found"
  | "invalid_options"
  | "empty_pipeline"
  | "processor_failed"
  | "tool_unavailable"
  | "output_invalid";

export class ProcessingError extends Error {
  code: ProcessingErrorCode;
  operation?: string;

  constructor(code: ProcessingErrorCode, message: string, operation?: string) {
    super(`[processing] ${code}${operation ? ` (${operation})` : ""}: ${message}`);
    this.name = "ProcessingError";
    this.code = code;
    this.operation = operation;
  }
}
