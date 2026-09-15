"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LegalAcceptCheckbox } from "@/components/LegalAcceptCheckbox";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerCardZoomControl } from "@/components/PlayerCardZoomControl";
import {
  saveProfileAvatarFocusAction,
  saveProfileAvatarPathAction,
  saveProfileContactAction,
  saveProfileGameAction,
  saveProfileIdentityAction,
} from "@/app/perfil/actions";
import { LEVELS, SPORTS, type Format, type Level, type Position, type Sport } from "@/lib/constants";
import { formatLabel, levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import { avatarFocusFromProfile, DEFAULT_AVATAR_FOCUS, type AvatarFocus } from "@/lib/avatar-focus";
import type { PlayerCardStats } from "@/lib/player-card";
import { toPlayerCardDraft } from "@/lib/player-card-draft";
import { missingProfileSteps } from "@/lib/profile";
import {
  PROFILE_AVATARS_BUCKET,
  profileAvatarObjectPath,
  profileAvatarPublicUrl,
  validateProfileAvatarFile,
} from "@/lib/profile-photos";
import { formatsForSport, positionsForSport } from "@/lib/sport-rules";
import { createClient } from "@/lib/supabase/client";
import type { City, ProfileWithContact } from "@/lib/types";
import { formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/whatsapp-contact";

type Step = "identity" | "game" | "contact";

const STEP_ORDER: Step[] = ["identity", "game", "contact"];

function firstOpenStep(profile: ProfileWithContact, email?: string | null): Step {
  const missing = missingProfileSteps(profile, email);
  if (missing.identity) return "identity";
  if (missing.game) return "game";
  return "contact";
}

function Choice({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`ficha-choice${selected ? " is-on" : ""}`} onClick={onSelect}>
      {children}
    </button>
  );
}

export function ProfileOnboarding({
  profile,
  cities,
  citySlug,
  cityName,
  stats,
  email,
  userId,
  nextPath,
}: {
  profile: ProfileWithContact;
  cities: City[];
  citySlug: string;
  cityName: string;
  stats: PlayerCardStats;
  email?: string | null;
  userId: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => firstOpenStep(profile, email));
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_path ? profileAvatarPublicUrl(profile.avatar_path) : null,
  );
  const [avatarFocus, setAvatarFocus] = useState<AvatarFocus>(() => avatarFocusFromProfile(profile));
  const avatarFocusRef = useRef(avatarFocus);
  avatarFocusRef.current = avatarFocus;
  const [sport, setSport] = useState<Sport>(
    (SPORTS as readonly string[]).includes(profile.preferred_sport)
      ? (profile.preferred_sport as Sport)
      : "futbol",
  );
  const [format, setFormat] = useState<Format>(() => {
    const initialSport = (SPORTS as readonly string[]).includes(profile.preferred_sport)
      ? (profile.preferred_sport as Sport)
      : "futbol";
    const allowed = formatsForSport(initialSport);
    return (allowed as readonly string[]).includes(profile.preferred_format ?? "")
      ? (profile.preferred_format as Format)
      : allowed[0];
  });
  const [position, setPosition] = useState<Position>(
    (positionsForSport(
      (SPORTS as readonly string[]).includes(profile.preferred_sport)
        ? (profile.preferred_sport as Sport)
        : "futbol",
    ) as readonly string[]).includes(profile.preferred_position)
      ? (profile.preferred_position as Position)
      : "any",
  );
  const [level, setLevel] = useState<Extract<Level, "low" | "mid" | "high">>(() =>
    profile.level === "low" || profile.level === "high" || profile.level === "mid"
      ? profile.level
      : "mid",
  );
  const [whatsapp, setWhatsapp] = useState(() => {
    if (!profile.whatsapp) return "";
    return profile.whatsapp.startsWith("57") ? profile.whatsapp.slice(2) : profile.whatsapp;
  });
  const [city, setCity] = useState(citySlug);
  const [legalOn, setLegalOn] = useState(Boolean(profile.terms_accepted_at));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const formats = formatsForSport(sport);
  const positions = positionsForSport(sport);
  const stepIndex = STEP_ORDER.indexOf(step);

  const draft = useMemo(
    () =>
      toPlayerCardDraft(profile, stats, cityName, {
        displayName,
        avatarUrl: avatarPreview,
        sport,
        format,
        position,
        level,
        avatarFocus,
      }),
    [avatarFocus, avatarPreview, cityName, displayName, format, level, position, profile, sport, stats],
  );

  function onSport(next: Sport) {
    setSport(next);
    const nextFormats = formatsForSport(next);
    setFormat((current) => (nextFormats.includes(current) ? current : nextFormats[0]));
    const nextPositions = positionsForSport(next);
    setPosition((current) => (nextPositions.includes(current) ? current : "any"));
  }

  function onPhoto(file: File | undefined) {
    if (!file) return;
    const check = validateProfileAvatarFile(file);
    if ("error" in check) {
      setError(check.error);
      return;
    }
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setAvatarFocus(DEFAULT_AVATAR_FOCUS);
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
      data.set("avatar_focus_x", String(DEFAULT_AVATAR_FOCUS.x));
      data.set("avatar_focus_y", String(DEFAULT_AVATAR_FOCUS.y));
      data.set("avatar_zoom", String(DEFAULT_AVATAR_FOCUS.zoom));
      const saved = await saveProfileAvatarPathAction(data);
      if (saved.error) {
        setError(saved.error);
        return;
      }
      setAvatarPath(path);
      setAvatarPreview(profileAvatarPublicUrl(path));
      URL.revokeObjectURL(localUrl);
    });
  }

  return (
    <div className="player-card-stage">
      <div className="player-card-sticky-slot">
        <PlayerCard
          draft={draft}
          cityName={cityName}
          interactive={step === "identity" && Boolean(avatarPreview)}
          onFocusChange={setAvatarFocus}
          onFocusCommit={(next) => {
            setAvatarFocus(next);
            const data = new FormData();
            data.set("avatar_focus_x", String(next.x));
            data.set("avatar_focus_y", String(next.y));
            data.set("avatar_zoom", String(next.zoom));
            startTransition(async () => {
              await saveProfileAvatarFocusAction(data);
            });
          }}
        />
      </div>
      <section className="ficha-step" aria-labelledby="ficha-title">
        <p className="ficha-kicker">
          Armá tu carta · paso {stepIndex + 1} de {STEP_ORDER.length}
        </p>
        <p className="ficha-progress" aria-hidden="true">
          {STEP_ORDER.map((item) => (
            <span key={item} className={STEP_ORDER.indexOf(item) <= stepIndex ? "is-on" : undefined} />
          ))}
        </p>
        <h2 id="ficha-title">
          {step === "identity" ? "Cómo te van a reconocer" : step === "game" ? "Cómo jugás" : "Para confirmar el cupo"}
        </h2>
        <p className="ficha-legend">
          {step === "identity"
            ? "Nombre de cancha y una foto. La carta se llena al toque."
            : step === "game"
              ? "Deporte, formato y posición. Un toque y ya está en la carta."
              : "WhatsApp solo lo ve la otra parte cuando confirman. Términos una vez."}
        </p>

        {step === "identity" ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!avatarPath) {
                setError("Subí una foto para seguir.");
                return;
              }
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await saveProfileIdentityAction(formData);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setError(null);
                setStep("game");
              });
            }}
          >
            <label>
              Cómo te dicen
              <input
                name="display_name"
                required
                minLength={2}
                maxLength={40}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="ficha-photo">
              Foto de perfil
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onPhoto(event.target.files?.[0])}
              />
            </label>
            {avatarPreview ? (
              <PlayerCardZoomControl
                focus={avatarFocus}
                onChange={setAvatarFocus}
                onCommit={() => {
                  const next = avatarFocusRef.current;
                  const data = new FormData();
                  data.set("avatar_focus_x", String(next.x));
                  data.set("avatar_focus_y", String(next.y));
                  data.set("avatar_zoom", String(next.zoom));
                  startTransition(async () => {
                    await saveProfileAvatarFocusAction(data);
                  });
                }}
                helpText="Arrastrá la foto en la carta para centrar la cara."
              />
            ) : null}
            <div className="ficha-actions">
              <button className="btn-flood" type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Siguiente"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "game" ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await saveProfileGameAction(formData);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setError(null);
                setStep("contact");
              });
            }}
          >
            <input type="hidden" name="preferred_sport" value={sport} />
            <input type="hidden" name="preferred_format" value={format} />
            <input type="hidden" name="preferred_position" value={position} />
            <input type="hidden" name="level" value={level} />
            <fieldset>
              <legend>Deporte</legend>
              <div className="ficha-choice-grid">
                {SPORTS.map((item) => (
                  <Choice key={item} selected={sport === item} onSelect={() => onSport(item)}>
                    {sportLabel[item]}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Formato</legend>
              <div className="ficha-choice-grid">
                {formats.map((item) => (
                  <Choice key={item} selected={format === item} onSelect={() => setFormat(item)}>
                    {formatLabel[item]}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Posición</legend>
              <div className="ficha-choice-grid">
                {positions.map((item) => (
                  <Choice key={item} selected={position === item} onSelect={() => setPosition(item)}>
                    {positionLabel[item]}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Nivel</legend>
              <div className="ficha-choice-grid">
                {LEVELS.filter((item) => item !== "any").map((item) => (
                  <Choice key={item} selected={level === item} onSelect={() => setLevel(item)}>
                    {levelLabel[item]}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <div className="ficha-actions">
              <button className="btn-ghost" type="button" onClick={() => setStep("identity")}>
                Atrás
              </button>
              <button className="btn-flood" type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Siguiente"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "contact" ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await saveProfileContactAction(formData);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
          >
            {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
            <label>
              WhatsApp
              <input
                name="whatsapp"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="3001234567"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                aria-describedby="whatsapp-help"
              />
            </label>
            <p id="whatsapp-help" className="field-help">
              Ejemplo: {formatWhatsappDisplay(normalizeWhatsapp("3001234567") ?? "573001234567")}
            </p>
            <label>
              Ciudad
              <select name="city_slug" value={city} onChange={(event) => setCity(event.target.value)}>
                {cities.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <LegalAcceptCheckbox
              checked={legalOn}
              onChange={setLegalOn}
              variant="signup"
              required={!profile.terms_accepted_at}
            />
            <div className="ficha-actions">
              <button className="btn-ghost" type="button" onClick={() => setStep("game")}>
                Atrás
              </button>
              <button className="btn-flood" type="submit" disabled={pending}>
                {pending ? "Guardando…" : nextPath ? "Listo, ir al partido" : "Ver mi carta"}
              </button>
            </div>
          </form>
        ) : null}

        <div aria-live="polite">{error ? <p className="form-error">{error}</p> : null}</div>
      </section>
    </div>
  );
}
