"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelVenuePremiumAction,
  extendVenuePremiumAction,
  grantVenuePremiumAction,
  updatePremiumPlanConfigAction,
  type AdminActionState,
} from "@/app/admin/premium/actions";
import {
  ADMIN_CIVIL_TZ,
  addCalendarDaysToDateInput,
  defaultExtendDateInput,
  formatCivilDate,
  toDateInputValueInZone,
} from "@/lib/datetime";
import { formatCop } from "@/lib/premium-payment";
import { suggestedAmountCop } from "@/lib/premium-config-client";

export type AdminPremiumSubRow = {
  id: string;
  venue_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string;
  amount_cop: number | null;
  payment_method: string | null;
  venues: { name: string; slug: string; neighborhood: string | null } | null;
};

export type AdminPremiumVenueOption = {
  id: string;
  name: string;
  slug: string;
  neighborhood: string | null;
};

export type AdminPremiumConfig = {
  dailyRateCop: number;
  defaultDurationDays: number;
  listPriceCop: number;
  fromDb: boolean;
};

type Props = {
  tab: "subs" | "otorgar" | "config";
  subs: AdminPremiumSubRow[];
  venues: AdminPremiumVenueOption[];
  config: AdminPremiumConfig;
  canEdit: boolean;
  preselectVenueId?: string | null;
};

function statusLabel(status: string, isLive: boolean): string {
  if (status === "cancelled") return "Cancelada";
  if (status === "expired" || !isLive) return "Vencida";
  if (status === "active") return "Activa";
  return status;
}

function calendarDaysBetween(startYmd: string, endYmd: string): number {
  const a = startYmd.split("-").map(Number);
  const b = endYmd.split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some((n) => Number.isNaN(n)) || b.some((n) => Number.isNaN(n))) {
    return 1;
  }
  const start = Date.UTC(a[0], a[1] - 1, a[2]);
  const end = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

export function AdminPremiumConsole({
  tab,
  subs,
  venues,
  config,
  canEdit,
  preselectVenueId,
}: Props) {
  const router = useRouter();

  if (!canEdit) {
    return (
      <div className="admin-empty">
        <p className="admin-empty-title">Sin permiso de edición</p>
        <p className="admin-empty-copy">
          Solo roles billing/super pueden gestionar Premium desde esta consola.
        </p>
      </div>
    );
  }

  if (tab === "config") {
    return <ConfigTab config={config} />;
  }
  if (tab === "otorgar") {
    return (
      <GrantTab
        venues={venues}
        config={config}
        preselectVenueId={preselectVenueId}
        onOk={() => router.refresh()}
      />
    );
  }
  return <SubsTab subs={subs} config={config} onOk={() => router.refresh()} />;
}

function ConfigTab({ config }: { config: AdminPremiumConfig }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    updatePremiumPlanConfigAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={action} className="admin-premium-form">
      <header className="admin-premium-section-head">
        <h2 className="admin-premium-section-title">Precio y duración</h2>
        <p className="field-help">
          Fuente de verdad del precio mostrado al dueño
          {config.fromDb ? " (base de datos)" : " (fallback de env hasta migrar)"}.
        </p>
      </header>
      <label>
        Precio por día (COP)
        <input
          type="number"
          name="daily_rate_cop"
          min={0}
          step={1}
          defaultValue={config.dailyRateCop}
          required
        />
      </label>
      <label>
        Duración por defecto (días)
        <input
          type="number"
          name="default_duration_days"
          min={1}
          max={366}
          defaultValue={config.defaultDurationDays}
          required
        />
      </label>
      <label>
        Precio de lista del periodo (COP)
        <input
          type="number"
          name="list_price_cop"
          min={0}
          step={1}
          defaultValue={config.listPriceCop}
        />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Configuración guardada.</p> : null}
      <button type="submit" className="btn-flood" disabled={pending}>
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}

