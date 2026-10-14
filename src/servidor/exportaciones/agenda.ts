import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { aCsv, siNo } from "./csv";
import { diaCorto, diaLargo, fechaEnZona, fechaHoraLarga, horaEnZona } from "./formato";
import { partirEnLineas, textoSeguro } from "./texto-pdf";

/**
 * Agenda del fotógrafo: quién viene a cada hueco. Por privacidad NUNCA lleva email, teléfono ni
 * observaciones: ni siquiera llegan aquí.
 */
export type FilaAgenda = {
  /** Inicio del hueco (UTC). */
  inicio: Date;
  /** Apellidos del primer peque: es como el fotógrafo llama a la familia. */
  apellido: string;
  /** `clase` es el nombre de la clase («Osos»). */
  peques: { nombre: string; clase: string }[];
  /** Hermanos externos. */
  hermanos: number;
  lotes: number;
  archivoDigital: boolean;
};

const porApellido = new Intl.Collator("es", { sensitivity: "base" });

function ordenar(filas: FilaAgenda[]): FilaAgenda[] {
  return [...filas].sort(
    (a, b) =>
      a.inicio.getTime() - b.inicio.getTime() || porApellido.compare(a.apellido, b.apellido),
  );
}

/** «Lucía (Osos)» */
const pequeConClase = (p: FilaAgenda["peques"][number]) => `${p.nombre} (${p.clase})`;

// ─── CSV ───────────────────────────────────────────────────────────────────────

const CABECERA_CSV = ["Día", "Hora", "Apellido", "Peques", "Hermanos", "Lotes", "Archivo digital"];

/** Agenda en CSV ordenada por hora, con el día y la hora en la zona de la edición. */
export function agendaCsv(filas: FilaAgenda[], zona: string): string {
  return aCsv(
    CABECERA_CSV,
    ordenar(filas).map((f) => [
      diaCorto(f.inicio, zona),
      horaEnZona(f.inicio, zona),
      f.apellido,
      f.peques.map(pequeConClase).join(", "),
      f.hermanos,
      f.lotes,
      siNo(f.archivoDigital),
    ]),
  );
}

// ─── PDF ───────────────────────────────────────────────────────────────────────

const A4: [number, number] = [595.28, 841.89];
const MARGEN_X = 40;
const MARGEN_SUPERIOR = 44;
/** Por debajo de esta altura va el pie: ninguna fila lo pisa. */
const LIMITE_INFERIOR = 56;
const ANCHO_UTIL = A4[0] - 2 * MARGEN_X;

const COLOR_TITULO = rgb(0x3b / 255, 0x4d / 255, 0x15 / 255);
const COLOR_TEXTO = rgb(0x26 / 255, 0x30 / 255, 0x1a / 255);
const COLOR_SECUNDARIO = rgb(0x6b / 255, 0x70 / 255, 0x5c / 255);
const COLOR_SOMBREADO = rgb(0xff / 255, 0xf8 / 255, 0xec / 255);
const COLOR_FILETE = rgb(0xe6 / 255, 0xdf / 255, 0xcc / 255);

const TAMANO_CELDA = 9.5;
const INTERLINEA = 11.5;
const RELLENO_V = 5.5;
const RELLENO_H = 5;

type Alineacion = "izquierda" | "centro";
type Columna = { titulo: string; ancho: number; alineacion: Alineacion };

const COLUMNAS: Columna[] = [
  { titulo: "Hora", ancho: 44, alineacion: "izquierda" },
  { titulo: "Familia", ancho: 122, alineacion: "izquierda" },
  {
    titulo: "Peques y clases",
    ancho: ANCHO_UTIL - 44 - 122 - 56 - 42 - 46,
    alineacion: "izquierda",
  },
  { titulo: "Hermanos", ancho: 56, alineacion: "centro" },
  { titulo: "Lotes", ancho: 42, alineacion: "centro" },
  { titulo: "Digital", ancho: 46, alineacion: "centro" },
];

type Fuentes = { normal: PDFFont; negrita: PDFFont };
/** Una celda ya partida en líneas, con su fuente. */
type Celda = { lineas: string[]; negrita: boolean };

