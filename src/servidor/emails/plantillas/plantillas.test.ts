import { describe, expect, it } from "vitest";
import { EJEMPLOS } from "./ejemplos";
import { fechasEmail } from "./fechas";
import { renderizarEmail, type DatosEmail, type Idioma } from "./index";

const IDIOMAS: Idioma[] = ["es", "va"];
const TIPOS = Object.keys(EJEMPLOS) as (keyof typeof EJEMPLOS)[];

/** Todo lo que ve la familia: asunto, HTML y texto plano. */
const todo = (r: { asunto: string; html: string; texto: string }) =>
  `${r.asunto}\n${r.html}\n${r.texto}`;

describe("renderizarEmail: cada tipo en cada idioma", () => {
  for (const idioma of IDIOMAS) {
    for (const tipo of TIPOS) {
      it(`${tipo} · ${idioma}`, async () => {
        const datos = EJEMPLOS[tipo] as DatosEmail;
        const r = await renderizarEmail(idioma, datos);

        expect(r.asunto.length).toBeGreaterThan(5);
        expect(r.asunto.length).toBeLessThanOrEqual(70);
        expect(r.html).toMatch(/^<!DOCTYPE html/i);
        expect(r.html).toContain(`lang="${idioma === "va" ? "ca-ES-valencia" : "es-ES"}"`);

        if ("enlace" in datos) {
          expect(r.html).toContain(`href="${datos.enlace}"`);
          expect(r.texto).toContain(datos.enlace);
        }

        // Pie: AFA, privacidad, logo y mascotas (versiones ligeras para email).
        expect(r.html).toContain('href="https://fotos.afalaspalmeras.es/privacidad"');
        expect(r.texto).toContain("https://fotos.afalaspalmeras.es/privacidad");
        expect(r.html).toContain("https://fotos.afalaspalmeras.es/marca/logo-email.png");
        expect(r.html).toContain("https://fotos.afalaspalmeras.es/marca/mascotas-email.png");
        expect(r.texto).toContain("AFA CEI Las Palmeras");

        // Solo la primera palabra del nombre del adulto, y ningún hueco sin rellenar.
        expect(r.texto).toContain("Hola, Marta:");
        expect(todo(r)).not.toMatch(/García|Ruiz/);
        expect(todo(r)).not.toMatch(/undefined|null|NaN|\[object/);
        expect(r.texto).not.toMatch(/<[a-z]/i);
      });
    }
  }
});

describe("fechas en hora de Madrid", () => {
  it("resultado: inicio 15:35 UTC → lunes 2 a las 16:35", async () => {
    const es = await renderizarEmail("es", EJEMPLOS.resultado);
    expect(es.asunto).toContain("lunes 2 a las 16:35");
    expect(es.texto).toContain("lunes 2 a las 16:35");
    // La hora es definitiva: el email ya no ofrece cambiarse hasta el fin de los cambios.
    expect(es.texto).toContain("Esta es vuestra hora definitiva.");
    expect(es.texto).not.toContain("domingo 1 a las 20:00");
    expect(es.html).toContain("16:35");
    expect(es.html).toContain("Lunes 2 de noviembre");

    const va = await renderizarEmail("va", EJEMPLOS.resultado);
    expect(va.asunto).toContain("dilluns 2 a les 16:35");
    expect(va.texto).toContain("Aquesta és la vostra hora definitiva.");
    expect(va.texto).not.toContain("diumenge 1 a les 20:00");
    expect(va.html).toContain("Dilluns 2 de novembre");
  });

  it("alta: cierre, día del reparto y caducidad", async () => {
    const es = await renderizarEmail("es", EJEMPLOS.alta);
    expect(es.texto).toContain("hasta el martes 27 a las 21:00");
    expect(es.texto).toContain("El miércoles 28 os escribimos con la vuestra");
    expect(es.texto).toContain("caduca el 1 de noviembre a las 20:00");
    expect(es.texto).toMatch(/Total orientativo: 54\s€/);

    const va = await renderizarEmail("va", EJEMPLOS.alta);
    expect(va.texto).toContain("fins al dimarts 27 a les 21:00");
    expect(va.texto).toContain("El dimecres 28 us escriurem amb la vostra");
    expect(va.texto).toContain("caduca l'1 de novembre a les 20:00");
  });

  it("movidos: martes 3 a las 19:55", async () => {
    const es = await renderizarEmail("es", EJEMPLOS.movidos);
    expect(es.texto).toContain("El AFA ha cambiado vuestra hora: ahora es el martes 3 a las 19:55");
    const va = await renderizarEmail("va", EJEMPLOS.movidos);
    expect(va.texto).toContain("L'AFA ha canviat la vostra hora: ara és el dimarts 3 a les 19:55");
  });

  it("a la una se dice «a la 1:00»; el 11, «l'11» en valenciano", () => {
    expect(fechasEmail("es", "Europe/Madrid").diaYHora("2026-11-02T00:30:00Z")).toBe(
      "lunes 2 a la 1:30",
    );
    expect(fechasEmail("va", "Europe/Madrid").elDiaMesYHora("2026-11-11T10:00:00Z")).toBe(
      "l'11 de novembre a les 11:00",
    );
    expect(fechasEmail("va", "Europe/Madrid").elDiaMesYHora("2026-10-28T10:00:00Z")).toBe(
      "el 28 d'octubre a les 11:00",
    );
  });
});

describe("contenido según los datos", () => {
  it("alta con 1 peque, sin hermanos ni archivo digital", async () => {
    const r = await renderizarEmail("es", {
      ...EJEMPLOS.alta,
      peques: 1,
      hermanos: 0,
      lotes: 1,
      archivoDigital: false,
      total: 30,
    });
    expect(r.texto).toContain("- 1 peque de la escuela");
    expect(r.texto).toContain("- 1 lote\n");
    expect(r.texto).not.toMatch(/hermano|archivo digital/);
  });

  it("resultado según la categoría", async () => {
    const r = (categoria: (typeof EJEMPLOS.resultado)["categoria"], pos: number | null) =>
      renderizarEmail("es", { ...EJEMPLOS.resultado, categoria, posicionFavorita: pos });

    expect((await r("favorita", 2)).texto).toContain("¡Vuestra 2ª favorita!");
    expect((await r("favorita", null)).texto).toContain("¡Una de vuestras favoritas!");
    expect((await r("nos_va_bien", null)).texto).toContain("no ha podido ser ninguna");
    expect((await r("imposible", null)).texto).toContain(
      "No ha habido forma de evitar una de vuestras horas imposibles: había más familias que huecos posibles. Si no podéis venir, escribid al AFA y lo hablamos.",
    );
    expect((await r("sin_favoritas", null)).texto).toContain("no marcasteis favoritas");
    expect((await r("nos_va_bien", null)).texto).not.toContain("favorita!");

    const va = await renderizarEmail("va", { ...EJEMPLOS.resultado, posicionFavorita: 1 });
    expect(va.texto).toContain("La vostra 1a favorita!");
  });

  it("cancelación: «volver a apuntaros» solo si se puede", async () => {
    const si = await renderizarEmail("es", EJEMPLOS.cancelacion);
    expect(si.texto).toContain("podéis volver a apuntaros hasta el martes 27 a las 21:00");
    const no = await renderizarEmail("es", { ...EJEMPLOS.cancelacion, sePuedeVolver: false });
    expect(no.texto).not.toMatch(/volver a apuntaros|21:00/);
    const noVa = await renderizarEmail("va", { ...EJEMPLOS.cancelacion, sePuedeVolver: false });
    expect(noVa.texto).not.toMatch(/tornar a apuntar|21:00/);
  });

  it("escapa el nombre y saluda sin nombre si viene vacío", async () => {
    const raro = await renderizarEmail("es", {
      ...EJEMPLOS.enlace_nuevo,
      nombre: '<b>"Ana"</b> López',
    });
    expect(raro.html).not.toContain('<b>"Ana"</b>');
    expect(raro.html).toContain("&lt;b&gt;");
    expect(raro.html).not.toContain("López");

    const vacio = await renderizarEmail("va", { ...EJEMPLOS.enlace_nuevo, nombre: "   " });
    expect(vacio.texto).toContain("Hola:");
  });

  it("acepta urlApp con barra final", async () => {
    const r = await renderizarEmail("es", {
      ...EJEMPLOS.cancelacion,
      urlApp: "https://fotos.afalaspalmeras.es/",
    });
    expect(r.texto).toContain("https://fotos.afalaspalmeras.es/privacidad");
    expect(r.texto).not.toContain("es//");
  });
});
