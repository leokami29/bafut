"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProfileAction } from "@/app/actions";
import { ProfilePhotoField } from "@/components/ProfilePhotoField";
import { avatarFocusFromProfile } from "@/lib/avatar-focus";
import { LEVELS, SPORTS, type Format, type Sport } from "@/lib/constants";
import { formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/whatsapp-contact";
import { formatLabel, levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import { formatsForSport, positionsForSport } from "@/lib/sport-rules";
import type { City, ProfileWithContact } from "@/lib/types";

type State = { error?: string; ok?: boolean } | null;

export function ProfileForm({
  profile,
  cities,
  citySlug,
  completenessHint,
  nextPath,
  userId,
}: {
  profile: ProfileWithContact;
  cities: City[];
  citySlug: string;
  completenessHint?: string | null;
  nextPath?: string;
  userId: string;
}) {
  const initialSport = (SPORTS as readonly string[]).includes(profile.preferred_sport)
    ? (profile.preferred_sport as Sport)
    : "futbol";
  const [sport, setSport] = useState<Sport>(initialSport);
  const positions = positionsForSport(sport);
  const formats = formatsForSport(sport);
  const whatsappDisplay = useMemo(() => {
    if (!profile.whatsapp) return "";
    const digits = profile.whatsapp.startsWith("57") ? profile.whatsapp.slice(2) : profile.whatsapp;
    return digits;
  }, [profile.whatsapp]);

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => updateProfileAction(formData),
    null,
  );

  return (
    <form action={action} className="stack-form profile-form">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {completenessHint ? (
        <p className="profile-form-banner" role="status">
          {completenessHint}
        </p>
      ) : null}

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Identidad</legend>
        <label>
          Cómo te dicen
          <input
            name="display_name"
            required
            minLength={2}
            maxLength={40}
            defaultValue={profile.display_name}
            autoComplete="nickname"
          />
        </label>
        <div className="profile-form-photo">
          <ProfilePhotoField
            userId={userId}
            currentPath={profile.avatar_path}
            focus={avatarFocusFromProfile(profile)}
          />
        </div>
      </fieldset>

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Contacto</legend>
        <p className="profile-form-section-lede">Solo lo ve la otra parte cuando confirman el cupo.</p>
        <label>
          WhatsApp
          <input
            name="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="3001234567"
            defaultValue={whatsappDisplay}
            aria-describedby="whatsapp-help"
          />
        </label>
        <p id="whatsapp-help" className="profile-form-hint">
          Ejemplo: {formatWhatsappDisplay(normalizeWhatsapp("3001234567") ?? "573001234567")}
        </p>
      </fieldset>

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Ubicación</legend>
        <label>
          Ciudad
          <select name="city_slug" defaultValue={citySlug}>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Deporte</legend>
        <div className="profile-form-grid is-2">
          <label>
            Deporte
            <select
              name="preferred_sport"
              value={sport}
              onChange={(e) => setSport(e.target.value as Sport)}
            >
              {SPORTS.map((item) => (
                <option key={item} value={item}>
                  {sportLabel[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Formato
            <select
              name="preferred_format"
              defaultValue={
                (formats as readonly string[]).includes(profile.preferred_format ?? "")
                  ? (profile.preferred_format as Format)
                  : formats[0]
              }
              key={`${sport}-format`}
            >
              {formats.map((item) => (
                <option key={item} value={item}>
                  {formatLabel[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="profile-form-grid is-2">
          <label>
            Posición
            <select
              name="preferred_position"
              defaultValue={
                (positions as readonly string[]).includes(profile.preferred_position)
                  ? profile.preferred_position
                  : "any"
              }
              key={`${sport}-position`}
            >
              {positions.map((position) => (
                <option key={position} value={position}>
                  {positionLabel[position]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nivel
            <select name="level" defaultValue={profile.level}>
              {LEVELS.filter((level) => level !== "any").map((level) => (
                <option key={level} value={level}>
                  {levelLabel[level]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div aria-live="polite">
        {state?.error ? <p className="profile-form-status is-error">{state.error}</p> : null}
        {state?.ok ? <p className="profile-form-status is-ok">Quedó guardado.</p> : null}
      </div>

      <div className="profile-form-actions">
        <button className="btn-turf" type="submit" disabled={pending}>
          {pending ? "Guardando…" : nextPath ? "Guardar y volver" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