function celdasDe(f: FilaAgenda, zona: string, fuentes: Fuentes): Celda[] {
  const partir = (texto: string, fuente: PDFFont, columna: number) =>
    partirEnLineas(
      textoSeguro(texto, fuente),
      fuente,
      TAMANO_CELDA,
      COLUMNAS[columna].ancho - 2 * RELLENO_H,
    );
  return [
    { lineas: [horaEnZona(f.inicio, zona)], negrita: true },
    { lineas: partir(f.apellido, fuentes.negrita, 1), negrita: true },
    {
      // Un peque por línea; si alguno no cabe, sigue en la siguiente.
      lineas: f.peques.length
        ? f.peques.flatMap((p) => partir(pequeConClase(p), fuentes.normal, 2))
        : [""],
      negrita: false,
    },
    { lineas: [f.hermanos > 0 ? String(f.hermanos) : "–"], negrita: false },
    { lineas: [String(f.lotes)], negrita: false },
    { lineas: [siNo(f.archivoDigital)], negrita: f.archivoDigital },
  ];
}

const altoDeFila = (celdas: Celda[]) =>
  2 * RELLENO_V + Math.max(...celdas.map((c) => c.lineas.length)) * INTERLINEA;

/** Línea base de la primera línea de texto en una caja que empieza en `arriba`. */
const lineaBase = (arriba: number, tamano: number) => arriba - RELLENO_V - tamano * 0.78;

function escribirCeldas(
  pagina: PDFPage,
  celdas: { lineas: string[]; fuente: PDFFont; color?: ReturnType<typeof rgb> }[],
  arriba: number,
  tamano: number,
) {
  let x = MARGEN_X;
  celdas.forEach((celda, i) => {
    const columna = COLUMNAS[i];
    celda.lineas.forEach((linea, n) => {
      const ancho = celda.fuente.widthOfTextAtSize(linea, tamano);
      pagina.drawText(linea, {
        x: columna.alineacion === "centro" ? x + (columna.ancho - ancho) / 2 : x + RELLENO_H,
        y: lineaBase(arriba, tamano) - n * INTERLINEA,
        size: tamano,
        font: celda.fuente,
        color: celda.color ?? COLOR_TEXTO,
      });
    });
    x += columna.ancho;
  });
}

/** Título y subtítulo de la página; devuelve dónde empieza lo siguiente. */
function escribirTitulo(
  pagina: PDFPage,
  titulo: string,
  subtitulo: string,
  fuentes: Fuentes,
): number {
  let y = A4[1] - MARGEN_SUPERIOR;
  const seguro = textoSeguro(titulo, fuentes.negrita);
  // Se reduce un poco antes de partirlo en dos líneas.
  let tamano = 14;
  while (tamano > 11.5 && fuentes.negrita.widthOfTextAtSize(seguro, tamano) > ANCHO_UTIL) {
    tamano -= 0.5;
  }
  for (const linea of partirEnLineas(seguro, fuentes.negrita, tamano, ANCHO_UTIL)) {
    y -= tamano;
    pagina.drawText(linea, {
      x: MARGEN_X,
      y,
      size: tamano,
      font: fuentes.negrita,
      color: COLOR_TITULO,
    });
    y -= 4;
  }
  y -= 10;
  pagina.drawText(textoSeguro(subtitulo, fuentes.normal), {
    x: MARGEN_X,
    y,
    size: 9,
    font: fuentes.normal,
    color: COLOR_SECUNDARIO,
  });
  return y - 12;
}

/** Cabecera de la tabla; devuelve dónde empieza la primera fila. */
function escribirCabecera(pagina: PDFPage, arriba: number, fuentes: Fuentes): number {
  const tamano = 8.5;
  escribirCeldas(
    pagina,
    COLUMNAS.map((c) => ({ lineas: [c.titulo], fuente: fuentes.negrita, color: COLOR_TITULO })),
    arriba,
    tamano,
  );
  const abajo = arriba - 2 * RELLENO_V - INTERLINEA;
  pagina.drawLine({
    start: { x: MARGEN_X, y: abajo },
    end: { x: MARGEN_X + ANCHO_UTIL, y: abajo },
    thickness: 1,
    color: COLOR_TITULO,
  });
  return abajo;
}

