"use client";

import { setCityAction } from "@/app/actions";
import type { City } from "@/lib/types";

export function CitySwitcher({ cities, current }: { cities: City[]; current: string | undefined }) {
  return (
    <form action={setCityAction} className="city-switch">
      <label className="sr-only" htmlFor="city-slug">
        Ciudad
      </label>
      <select
        id="city-slug"
        name="slug"
        defaultValue={current}
        onChange={(event) => {
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
  );
}
