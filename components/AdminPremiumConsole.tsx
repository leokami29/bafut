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

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
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
      <p className="form-error">
        Solo billing/super pueden gestionar Premium desde esta consola.
      </p>
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
      <p className="field-help">
        Fuente de verdad del precio mostrado al dueño
        {config.fromDb ? " (DB)" : " (fallback env hasta migrar)"}.
      </p>
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
        Duración default (días)
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
      {state?.ok ? <p className="form-ok">Config guardada.</p> : null}
      <button type="submit" className="btn-flood" disabled={pending}>
        {pending ? "Guardando…" : "Guardar config"}
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
  const today = useMemo(() => new Date(), []);
  const [venueId, setVenueId] = useState(preselectVenueId ?? venues[0]?.id ?? "");
  const [started, setStarted] = useState(toDateInputValue(today));
  const [expires, setExpires] = useState(
    toDateInputValue(addDays(today, config.defaultDurationDays)),
  );
  const [dailyRate, setDailyRate] = useState(config.dailyRateCop);
  const days = daysBetween(started, expires);
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

  return (
    <form action={action} className="admin-premium-form">
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
          Inicio
          <input
            type="date"
            name="started_at"
            value={started}
            onChange={(e) => setStarted(e.target.value)}
            required
          />
        </label>
        <label>
          Fin
          <input
            type="date"
            name="expires_at"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            required
          />
        </label>
      </div>
      <p className="field-help">{days} día(s) de periodo.</p>
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
  const now = Date.now();

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      const exp = new Date(s.expires_at).getTime();
      if (filter === "active") return s.status === "active" && exp > now;
      if (filter === "expired") {
        return s.status === "expired" || (s.status === "active" && exp <= now) || s.status === "cancelled";
      }
      return true;
    });
  }, [subs, filter, now]);

  return (
    <div className="admin-premium-subs">
      <div className="filter-chips" role="group" aria-label="Filtrar suscripciones">
        {(
          [
            ["active", "Activas"],
            ["expired", "Vencidas / canceladas"],
            ["all", "Todas"],
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

      {filtered.length === 0 ? (
        <p className="field-help">No hay suscripciones en esta vista.</p>
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

  return (
    <li className="admin-premium-sub-row">
      <div className="admin-premium-sub-main">
        <strong>{venue?.name ?? "Cancha"}</strong>
        <span className="admin-premium-sub-meta">
          {venue?.neighborhood ?? "—"} · {sub.status} ·{" "}
          {new Date(sub.started_at).toLocaleDateString("es-CO")} →{" "}
          {new Date(sub.expires_at).toLocaleDateString("es-CO")}
          {sub.amount_cop != null ? ` · ${formatCop(sub.amount_cop)}` : ""}
        </span>
      </div>
      <div className="admin-premium-sub-actions">
        {venue?.slug ? (
          <Link href={`/canchas/${venue.slug}/admin`} className="btn-ghost">
            Panel
          </Link>
        ) : null}
        {isLive ? (
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen("extend")}>
              Extender
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen("cancel")}>
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
  const defaultNew = toDateInputValue(
    addDays(new Date(sub.expires_at), config.defaultDurationDays),
  );
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
      <label>
        Nueva fecha de fin
        <input type="date" name="new_expires_at" defaultValue={defaultNew} required />
      </label>
      <label>
        Monto del tramo (COP, opcional)
        <input
          type="number"
          name="amount_cop"
          min={0}
          defaultValue={suggestedAmountCop(config.dailyRateCop, config.defaultDurationDays)}
        />
      </label>
      <label>
        Nota
        <input type="text" name="note" maxLength={300} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="admin-premium-inline-actions">
        <button type="submit" className="btn-flood" disabled={pending}>
          Confirmar extensión
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
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
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    cancelVenuePremiumAction,
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
      <p className="field-help">Se marca la suscripción como cancelled. No borra historial.</p>
      <label>
        Nota
        <input type="text" name="note" maxLength={300} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="admin-premium-inline-actions">
        <button type="submit" className="btn-flood" disabled={pending}>
          Confirmar cancelación
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </form>
  );
}
