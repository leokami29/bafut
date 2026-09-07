import { ImageProcessor, ProcessingError } from "./types";
import { ResizeProcessor } from "./resize-processor";
import { CropProcessor } from "./crop-processor";
import { ConvertProcessor } from "./convert-processor";
import { OptimizeProcessor } from "./optimize-processor";
import { RemoveBackgroundProcessor } from "./remove-background-processor";

/**
 * Registro de processors. Añadir una operación futura (shadow, composite, ...)
 * = crear el processor y registrarlo aquí. Nada más.
 */
export class ProcessorRegistry {
  private processors = new Map<string, ImageProcessor>();

  register(processor: ImageProcessor): void {
    this.processors.set(processor.name, processor);
  }

  get(name: string): ImageProcessor {
    const p = this.processors.get(name);
    if (!p) {
      throw new ProcessingError(
        "unknown_operation",
        `Operación desconocida: "${name}". Disponibles: ${[...this.processors.keys()].sort().join(", ")}.`,
        name,
      );
    }
    return p;
  }

  names(): string[] {
    return [...this.processors.keys()].sort();
  }
}

export function defaultRegistry(opts: { rembgRunner?: import("./remove-background-processor").RembgRunner } = {}): ProcessorRegistry {
  const registry = new ProcessorRegistry();
  registry.register(new ResizeProcessor());
  registry.register(new CropProcessor());
  registry.register(new ConvertProcessor());
  registry.register(new OptimizeProcessor());
  registry.register(new RemoveBackgroundProcessor({ runner: opts.rembgRunner }));
  return registry;
}
