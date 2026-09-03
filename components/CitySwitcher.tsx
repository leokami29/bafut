"use client";

import { useEffect, useRef, useState } from "react";
import { setCityAction } from "@/app/actions";
import type { City } from "@/lib/types";

export function CitySwitcher({ cities, current }: { cities: City[]; current: string | undefined }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <form action={setCityAction} className="city-switch">
        <label className="sr-only" htmlFor="city-slug">
          Ciudad
        </label>
        <select
          id="city-slug"
          name="slug"
          defaultValue={current}
          onChange={(event) => {
            const name = cities.find((c) => c.slug === event.target.value)?.name ?? event.target.value;
            setToast(`Ciudad: ${name}`);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setToast(null), 2200);
            event.currentTarget.form?.requestSubmit();
          }}
        >
          {cities.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </form>
      {toast ? (
        <p className="city-toast" role="status">
          {toast}
        </p>
      ) : null}
    </>
  );
}
