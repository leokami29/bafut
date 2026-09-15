"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProfileAvatarPathAction } from "@/app/perfil/actions";
import {
  clampAvatarFocus,
  DEFAULT_AVATAR_FOCUS,
  type AvatarFocus,
} from "@/lib/avatar-focus";
import {
  PROFILE_AVATARS_BUCKET,
  profileAvatarObjectPath,
  profileAvatarPublicUrl,
  validateProfileAvatarFile,
} from "@/lib/profile-photos";
import { createClient } from "@/lib/supabase/client";

export function ProfilePhotoField({
  userId,
  currentPath,
  focus,
  onPreviewUrl,
  onFocusChange,
}: {
  userId: string;
  currentPath: string | null;
  focus: AvatarFocus;
  onPreviewUrl?: (url: string | null) => void;
  onFocusChange?: (focus: AvatarFocus) => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(
    currentPath ? profileAvatarPublicUrl(currentPath) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextFocus = clampAvatarFocus(focus);

  return (
    <label className="ficha-photo">
      Foto de perfil
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          width={72}
          height={72}
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            objectPosition: `${nextFocus.x}% ${nextFocus.y}%`,
          }}
        />
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const check = validateProfileAvatarFile(file);
          if ("error" in check) {
            setError(check.error);
            return;
          }
          setError(null);
          const localUrl = URL.createObjectURL(file);
          setPreview(localUrl);
          onPreviewUrl?.(localUrl);
          const resetFocus = DEFAULT_AVATAR_FOCUS;
          onFocusChange?.(resetFocus);
          startTransition(async () => {
            const supabase = createClient();
            const path = profileAvatarObjectPath(userId, file.name);
            const { error: uploadError } = await supabase.storage
              .from(PROFILE_AVATARS_BUCKET)
              .upload(path, file, { contentType: file.type, upsert: false });
            if (uploadError) {
              setError(uploadError.message || "No se pudo subir la foto.");
              return;
            }
            const data = new FormData();
            data.set("avatar_path", path);
            data.set("avatar_focus_x", String(resetFocus.x));
            data.set("avatar_focus_y", String(resetFocus.y));
            data.set("avatar_zoom", String(resetFocus.zoom));
            const saved = await saveProfileAvatarPathAction(data);
            if (saved.error) {
              setError(saved.error);
              return;
            }
            const publicUrl = profileAvatarPublicUrl(path);
            setPreview(publicUrl);
            onPreviewUrl?.(publicUrl);
            URL.revokeObjectURL(localUrl);
            router.refresh();
          });
        }}
      />
      {pending ? <span className="field-help">Subiendo foto…</span> : null}
      {error ? <span className="form-error">{error}</span> : null}
    </label>
  );
}
