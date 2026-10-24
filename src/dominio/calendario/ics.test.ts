import { describe, expect, it } from "vitest";
import { escaparTexto, generarIcs, plegar } from "./ics";

const base = {
  uid: "3f2a9c1e-0000-4000-8000-000000000001@fotos.escuelainfantillaspalmeras.com",
  inicio: new Date("2026-11-02T15:35:00Z"),
  fin: new Date("2026-11-02T15:40:00Z"),
  titulo: "Fotos de Navidad",
  descripcion: "Llegad 5 minutos antes.",
  ahora: new Date("2026-10-28T10:15:30.123Z"),
};

/** Deshace el plegado: un CRLF seguido de espacio es la misma línea lógica. */
const desplegar = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("generarIcs", () => {
  it("genera un VCALENDAR con un VEVENT en UTC y CRLF", () => {
    const ics = generarIcs(base);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);

    const lineas = desplegar(ics);
    expect(lineas[0]).toBe("BEGIN:VCALENDAR");
    expect(lineas).toContain("VERSION:2.0");
    expect(lineas).toContain("PRODID:-//AFA CEI Las Palmeras//Fotos de Navidad//ES");
    expect(lineas).toContain("METHOD:PUBLISH");
    expect(lineas).toContain(`UID:${base.uid}`);
    expect(lineas).toContain("DTSTAMP:20261028T101530Z");
    expect(lineas).toContain("DTSTART:20261102T153500Z");
    expect(lineas).toContain("DTEND:20261102T154000Z");
    expect(lineas).toContain("SUMMARY:Fotos de Navidad");
    expect(lineas).toContain("SEQUENCE:0");
    expect(lineas.at(-2)).toBe("END:VCALENDAR");
    expect(lineas.at(-1)).toBe("");
    expect(lineas.some((l) => l.startsWith("LOCATION") || l.startsWith("URL"))).toBe(false);
  });

  it("lleva dos alarmas: un día antes y una hora antes", () => {
    const ics = generarIcs(base);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.match(/ACTION:DISPLAY/g)).toHaveLength(2);
  });

  it("incluye lugar, URL y secuencia si se dan", () => {
    const lineas = desplegar(
      generarIcs({
        ...base,
        lugar: "CEI Las Palmeras, Valencia",
        url: "https://fotos.escuelainfantillaspalmeras.com/i/abc_DEF-123",
        secuencia: 2,
      }),
    );
    expect(lineas).toContain("LOCATION:CEI Las Palmeras\\, Valencia");
    expect(lineas).toContain("URL:https://fotos.escuelainfantillaspalmeras.com/i/abc_DEF-123");
    expect(lineas).toContain("SEQUENCE:2");
  });

  it("escapa comas, puntos y coma, barras invertidas y saltos de línea", () => {
    expect(escaparTexto("a,b;c\\d\ne\r\nf")).toBe("a\\,b\\;c\\\\d\\ne\\nf");
    const lineas = desplegar(generarIcs({ ...base, descripcion: "Hola; adiós,\nhasta luego" }));
    expect(lineas).toContain("DESCRIPTION:Hola\\; adiós\\,\\nhasta luego");
  });

  it("es determinista con el mismo `ahora`", () => {
    expect(generarIcs(base)).toBe(generarIcs({ ...base }));
  });

  it("rechaza una cita que no termina después de empezar", () => {
    expect(() => generarIcs({ ...base, fin: base.inicio })).toThrow();
  });
});

describe("plegar", () => {
  const octetos = (s: string) => new TextEncoder().encode(s).length;

  it("no toca las líneas cortas", () => {
    expect(plegar("SUMMARY:Fotos")).toBe("SUMMARY:Fotos");
    const justa = "X".repeat(75);
    expect(plegar(justa)).toBe(justa);
  });

  it("parte en 75 octetos y las continuaciones empiezan por espacio", () => {
    const larga = "DESCRIPTION:" + "a".repeat(200);
    const partes = plegar(larga).split("\r\n");
    expect(partes.length).toBeGreaterThan(1);
    for (const [i, p] of partes.entries()) {
      expect(octetos(p)).toBeLessThanOrEqual(75);
      if (i > 0) expect(p.startsWith(" ")).toBe(true);
    }
    expect(partes.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(larga);
  });

  it("no parte caracteres de varios octetos", () => {
    const larga = "DESCRIPTION:" + "ñàé€🎄".repeat(40);
    const partes = plegar(larga).split("\r\n");
    for (const p of partes) {
      expect(octetos(p)).toBeLessThanOrEqual(75);
      expect(p).not.toContain("�");
    }
    expect(partes.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(larga);
  });

  it("pliega también las líneas del .ics completo", () => {
    const ics = generarIcs({ ...base, descripcion: "Llegad 5 minutos antes. ".repeat(10) });
    for (const l of ics.split("\r\n")) expect(octetos(l)).toBeLessThanOrEqual(75);
  });
});
