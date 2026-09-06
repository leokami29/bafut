/** Opt-in “cerca de mí” persistido en este dispositivo (no servidor). */
export const NEAR_ME_STORAGE_KEY = "bafut_near_me";

export type NearMePreference = {
  enabled: true;
  lat: number;
  lng: number;
  savedAt: string;
};

const listeners = new Set<() => void>();
let cachedSnapshot: NearMePreference | null | undefined;
let cachedRaw: string | null | undefined;

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function invalidateNearMeCache() {
  cachedSnapshot = undefined;
  cachedRaw = undefined;
}

/** Notifica a suscriptores del mismo tab (además del evento `storage` cross-tab). */
export function emitNearMeChange() {
  invalidateNearMeCache();
  for (const listener of listeners) listener();
}

/** Suscripción para `useSyncExternalStore`. */
export function subscribeNearMe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === NEAR_ME_STORAGE_KEY || event.key === null) {
      invalidateNearMeCache();
      listener();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Snapshot SSR / hidratación: sin ubicación hasta montar en cliente. */
export function getNearMeServerSnapshot(): NearMePreference | null {
  return null;
}

/** Parsea JSON de preferencia; null si inválido o desactivado. */
export function parseNearMePreference(raw: string | null | undefined): NearMePreference | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<NearMePreference>;
    if (data?.enabled !== true) return null;
    if (!isFiniteCoord(data.lat) || !isFiniteCoord(data.lng)) return null;
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) return null;
    const savedAt = typeof data.savedAt === "string" ? data.savedAt : new Date(0).toISOString();
    return { enabled: true, lat: data.lat, lng: data.lng, savedAt };
  } catch {
    return null;
  }
}

/**
 * Lectura para UI / `useSyncExternalStore`.
 * Cachea por raw string para devolver la misma referencia si no cambió.
 */
export function readNearMePreference(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): NearMePreference | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(NEAR_ME_STORAGE_KEY);
    if (raw === cachedRaw && cachedSnapshot !== undefined) {
      return cachedSnapshot;
    }
    const parsed = parseNearMePreference(raw);
    cachedRaw = raw;
    cachedSnapshot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeNearMePreference(
  lat: number,
  lng: number,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
  now = new Date(),
): NearMePreference | null {
  if (!storage || !isFiniteCoord(lat) || !isFiniteCoord(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const value: NearMePreference = {
    enabled: true,
    lat,
    lng,
    savedAt: now.toISOString(),
  };
  try {
    storage.setItem(NEAR_ME_STORAGE_KEY, JSON.stringify(value));
    emitNearMeChange();
    return value;
  } catch {
    return null;
  }
}

export function clearNearMePreference(
  storage: Pick<Storage, "removeItem"> | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(NEAR_ME_STORAGE_KEY);
    emitNearMeChange();
  } catch {
    /* ignore quota / private mode */
  }
}