function GrantTab({
  venues,
  config,
  preselectVenueId,
  onOk,
}: {
  venues: AdminPremiumVenueOption[];
  config: AdminPremiumConfig;
  preselectVenueId?: string | null;
  onOk: () => void;
}) {
  const todayYmd = useMemo(() => toDateInputValueInZone(new Date(), ADMIN_CIVIL_TZ), []);
  const [venueId, setVenueId] = useState(preselectVenueId ?? venues[0]?.id ?? "");
  const [started, setStarted] = useState(todayYmd);
  const [expires, setExpires] = useState(
    addCalendarDaysToDateInput(todayYmd, config.defaultDurationDays, ADMIN_CIVIL_TZ),
  );
  const [dailyRate, setDailyRate] = useState(config.dailyRateCop);
  const days = calendarDaysBetween(started, expires);
  const [amount, setAmount] = useState(suggestedAmountCop(config.dailyRateCop, days));
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    grantVenuePremiumAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onOk();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al éxito
  }, [state?.ok]);

  useEffect(() => {
    setAmount(suggestedAmountCop(dailyRate, days));
  }, [dailyRate, days]);

  if (venues.length === 0) {
    return (
      <div className="admin-empty">
        <p className="admin-empty-title">No hay canchas</p>
        <p className="admin-empty-copy">Registrá una cancha antes de otorgar Premium.</p>
      </div>
    );
  }

  return (
    <form action={action} className="admin-premium-form">
      <header className="admin-premium-section-head">
        <h2 className="admin-premium-section-title">Otorgar Premium</h2>
        <p className="field-help">
          Las fechas son día civil en Colombia (America/Bogota). El fin se guarda a las 23:59:59.
        </p>
      </header>
      <label>
        Cancha
        <select
          name="venue_id"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          required
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.neighborhood ? ` · ${v.neighborhood}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-premium-grid">
        <label>
          Fecha de inicio
          <input
            type="date"
            name="started_at"
            value={started}
            onChange={(e) => setStarted(e.target.value)}
            required
          />
        </label>
        <label>
          Fecha de fin
          <input
            type="date"
            name="expires_at"
            value={expires}
            min={addCalendarDaysToDateInput(started, 1, ADMIN_CIVIL_TZ)}
            onChange={(e) => setExpires(e.target.value)}
            required
          />
        </label>
      </div>
      <p className="admin-premium-calc" aria-live="polite">
        <strong>{days}</strong> día{days === 1 ? "" : "s"} de periodo · sugerido{" "}
        <strong>{formatCop(suggestedAmountCop(dailyRate, days))}</strong>
      </p>
      <div className="admin-premium-grid">
        <label>
          Precio / día (COP)
          <input
            type="number"
            name="daily_rate_cop"
            min={0}
            value={dailyRate}
            onChange={(e) => setDailyRate(Number.parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <label>
          Monto del periodo (COP)
          <input
            type="number"
            name="amount_cop"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number.parseInt(e.target.value, 10) || 0)}
            required
          />
        </label>
      </div>
      <label>
        Nota (opcional)
        <input type="text" name="note" maxLength={300} placeholder="Transferencia, cortesía…" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Premium otorgado.</p> : null}
      <button type="submit" className="btn-flood" disabled={pending || !venueId}>
        {pending ? "Otorgando…" : "Otorgar Premium"}
      </button>
    </form>
  );
}

function SubsTab({
  subs,
  config,
  onOk,
}: {
  subs: AdminPremiumSubRow[];
  config: AdminPremiumConfig;
  onOk: () => void;
}) {
  const [filter, setFilter] = useState<"active" | "expired" | "all">("active");
  const [query, setQuery] = useState("");
  const now = Date.now();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subs.filter((s) => {
      const exp = new Date(s.expires_at).getTime();
      const isLive = s.status === "active" && exp > now;
      if (filter === "active" && !isLive) return false;
      if (filter === "expired") {
        const expiredLike =
          s.status === "expired" ||
          s.status === "cancelled" ||
          (s.status === "active" && exp <= now);
        if (!expiredLike) return false;
      }
      if (!q) return true;
      const hay = `${s.venues?.name ?? ""} ${s.venues?.neighborhood ?? ""} ${s.venues?.slug ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [subs, filter, now, query]);

  const counts = useMemo(() => {
    let active = 0;
    let expired = 0;
    for (const s of subs) {
      const exp = new Date(s.expires_at).getTime();
      const isLive = s.status === "active" && exp > now;
      if (isLive) active += 1;
      else expired += 1;
    }
    return { active, expired, all: subs.length };
  }, [subs, now]);

  return (
    <div className="admin-premium-subs">
      <header className="admin-premium-section-head">
        <h2 className="admin-premium-section-title">Suscripciones Premium</h2>
        <p className="field-help">
          Extendé o cancelá periodos activos. Fechas en zona Colombia.
        </p>
      </header>

      <div className="admin-premium-toolbar">
        <div className="filter-chips" role="group" aria-label="Filtrar suscripciones">
          {(
            [
              ["active", `Activas (${counts.active})`],
              ["expired", `Vencidas / canceladas (${counts.expired})`],
              ["all", `Todas (${counts.all})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? "is-on" : undefined}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="admin-premium-search">
          <span className="sr-only">Buscar cancha</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cancha…"
            autoComplete="off"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <p className="admin-empty-title">Sin resultados</p>
          <p className="admin-empty-copy">
            {subs.length === 0
              ? "Todavía no hay suscripciones Premium. Otorgá una desde la pestaña Otorgar."
              : "No hay suscripciones en este filtro. Probá “Todas” o limpiá la búsqueda."}
          </p>
        </div>
      ) : (
        <ul className="admin-premium-sub-list">
          {filtered.map((sub) => (
            <SubRow key={sub.id} sub={sub} config={config} onOk={onOk} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubRow({
  sub,
  config,
  onOk,
}: {
  sub: AdminPremiumSubRow;
  config: AdminPremiumConfig;
  onOk: () => void;
}) {
  const [open, setOpen] = useState<"extend" | "cancel" | null>(null);
  const venue = sub.venues;
  const isLive =
    sub.status === "active" && new Date(sub.expires_at).getTime() > Date.now();
  const daysLeft = isLive
    ? Math.max(
        0,
        Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000),
      )
    : 0;

  return (
    <li className={`admin-premium-sub-row${isLive ? "" : " is-stale"}`}>
      <div className="admin-premium-sub-main">
        <div className="admin-premium-sub-title-row">
          <strong>{venue?.name ?? "Cancha"}</strong>
          <span className={`admin-premium-badge${isLive ? " is-live" : ""}`}>
            {statusLabel(sub.status, isLive)}
          </span>
        </div>
        <span className="admin-premium-sub-meta">
          {venue?.neighborhood ?? "Sin barrio"} · {formatCivilDate(sub.started_at)} →{" "}
          <strong title={sub.expires_at}>{formatCivilDate(sub.expires_at)}</strong>
          {isLive ? ` · ${daysLeft} día${daysLeft === 1 ? "" : "s"} restantes` : ""}
          {sub.amount_cop != null ? ` · ${formatCop(sub.amount_cop)}` : ""}
        </span>
      </div>
      <div className="admin-premium-sub-actions">
        {venue?.slug ? (
          <Link href={`/canchas/${venue.slug}/admin`} className="btn-ghost">
            Panel cancha
          </Link>
        ) : null}
        {isLive ? (
          <>
            <button
              type="button"
              className="btn-ghost"
              aria-expanded={open === "extend"}
              onClick={() => setOpen(open === "extend" ? null : "extend")}
            >
              Extender
            </button>
            <button
              type="button"
              className="btn-ghost admin-premium-cancel-trigger"
              aria-expanded={open === "cancel"}
              onClick={() => setOpen(open === "cancel" ? null : "cancel")}
            >
              Cancelar
            </button>
          </>
        ) : null}
      </div>
      {open === "extend" ? (
        <ExtendForm
          sub={sub}
          config={config}
          onDone={() => {
            setOpen(null);
            onOk();
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "cancel" ? (
        <CancelForm
          sub={sub}
          onDone={() => {
            setOpen(null);
            onOk();
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </li>
  );
}

function ExtendForm({
  sub,
  config,
  onDone,
  onClose,
}: {
  sub: AdminPremiumSubRow;
  config: AdminPremiumConfig;
  onDone: () => void;
  onClose: () => void;
}) {
  const currentYmd = toDateInputValueInZone(sub.expires_at, ADMIN_CIVIL_TZ);
  const minYmd = addCalendarDaysToDateInput(currentYmd, 1, ADMIN_CIVIL_TZ);
  const [newExpires, setNewExpires] = useState(
    defaultExtendDateInput(sub.expires_at, config.defaultDurationDays),
  );
  const extendDays = calendarDaysBetween(currentYmd, newExpires);
  const suggested = suggestedAmountCop(config.dailyRateCop, extendDays);
  const [amount, setAmount] = useState(suggested);

  useEffect(() => {
    setAmount(suggestedAmountCop(config.dailyRateCop, extendDays));
  }, [config.dailyRateCop, extendDays]);

  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    extendVenuePremiumAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al éxito
  }, [state?.ok]);

  return (
    <form action={action} className="admin-premium-inline-form">
      <input type="hidden" name="subscription_id" value={sub.id} />
      <input type="hidden" name="venue_id" value={sub.venue_id} />
      <p className="admin-premium-current-expiry">
        Vence actualmente el <strong>{formatCivilDate(sub.expires_at)}</strong>
        <span className="admin-premium-current-expiry-hint">
          {" "}
          (mínimo para extender: {minYmd})
        </span>
      </p>
      <label>
        Nueva fecha de fin
        <input
          type="date"
          name="new_expires_at"
          value={newExpires}
          min={minYmd}
          onChange={(e) => setNewExpires(e.target.value)}
          required
        />
      </label>
      <p className="admin-premium-calc" aria-live="polite">
        Extensión de <strong>{extendDays}</strong> día{extendDays === 1 ? "" : "s"} · sugerido{" "}
        <strong>{formatCop(suggested)}</strong>
      </p>
      <label>
        Monto del tramo (COP, opcional)
        <input
          type="number"
          name="amount_cop"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number.parseInt(e.target.value, 10) || 0)}
        />
      </label>
      <label>
        Nota (opcional)
        <input type="text" name="note" maxLength={300} placeholder="Motivo o referencia de pago" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="admin-premium-inline-actions">
        <button type="submit" className="btn-flood" disabled={pending}>
          {pending ? "Extendiendo…" : "Confirmar extensión"}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
          Cerrar
        </button>
      </div>
    </form>
  );
}

function CancelForm({
  sub,
  onDone,
  onClose,
}: {
  sub: AdminPremiumSubRow;
  onDone: () => void;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    cancelVenuePremiumAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al éxito
  }, [state?.ok]);

  return (
    <form action={action} className="admin-premium-inline-form admin-premium-cancel-form">
      <input type="hidden" name="subscription_id" value={sub.id} />
      <input type="hidden" name="venue_id" value={sub.venue_id} />
      <input type="hidden" name="confirm_cancel" value={confirmed ? "1" : "0"} />
      <p className="field-help">
        Se marca la suscripción como <strong>cancelada</strong>. No borra el historial ni
        pagos previos. Vence hoy: {formatCivilDate(sub.expires_at)}.
      </p>
      <label className="admin-premium-confirm-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Sí, cancelar Premium de {sub.venues?.name ?? "esta cancha"}
      </label>
      <label>
        Nota (opcional)
        <input type="text" name="note" maxLength={300} placeholder="Motivo de cancelación" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="admin-premium-inline-actions">
        <button
          type="submit"
          className="btn-flood admin-premium-danger"
          disabled={pending || !confirmed}
        >
          {pending ? "Cancelando…" : "Confirmar cancelación"}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
          Cerrar
        </button>
      </div>
    </form>
  );
}
