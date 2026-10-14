import { PDFDocument, type PDFFont, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { agendaCsv, agendaPdf, type FilaAgenda } from "./agenda";
import { partirEnLineas, textoSeguro } from "./texto-pdf";

const Z = "Europe/Madrid";
const lineas = (csv: string) => csv.slice(1).trimEnd().split("\r\n");

function fila(inicio: string, apellido: string, extra: Partial<FilaAgenda> = {}): FilaAgenda {
  return {
    inicio: new Date(inicio),
    apellido,
    peques: [{ nombre: "Lucía", clase: "Osos" }],
    hermanos: 0,
    lotes: 1,
    archivoDigital: false,
    ...extra,
  };
}

/** `n` familias seguidas cada 5 minutos desde `desde` (UTC). */
function familias(n: number, desde: string): FilaAgenda[] {
  const base = new Date(desde).getTime();
  return Array.from({ length: n }, (_, i) =>
    fila(new Date(base + i * 5 * 60_000).toISOString(), `Apellido${i}`, {
      peques:
        i % 7 === 0
          ? [
              { nombre: "Martina", clase: "Patitos" },
              { nombre: "Pau", clase: "Elefantes" },
            ]
          : [{ nombre: "Hugo", clase: "Tigres" }],
      hermanos: i % 5 === 0 ? 1 : 0,
      lotes: 1 + (i % 3),
      archivoDigital: i % 2 === 0,
    }),
  );
}

describe("agendaCsv", () => {
  it("ordena por hora y la muestra en Madrid con el día de la semana", () => {
    const csv = agendaCsv(
      [
        fila("2026-11-03T14:00:00Z", "Soler"),
        fila("2026-11-02T15:35:00Z", "García", {
          peques: [
            { nombre: "Lucía", clase: "Osos" },
            { nombre: "Pau", clase: "Patitos" },
          ],
          hermanos: 2,
          lotes: 3,
          archivoDigital: true,
        }),
        fila("2026-11-02T14:00:00Z", "Ferrer"),
      ],
      Z,
    );
    expect(lineas(csv)).toEqual([
      "Día;Hora;Apellido;Peques;Hermanos;Lotes;Archivo digital",
      "lunes 2;15:00;Ferrer;Lucía (Osos);0;1;No",
      "lunes 2;16:35;García;Lucía (Osos), Pau (Patitos);2;3;Sí",
      "martes 3;15:00;Soler;Lucía (Osos);0;1;No",
    ]);
  });

  it("empieza por el BOM y usa «;» y CRLF", () => {
    const csv = agendaCsv([fila("2026-11-02T15:35:00Z", "Ribes")], Z);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n")[0]).toContain(";");
  });

  it("no saca nada que no sea de la agenda aunque los datos lo traigan", () => {
    const conDatosDeMas = {
      ...fila("2026-11-02T15:35:00Z", "Climent"),
      email: "familia@example.com",
      telefono: "600000000",
      observaciones: "Alergia",
    } as FilaAgenda;
    const csv = agendaCsv([conDatosDeMas], Z);
    expect(csv).not.toMatch(/@|600000000|Alergia/);
  });

  it("protege contra fórmulas y escapa comillas en apellidos y nombres", () => {
    const csv = agendaCsv(
      [
        fila("2026-11-02T15:35:00Z", "=SUMA(1)", {
          peques: [{ nombre: 'Pepa "Peps"', clase: "Osos" }],
        }),
      ],
      Z,
    );
    expect(lineas(csv)[1]).toBe(`lunes 2;16:35;'=SUMA(1);"Pepa ""Peps"" (Osos)";0;1;No`);
  });
});

describe("agendaPdf", () => {
  const opciones = {
    titulo: "Agenda del fotógrafo · Fotos de Navidad 2026",
    zona: Z,
    generadoEn: new Date("2026-10-28T09:30:00Z"),
  };

  it("genera un PDF", async () => {
    const pdf = await agendaPdf(familias(3, "2026-11-02T14:00:00Z"), opciones);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe(opciones.titulo);
  });

  it("cada día empieza en página nueva y un día largo ocupa varias páginas", async () => {
    const filas = [...familias(60, "2026-11-02T14:00:00Z"), ...familias(2, "2026-11-03T14:00:00Z")];
    const doc = await PDFDocument.load(await agendaPdf(filas, opciones));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it("caben entre 25 y 30 familias de un peque por página", async () => {
    const paginas = async (n: number) =>
      (
        await PDFDocument.load(await agendaPdf(familias(n, "2026-11-02T14:00:00Z"), opciones))
      ).getPageCount();
    const soloUnPeque = (n: number) =>
      familias(n, "2026-11-02T14:00:00Z").map((f) => ({ ...f, peques: f.peques.slice(0, 1) }));
    const paginasUnPeque = async (n: number) =>
      (await PDFDocument.load(await agendaPdf(soloUnPeque(n), opciones))).getPageCount();
    expect(await paginasUnPeque(25)).toBe(1);
    expect(await paginasUnPeque(31)).toBe(2);
    expect(await paginas(120)).toBeLessThanOrEqual(5);
  });

  it("sin familias genera una página que lo dice", async () => {
    const doc = await PDFDocument.load(await agendaPdf([], opciones));
    expect(doc.getPageCount()).toBe(1);
  });

  it("no lanza con nombres raros", async () => {
    const raros = [
      fila("2026-11-02T14:00:00Z", "Muñoz 🎄", {
        peques: [
          { nombre: "Ñandú 👶🏽", clase: "Pingüinos" },
          { nombre: "Col·laboració Paŀla «Lali»", clase: "Osos" },
        ],
      }),
      fila("2026-11-02T14:05:00Z", '"Comillas" ‘simples’ “dobles”', {
        peques: [{ nombre: "李小龍 Олег 👨‍👩‍👧", clase: "Ardillas" }],
      }),
      fila(
        "2026-11-02T14:10:00Z",
        "Unapalabrasinespaciosmuchisimomaslargaquelacolumnadelafamilia",
        {
          peques: [{ nombre: "Tab\tsalto\nlínea", clase: "Delfines" }],
        },
      ),
    ];
    const pdf = await agendaPdf(raros, opciones);
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe("%PDF");
  });
});

describe("textoSeguro", () => {
  let fuente: PDFFont;
  beforeAll(async () => {
    fuente = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  });

  it("conserva lo que Helvetica sabe escribir", () => {
    expect(textoSeguro("Ñúñez Col·lecció «€» “x” – ç", fuente)).toBe(
      "Ñúñez Col·lecció «€» “x” – ç",
    );
  });

  it("sustituye la ela geminada de una pieza, quita emojis y marca lo demás con «?»", () => {
    expect(textoSeguro("Paŀla", fuente)).toBe("Pal·la");
    expect(textoSeguro("Hugo 🎄 👨‍👩‍👧 👶🏽", fuente)).toBe("Hugo");
    expect(textoSeguro("Zoë Erdős 李", fuente)).toBe("Zoë Erdos ?");
    expect(() => fuente.encodeText(textoSeguro("Ŀ ő 🙂 Олег", fuente))).not.toThrow();
  });

  it("parte en líneas lo que no cabe, incluso una palabra sola", () => {
    const lineas = partirEnLineas("Lucía (Osos) Martina (Patitos)", fuente, 10, 80);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(fuente.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(80);
    const largas = partirEnLineas("a".repeat(100), fuente, 10, 50);
    expect(largas.join("")).toBe("a".repeat(100));
  });
});
