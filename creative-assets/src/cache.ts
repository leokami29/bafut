import { SearchCache } from "./providers/types";

/**
 * Cache de búsquedas. Fase 2: solo la abstracción + NoopCache.
 * Fase 3: implementar FileCache/MemoryCache con TTL — el SearchEngine ya
 * acepta cualquier SearchCache, así que no hay que tocar el motor.
 */
export const NoopCache: SearchCache = {
  get: () => undefined,
  set: () => undefined,
};
