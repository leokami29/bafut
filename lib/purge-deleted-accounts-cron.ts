import { PROFILE_AVATARS_BUCKET } from "@/lib/profile-photos";
import { createServiceClient } from "@/lib/supabase/admin";

export type PurgeCronResult = {
  purged: number;
  authDeleted: number;
  authErrors: string[];
};

async function removeProfileAvatarStorage(userId: string, avatarPath: string | null) {
  const service = createServiceClient();
  const paths = new Set<string>();
  if (avatarPath) paths.add(avatarPath);

  const { data: listed } = await service.storage.from(PROFILE_AVATARS_BUCKET).list(userId, {
    limit: 100,
  });
  for (const item of listed ?? []) {
    if (item.name) paths.add(`${userId}/${item.name}`);
  }

  if (paths.size > 0) {
    await service.storage.from(PROFILE_AVATARS_BUCKET).remove([...paths]);
  }
}

/**
 * Cron diario: RPC tombstone → storage avatar → auth.admin.deleteUser por usuario.
 */
export async function runPurgeDeletedAccountsCron(): Promise<PurgeCronResult> {
  const service = createServiceClient();
  const { data: rows, error } = await service.rpc("purge_due_deleted_accounts");

  if (error) {
    throw new Error(error.message);
  }

  const purgedRows = rows ?? [];
  let authDeleted = 0;
  const authErrors: string[] = [];

  for (const row of purgedRows) {
    const userId = row.user_id;
    try {
      await removeProfileAvatarStorage(userId, row.avatar_path);
    } catch (storageErr) {
      console.error("purge avatar storage", userId, storageErr);
    }

    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("auth.admin.deleteUser", userId, authError);
      authErrors.push(userId);
    } else {
      authDeleted += 1;
    }
  }

  return {
    purged: purgedRows.length,
    authDeleted,
    authErrors,
  };
}