function escribirPie(
  pagina: PDFPage,
  numero: number,
  total: number,
  generada: string,
  fuentes: Fuentes,
) {
  const tamano = 7.5;
  pagina.drawLine({
    start: { x: MARGEN_X, y: 40 },
    end: { x: MARGEN_X + ANCHO_UTIL, y: 40 },
    thickness: 0.5,
    color: COLOR_FILETE,
  });
  pagina.drawText("Confidencial: solo para la sesión de fotos. Borrar al entregar las fotos.", {
    x: MARGEN_X,
    y: 29,
    size: tamano,
    font: fuentes.negrita,
    color: COLOR_TEXTO,
  });
  pagina.drawText(textoSeguro(generada, fuentes.normal), {
    x: MARGEN_X,
    y: 19,
    size: tamano,
    font: fuentes.normal,
    color: COLOR_SECUNDARIO,
  });
  const paginaDe = `Página ${numero} de ${total}`;
  pagina.drawText(paginaDe, {
    x: MARGEN_X + ANCHO_UTIL - fuentes.normal.widthOfTextAtSize(paginaDe, tamano),
    y: 29,
    size: tamano,
    font: fuentes.normal,
    color: COLOR_SECUNDARIO,
  });
}

const familias = (n: number) => (n === 1 ? "1 familia" : `${n} familias`);

/**
 * Agenda en PDF (A4 vertical) con una sección por día de sesión: cada día empieza en página nueva
 * y, si no cabe, la cabecera de la tabla se repite en cada página.
 */
export async function agendaPdf(
  filas: FilaAgenda[],
  opciones: { titulo: string; zona: string; generadoEn: Date },
): Promise<Uint8Array> {
  const { titulo, zona, generadoEn } = opciones;
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setLanguage("es-ES");
  pdf.setCreator("AFA CEI Las Palmeras");
  pdf.setCreationDate(generadoEn);
  pdf.setModificationDate(generadoEn);
  const fuentes: Fuentes = {
    normal: await pdf.embedFont(StandardFonts.Helvetica),
    negrita: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const dias = new Map<string, FilaAgenda[]>();
  for (const f of ordenar(filas)) {
    const clave = fechaEnZona(f.inicio, zona);
    dias.set(clave, [...(dias.get(clave) ?? []), f]);
  }

  if (dias.size === 0) {
    const pagina = pdf.addPage(A4);
    escribirTitulo(pagina, titulo, "No hay familias en la agenda.", fuentes);
  }

  for (const filasDia of dias.values()) {
    const primera = filasDia[0].inicio;
    const ultima = filasDia[filasDia.length - 1].inicio;
    const tituloDia = `${titulo} · ${diaLargo(primera, zona)}`;
    const resumen = `${familias(filasDia.length)} · de ${horaEnZona(primera, zona)} a ${horaEnZona(ultima, zona)}`;

    let pagina!: PDFPage;
    let y = 0;
    const paginaNueva = (continuacion: boolean) => {
      pagina = pdf.addPage(A4);
      const arriba = escribirTitulo(
        pagina,
        tituloDia,
        continuacion ? `${resumen} · (continuación)` : resumen,
        fuentes,
      );
      y = escribirCabecera(pagina, arriba, fuentes);
    };
    paginaNueva(false);

    filasDia.forEach((fila, i) => {
      const celdas = celdasDe(fila, zona, fuentes);
      const alto = altoDeFila(celdas);
      if (y - alto < LIMITE_INFERIOR) paginaNueva(true);
      if (i % 2 === 1) {
        pagina.drawRectangle({
          x: MARGEN_X,
          y: y - alto,
          width: ANCHO_UTIL,
          height: alto,
          color: COLOR_SOMBREADO,
        });
      }
      escribirCeldas(
        pagina,
        celdas.map((c) => ({
          lineas: c.lineas,
          fuente: c.negrita ? fuentes.negrita : fuentes.normal,
        })),
        y,
        TAMANO_CELDA,
      );
      y -= alto;
    });
    pagina.drawLine({
      start: { x: MARGEN_X, y },
      end: { x: MARGEN_X + ANCHO_UTIL, y },
      thickness: 0.5,
      color: COLOR_FILETE,
    });
  }

  const paginas = pdf.getPages();
  const generada = `Generada el ${fechaHoraLarga(generadoEn, zona)}`;
  paginas.forEach((p, i) => escribirPie(p, i + 1, paginas.length, generada, fuentes));
  return pdf.save();
}
