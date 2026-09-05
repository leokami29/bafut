import { describe, expect, it } from "vitest";
import { formatDistance, haversineDistance, sortVenuesByDistance } from "@/lib/geo";

describe("haversineDistance", () => {
  it("mismo punto = 0 km", () => {
    expect(haversineDistance(10.96854, -74.78132, 10.96854, -74.78132)).toBe(0);
  });

  it("distancia conocida: Barranquilla centro → Riomar (~3 km)", () => {
    const dist = haversineDistance(10.9874, -74.7889, 11.0118, -74.8214);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(5);
  });

  it("distancia conocida: Bogotá → Medellín (~240 km en línea recta)", () => {
    const dist = haversineDistance(4.6097, -74.0817, 6.2476, -75.5658);
    expect(dist).toBeGreaterThan(230);
    expect(dist).toBeLessThan(250);
  });

  it("simetría: A→B == B→A", () => {
    const ab = haversineDistance(10.96854, -74.78132, 11.0118, -74.8214);
    const ba = haversineDistance(11.0118, -74.8214, 10.96854, -74.78132);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

describe("formatDistance", () => {
  it("muy cerca: < 1 km", () => {
    expect(formatDistance(0.3)).toBe("< 1 km");
    expect(formatDistance(0)).toBe("< 1 km");
  });

  it("cerca: 1 decimal", () => {
    expect(formatDistance(2.34)).toBe("2.3 km");
    expect(formatDistance(9.9)).toBe("9.9 km");
  });

  it("lejos: redondeado", () => {
    expect(formatDistance(15.7)).toBe("16 km");
    expect(formatDistance(100)).toBe("100 km");
  });
});

describe("sortVenuesByDistance", () => {
  it("ordena por cercanía al usuario", () => {
    const venues = [
      { id: "far", lat: 11.05, lng: -74.9 },
      { id: "near", lat: 10.97, lng: -74.78 },
      { id: "mid", lat: 11.0, lng: -74.82 },
    ];
    const sorted = sortVenuesByDistance(venues, 10.96854, -74.78132);
    expect(sorted[0].id).toBe("near");
    expect(sorted[1].id).toBe("mid");
    expect(sorted[2].id).toBe("far");
  });

  it("agrega distanceKm a cada venue", () => {
    const venues = [{ id: "a", lat: 10.97, lng: -74.78 }];
    const sorted = sortVenuesByDistance(venues, 10.96854, -74.78132);
    expect(sorted[0].distanceKm).toBeGreaterThan(0);
    expect(sorted[0].distanceKm).toBeLessThan(1);
  });
});
