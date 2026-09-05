import { describe, expect, it } from "vitest";
import {
  cityDayBoundsFromLocal,
  datetimeLocalInZoneToDate,
  getMatchTimePeriod,
  isSameCityDay,
  isTonightMatch,
  isWithinNextHours,
  isoToDatetimeLocalInZone,
  zonedDateParts,
} from "@/lib/datetime";

// America/Bogota = UTC-5 fijo (sin DST): casos deterministas.
const BOGOTA = "America/Bogota";

describe("datetimeLocalInZoneToDate", () => {
  it("interpreta hora civil de Bogotá como instante UTC", () => {
    expect(datetimeLocalInZoneToDate("2026-09-05T10:30", BOGOTA)?.toISOString()).toBe(
      "2026-09-05T15:30:00.000Z",
    );
  });

  it("round-trip con isoToDatetimeLocalInZone", () => {
    const iso = "2026-09-05T15:30:00.000Z";
    const local = isoToDatetimeLocalInZone(iso, BOGOTA);
    expect(local).toBe("2026-09-05T10:30");
    expect(datetimeLocalInZoneToDate(local, BOGOTA)?.toISOString()).toBe(iso);
  });

  it("rechaza formatos inválidos", () => {
    expect(datetimeLocalInZoneToDate("", BOGOTA)).toBe(null);
    expect(datetimeLocalInZoneToDate("nonsense", BOGOTA)).toBe(null);
    expect(datetimeLocalInZoneToDate("2026-09-05", BOGOTA)).toBe(null);
    expect(datetimeLocalInZoneToDate("2026-09-05 10:30", BOGOTA)).toBe(null);
  });

  it("rechaza horas fuera de rango", () => {
    expect(datetimeLocalInZoneToDate("2026-09-05T25:00", BOGOTA)).toBe(null);
  });
});

describe("zonedDateParts", () => {
  it("extrae campos civiles en Bogotá", () => {
    const parts = zonedDateParts(new Date("2026-09-05T15:30:00.000Z"), BOGOTA);
    expect(parts).toEqual({
      year: 2026,
      month: 9,
      day: 5,
      hour: 10,
      minute: 30,
      weekday: 6, // sábado
    });
  });

  it("normaliza hora 24 a 0", () => {
    const parts = zonedDateParts(new Date("2026-01-01T05:00:00.000Z"), BOGOTA);
    expect(parts.hour).toBe(0);
  });
});

describe("isTonightMatch", () => {
  it("noche 18:00–23:59 y madrugada 00:00–05:59", () => {
    expect(isTonightMatch("2026-09-05T23:00:00.000Z", BOGOTA)).toBe(true); // 18:00 local
    expect(isTonightMatch("2026-09-05T04:00:00.000Z", BOGOTA)).toBe(true); // 23:00 local
    expect(isTonightMatch("2026-09-05T10:59:00.000Z", BOGOTA)).toBe(true); // 05:59 local
    expect(isTonightMatch("2026-09-05T11:00:00.000Z", BOGOTA)).toBe(false); // 06:00 local
  });

  it("día no es noche", () => {
    expect(isTonightMatch("2026-09-05T15:30:00.000Z", BOGOTA)).toBe(false); // 10:30 local
  });
});

describe("getMatchTimePeriod", () => {
  it("clasifica mañana, tarde y noche", () => {
    expect(getMatchTimePeriod("2026-09-05T13:00:00.000Z", BOGOTA)).toBe("manana"); // 08:00
    expect(getMatchTimePeriod("2026-09-05T19:00:00.000Z", BOGOTA)).toBe("tarde"); // 14:00
    expect(getMatchTimePeriod("2026-09-06T02:00:00.000Z", BOGOTA)).toBe("noche"); // 21:00
  });

  it("bordes: 06:00 mañanas, 12:00 tardes, 18:00 noches", () => {
    expect(getMatchTimePeriod("2026-09-05T11:00:00.000Z", BOGOTA)).toBe("manana"); // 06:00
    expect(getMatchTimePeriod("2026-09-05T17:00:00.000Z", BOGOTA)).toBe("tarde"); // 12:00
    expect(getMatchTimePeriod("2026-09-05T23:00:00.000Z", BOGOTA)).toBe("noche"); // 18:00
  });
});

describe("isSameCityDay", () => {
  it("mismo día civil aunque cambie la fecha UTC", () => {
    // 2026-09-05T04:59Z = 2026-09-04 23:59 Bogotá; now = 2026-09-04 22:00 Bogotá
    const now = new Date("2026-09-05T03:00:00.000Z");
    expect(isSameCityDay("2026-09-05T04:59:00.000Z", BOGOTA, now)).toBe(true);
  });

  it("días civiles distintos aunque sea el mismo instante UTC en otra zona", () => {
    const now = new Date("2026-09-06T03:00:00.000Z"); // 05-sep 22:00 Bogotá
    expect(isSameCityDay("2026-09-06T05:00:00.000Z", BOGOTA, now)).toBe(false); // 06-sep 00:00
  });
});

describe("cityDayBoundsFromLocal", () => {
  it("límites del día civil en Bogotá: [05:00Z, 05:00Z+1d)", () => {
    const bounds = cityDayBoundsFromLocal("2026-09-05T12:00", BOGOTA);
    expect(bounds?.dayStart.toISOString()).toBe("2026-09-05T05:00:00.000Z");
    expect(bounds?.dayEnd.toISOString()).toBe("2026-09-06T05:00:00.000Z");
    expect(bounds?.dayKey).toBe("2026-09-05");
  });

  it("acepta ISO también", () => {
    const bounds = cityDayBoundsFromLocal("2026-09-05T12:00:00.000Z", BOGOTA);
    expect(bounds?.dayKey).toBe("2026-09-05");
    expect(bounds?.dayStart.toISOString()).toBe("2026-09-05T05:00:00.000Z");
  });

  it("inválido devuelve null", () => {
    expect(cityDayBoundsFromLocal("garbage", BOGOTA)).toBe(null);
    expect(cityDayBoundsFromLocal("", BOGOTA)).toBe(null);
  });
});

describe("isWithinNextHours", () => {
  const now = new Date("2026-09-05T15:00:00.000Z");

  it("dentro de la ventana", () => {
    expect(isWithinNextHours("2026-09-05T18:00:00.000Z", 4, now)).toBe(true);
  });

  it("pasado y futuro lejano quedan fuera", () => {
    expect(isWithinNextHours("2026-09-05T14:00:00.000Z", 4, now)).toBe(false);
    expect(isWithinNextHours("2026-09-05T20:00:00.000Z", 4, now)).toBe(false);
  });

  it("bordes inclusivos", () => {
    expect(isWithinNextHours("2026-09-05T15:00:00.000Z", 4, now)).toBe(true);
    expect(isWithinNextHours("2026-09-05T19:00:00.000Z", 4, now)).toBe(true);
  });

  it("hours <= 0 siempre falso", () => {
    expect(isWithinNextHours("2026-09-05T16:00:00.000Z", 0, now)).toBe(false);
  });

  it("ISO inválido falso", () => {
    expect(isWithinNextHours("nonsense", 4, now)).toBe(false);
  });
});
