import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrudInterface,
  DataTypes,
  OmitId,
  Table,
} from "brackets-manager";
import type { Database, Json } from "@/lib/database.types";

/** Id de brackets-model (`string | number`); no re-exportado por brackets-manager. */
type Id = string | number;

type DbClient = SupabaseClient<Database>;

/** Mapa tabla lógica BM → tabla Postgres `bm_*`. */
export const BM_TABLE_MAP = {
  participant: "bm_participant",
  stage: "bm_stage",
  group: "bm_group",
  round: "bm_round",
  match: "bm_match",
  match_game: "bm_match_game",
} as const satisfies Record<Table, keyof Database["public"]["Tables"]>;

export type BmDbTable = (typeof BM_TABLE_MAP)[Table];

/** Tablas BM cuyo modelo incluye `tournament_id`. */
const HAS_MODEL_TOURNAMENT_ID: ReadonlySet<Table> = new Set([
  "participant",
  "stage",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Merge superficial con merge profundo de nivel 2 en objetos anidados
 * (p. ej. opponent1/opponent2), igual que brackets-memory-db.
 */
export function mergeBmRow<T extends Record<string, unknown>>(
  existing: T,
  patch: Partial<T>,
): T {
  const next: Record<string, unknown> = { ...existing };
  for (const key of Object.keys(patch) as (keyof T & string)[]) {
    const incoming = patch[key];
    const current = existing[key];
    if (isPlainObject(current) && isPlainObject(incoming)) {
      next[key] = { ...current, ...incoming };
    } else {
      next[key] = incoming;
    }
  }
  return next as T;
}

function matchesFilter<T extends Record<string, unknown>>(
  row: T,
  filter: Partial<T>,
): boolean {
  for (const key of Object.keys(filter) as (keyof T & string)[]) {
    if (row[key] !== filter[key]) return false;
  }
  return true;
}

function stripTournamentIdIfNeeded<T extends Table>(
  table: T,
  row: Record<string, unknown>,
): DataTypes[T] {
  if (HAS_MODEL_TOURNAMENT_ID.has(table)) {
    return row as unknown as DataTypes[T];
  }
  const { tournament_id: _tid, ...rest } = row;
  return rest as unknown as DataTypes[T];
}

function toJson(value: unknown): Json | null {
  if (value == null) return null;
  return value as Json;
}

/**
 * CrudInterface de brackets-manager sobre tablas `bm_*`, aislado por
 * `tournament_id` (UUID BaFut). Solo usar en servidor (service role o RPC).
 */
export class TournamentBracketsStorage implements CrudInterface {
  constructor(
    private readonly supabase: DbClient,
    /** UUID del torneo BaFut (= `tournament_id` en BM participant/stage). */
    readonly tournamentId: string,
  ) {}

  private dbTable(table: Table): BmDbTable {
    return BM_TABLE_MAP[table];
  }

  private async selectRaw(
    table: Table,
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from(this.dbTable(table))
      .select("*")
      .eq("tournament_id", this.tournamentId);
    if (error) throw new Error(`bm select ${table}: ${error.message}`);
    return (data ?? []) as Array<Record<string, unknown>>;
  }

  insert<T extends Table>(table: T, value: OmitId<DataTypes[T]>): Promise<Id>;
  insert<T extends Table>(
    table: T,
    values: Array<OmitId<DataTypes[T]>>,
  ): Promise<boolean>;
  async insert<T extends Table>(
    table: T,
    value: OmitId<DataTypes[T]> | Array<OmitId<DataTypes[T]>>,
  ): Promise<Id | boolean> {
    if (Array.isArray(value)) {
      if (value.length === 0) return true;
      const rows = value.map((v) => this.prepareInsert(table, v));
      const { error } = await this.supabase.from(this.dbTable(table)).insert(rows as never);
      if (error) throw new Error(`bm insert ${table}: ${error.message}`);
      return true;
    }

    const row = this.prepareInsert(table, value);
    const { data, error } = await this.supabase
      .from(this.dbTable(table))
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(`bm insert ${table}: ${error.message}`);
    return (data as { id: number }).id;
  }

  select<T extends Table>(table: T): Promise<Array<DataTypes[T]> | null>;
  select<T extends Table>(table: T, id: Id): Promise<DataTypes[T] | null>;
  select<T extends Table>(
    table: T,
    filter: Partial<DataTypes[T]>,
  ): Promise<Array<DataTypes[T]> | null>;
  async select<T extends Table>(
    table: T,
    arg?: Id | Partial<DataTypes[T]>,
  ): Promise<Array<DataTypes[T]> | DataTypes[T] | null> {
    try {
      if (arg === undefined) {
        const rows = await this.selectRaw(table);
        return rows.map((r) => stripTournamentIdIfNeeded(table, r));
      }

      if (typeof arg === "string" || typeof arg === "number") {
        const rowId = typeof arg === "number" ? arg : Number(arg);
        const { data, error } = await this.supabase
          .from(this.dbTable(table))
          .select("*")
          .eq("tournament_id", this.tournamentId)
          .eq("id", rowId)
          .maybeSingle();
        if (error) throw new Error(`bm select ${table}: ${error.message}`);
        if (!data) return null;
        return stripTournamentIdIfNeeded(table, data as Record<string, unknown>);
      }

      const rows = await this.selectRaw(table);
      const filtered = rows.filter((r) =>
        matchesFilter(r, arg as Partial<Record<string, unknown>>),
      );
      return filtered.map((r) => stripTournamentIdIfNeeded(table, r));
    } catch {
      return null;
    }
  }

  update<T extends Table>(table: T, id: Id, value: DataTypes[T]): Promise<boolean>;
  update<T extends Table>(
    table: T,
    filter: Partial<DataTypes[T]>,
    value: Partial<DataTypes[T]>,
  ): Promise<boolean>;
  async update<T extends Table>(
    table: T,
    arg: Id | Partial<DataTypes[T]>,
    value: DataTypes[T] | Partial<DataTypes[T]>,
  ): Promise<boolean> {
    try {
      if (typeof arg === "string" || typeof arg === "number") {
        const rowId = typeof arg === "number" ? arg : Number(arg);
        const payload = this.prepareUpdate(table, value as Record<string, unknown>);
        const { error } = await this.supabase
          .from(this.dbTable(table))
          .update(payload as never)
          .eq("tournament_id", this.tournamentId)
          .eq("id", rowId);
        if (error) throw new Error(`bm update ${table}: ${error.message}`);
        return true;
      }

      const rows = await this.selectRaw(table);
      const targets = rows.filter((r) =>
        matchesFilter(r, arg as Partial<Record<string, unknown>>),
      );
      if (targets.length === 0) return false;

      for (const existing of targets) {
        const merged = mergeBmRow(
          existing,
          value as Partial<Record<string, unknown>>,
        );
        const payload = this.prepareUpdate(table, merged);
        const { error } = await this.supabase
          .from(this.dbTable(table))
          .update(payload as never)
          .eq("tournament_id", this.tournamentId)
          .eq("id", existing.id as number);
        if (error) throw new Error(`bm update ${table}: ${error.message}`);
      }
      return true;
    } catch {
      return false;
    }
  }

  delete<T extends Table>(table: T): Promise<boolean>;
  delete<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<boolean>;
  async delete<T extends Table>(
    table: T,
    filter?: Partial<DataTypes[T]>,
  ): Promise<boolean> {
    try {
      if (!filter) {
        const { error } = await this.supabase
          .from(this.dbTable(table))
          .delete()
          .eq("tournament_id", this.tournamentId);
        if (error) throw new Error(`bm delete ${table}: ${error.message}`);
        return true;
      }

      const rows = await this.selectRaw(table);
      const targets = rows.filter((r) =>
        matchesFilter(r, filter as Partial<Record<string, unknown>>),
      );
      if (targets.length === 0) return true;

      const ids = targets.map((r) => r.id as number);
      const { error } = await this.supabase
        .from(this.dbTable(table))
        .delete()
        .eq("tournament_id", this.tournamentId)
        .in("id", ids);
      if (error) throw new Error(`bm delete ${table}: ${error.message}`);
      return true;
    } catch {
      return false;
    }
  }

  private prepareInsert(
    table: Table,
    value: OmitId<DataTypes[Table]>,
  ): Record<string, unknown> {
    const raw = { ...(value as Record<string, unknown>) };
    raw.tournament_id = this.tournamentId;

    if (table === "match" || table === "match_game") {
      if ("opponent1" in raw) raw.opponent1 = toJson(raw.opponent1);
      if ("opponent2" in raw) raw.opponent2 = toJson(raw.opponent2);
    }
    if (table === "stage" && raw.settings != null) {
      raw.settings = toJson(raw.settings) ?? {};
    }
    return raw;
  }

  private prepareUpdate(
    table: Table,
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    const raw = { ...value };
    delete raw.id;
    // Nunca mover filas entre torneos.
    raw.tournament_id = this.tournamentId;

    if (table === "match" || table === "match_game") {
      if ("opponent1" in raw) raw.opponent1 = toJson(raw.opponent1);
      if ("opponent2" in raw) raw.opponent2 = toJson(raw.opponent2);
    }
    if (table === "stage" && "settings" in raw) {
      raw.settings = toJson(raw.settings) ?? {};
    }
    return raw;
  }
}

/**
 * Storage en memoria con el mismo aislamiento por `tournamentId`.
 * Útil para tests unitarios sin Postgres.
 */
export class MemoryTournamentBracketsStorage implements CrudInterface {
  private data: Record<Table, Array<Record<string, unknown>>> = {
    participant: [],
    stage: [],
    group: [],
    round: [],
    match: [],
    match_game: [],
  };

  private nextId: Record<Table, number> = {
    participant: 1,
    stage: 1,
    group: 1,
    round: 1,
    match: 1,
    match_game: 1,
  };

  constructor(readonly tournamentId: string) {}

  reset() {
    for (const t of Object.keys(this.data) as Table[]) {
      this.data[t] = [];
      this.nextId[t] = 1;
    }
  }

  insert<T extends Table>(table: T, value: OmitId<DataTypes[T]>): Promise<Id>;
  insert<T extends Table>(
    table: T,
    values: Array<OmitId<DataTypes[T]>>,
  ): Promise<boolean>;
  async insert<T extends Table>(
    table: T,
    value: OmitId<DataTypes[T]> | Array<OmitId<DataTypes[T]>>,
  ): Promise<Id | boolean> {
    if (Array.isArray(value)) {
      for (const v of value) this.insertOne(table, v);
      return true;
    }
    return this.insertOne(table, value);
  }

  private insertOne<T extends Table>(
    table: T,
    value: OmitId<DataTypes[T]>,
  ): number {
    const id = this.nextId[table]++;
    const row: Record<string, unknown> = {
      ...(value as Record<string, unknown>),
      id,
      tournament_id: this.tournamentId,
    };
    this.data[table].push(row);
    return id;
  }

  select<T extends Table>(table: T): Promise<Array<DataTypes[T]> | null>;
  select<T extends Table>(table: T, id: Id): Promise<DataTypes[T] | null>;
  select<T extends Table>(
    table: T,
    filter: Partial<DataTypes[T]>,
  ): Promise<Array<DataTypes[T]> | null>;
  async select<T extends Table>(
    table: T,
    arg?: Id | Partial<DataTypes[T]>,
  ): Promise<Array<DataTypes[T]> | DataTypes[T] | null> {
    const scoped = this.data[table].filter(
      (r) => r.tournament_id === this.tournamentId,
    );

    if (arg === undefined) {
      return scoped.map((r) => stripTournamentIdIfNeeded(table, { ...r }));
    }
    if (typeof arg === "string" || typeof arg === "number") {
      const found = scoped.find((r) => r.id === arg);
      return found ? stripTournamentIdIfNeeded(table, { ...found }) : null;
    }
    return scoped
      .filter((r) => matchesFilter(r, arg as Partial<Record<string, unknown>>))
      .map((r) => stripTournamentIdIfNeeded(table, { ...r }));
  }

  update<T extends Table>(table: T, id: Id, value: DataTypes[T]): Promise<boolean>;
  update<T extends Table>(
    table: T,
    filter: Partial<DataTypes[T]>,
    value: Partial<DataTypes[T]>,
  ): Promise<boolean>;
  async update<T extends Table>(
    table: T,
    arg: Id | Partial<DataTypes[T]>,
    value: DataTypes[T] | Partial<DataTypes[T]>,
  ): Promise<boolean> {
    if (typeof arg === "string" || typeof arg === "number") {
      const idx = this.data[table].findIndex(
        (r) => r.id === arg && r.tournament_id === this.tournamentId,
      );
      if (idx < 0) return false;
      const merged = mergeBmRow(
        this.data[table][idx],
        value as Partial<Record<string, unknown>>,
      );
      merged.tournament_id = this.tournamentId;
      merged.id = arg;
      this.data[table][idx] = merged;
      return true;
    }

    let touched = false;
    for (let i = 0; i < this.data[table].length; i++) {
      const row = this.data[table][i];
      if (row.tournament_id !== this.tournamentId) continue;
      if (!matchesFilter(row, arg as Partial<Record<string, unknown>>)) continue;
      const merged = mergeBmRow(row, value as Partial<Record<string, unknown>>);
      merged.tournament_id = this.tournamentId;
      merged.id = row.id;
      this.data[table][i] = merged;
      touched = true;
    }
    return touched;
  }

  delete<T extends Table>(table: T): Promise<boolean>;
  delete<T extends Table>(table: T, filter: Partial<DataTypes[T]>): Promise<boolean>;
  async delete<T extends Table>(
    table: T,
    filter?: Partial<DataTypes[T]>,
  ): Promise<boolean> {
    if (!filter) {
      this.data[table] = this.data[table].filter(
        (r) => r.tournament_id !== this.tournamentId,
      );
      return true;
    }
    this.data[table] = this.data[table].filter((r) => {
      if (r.tournament_id !== this.tournamentId) return true;
      return !matchesFilter(r, filter as Partial<Record<string, unknown>>);
    });
    return true;
  }
}
