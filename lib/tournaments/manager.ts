import { BracketsManager } from "brackets-manager";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  MemoryTournamentBracketsStorage,
  TournamentBracketsStorage,
} from "@/lib/tournaments/brackets-storage";

/**
 * Manager BM scoped a un torneo BaFut (UUID). Solo servidor.
 */
export function createTournamentBracketsManager(
  supabase: SupabaseClient<Database>,
  tournamentId: string,
) {
  const storage = new TournamentBracketsStorage(supabase, tournamentId);
  return new BracketsManager(storage);
}

/** Manager BM en memoria (tests / dry-run). */
export function createMemoryTournamentBracketsManager(tournamentId: string) {
  const storage = new MemoryTournamentBracketsStorage(tournamentId);
  return { manager: new BracketsManager(storage), storage };
}
