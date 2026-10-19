import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";
import { LOCALE } from "@/i18n/idioma";
import type { Bloque, ContenidoEmail, Idioma, Trozo } from "./tipos";

/**
 * Plantilla común de los emails, en estilo Álbum ligero: papel crema, tarjeta clara, logo,
 * títulos con serifa y, al pie, las mascotas de las clases y la franja de las estaciones del dossier. Todo con estilos en línea y tablas (los componentes de React Email), para
 * que se vea bien en Gmail, Outlook y Apple Mail.
 *
 * No se cargan fuentes externas (ni Google Fonts): abrir el email no avisa a terceros. Fraunces y
 * Nunito se usan si están instaladas; si no, Georgia y Arial.
 */

const COLOR = {
  crema: "#fff8ec",
  papel: "#fffdf8",
  tinta: "#26301a",
  oliva: "#3b4d15",
  verde: "#2e9a3a",
  /** Verde para texto pequeño: el verde normal no llega a 4,5:1 sobre el papel (como en la app). */
  verdeOscuro: "#1f6e28",
  apagado: "#646b55",
  linea: "#ece3cf",
  veranoSuave: "#fff2cc",
  verano: "#ffd36b",
  primavera: "#a9de7f",
  otono: "#f6a978",
  invierno: "#9fd3e8",
} as const;

/** La franja de las cuatro estaciones del dossier. */
const ESTACIONES = [COLOR.primavera, COLOR.verano, COLOR.otono, COLOR.invierno];

const TITULOS = "Fraunces, Georgia, 'Times New Roman', serif";
const TEXTO = "Nunito, Arial, Helvetica, sans-serif";

const s = {
  body: { backgroundColor: COLOR.crema, margin: 0, padding: "24px 0", fontFamily: TEXTO },
  contenedor: { maxWidth: "560px", margin: "0 auto", padding: "0 12px" },
  tarjeta: {
    backgroundColor: COLOR.papel,
    borderRadius: "28px",
    border: `1px solid ${COLOR.linea}`,
    padding: "28px 28px 24px",
  },
  logo: { margin: "0 auto 8px", display: "block" },
  antetitulo: {
    fontFamily: TEXTO,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: COLOR.verdeOscuro,
    textAlign: "center",
    margin: "0 0 4px",
  },
  titulo: {
    fontFamily: TITULOS,
    fontSize: "30px",
    lineHeight: "1.15",
    fontWeight: 700,
    color: COLOR.oliva,
    textAlign: "center",
    margin: "0 0 20px",
  },
  parrafo: {
    fontFamily: TEXTO,
    fontSize: "16px",
    lineHeight: "1.55",
    color: COLOR.tinta,
    margin: "0 0 14px",
  },
  nota: {
    fontFamily: TEXTO,
    fontSize: "13px",
    lineHeight: "1.5",
    color: COLOR.apagado,
    margin: "0 0 10px",
  },
  enlace: { color: COLOR.oliva, textDecoration: "underline" },
  lista: { margin: "0 0 16px", padding: "4px 0" },
  elemento: {
    fontFamily: TEXTO,
    fontSize: "16px",
    lineHeight: "1.5",
    color: COLOR.tinta,
    margin: "0 0 6px",
  },
  marca: { color: COLOR.verde, fontWeight: 700 },
  destacado: {
    backgroundColor: COLOR.veranoSuave,
    borderRadius: "22px",
    padding: "18px 16px 20px",
    margin: "0 0 16px",
    textAlign: "center",
  },
  destacadoAntetitulo: {
    fontFamily: TEXTO,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.apagado,
    margin: "0",
  },
  destacadoDia: {
    fontFamily: TITULOS,
    fontSize: "22px",
    lineHeight: "1.2",
    fontWeight: 700,
    color: COLOR.oliva,
    margin: "6px 0 0",
  },
  destacadoHora: {
    fontFamily: TITULOS,
    fontSize: "52px",
    lineHeight: "1.05",
    fontWeight: 700,
    color: COLOR.oliva,
    margin: "2px 0 0",
  },
  sello: {
    display: "inline-block",
    backgroundColor: COLOR.verano,
    borderRadius: "999px",
    padding: "8px 18px",
    fontFamily: TITULOS,
    fontSize: "18px",
    fontWeight: 700,
    color: COLOR.tinta,
    margin: "0",
  },
  boton: {
    backgroundColor: COLOR.oliva,
    color: COLOR.papel,
    borderRadius: "999px",
    padding: "15px 28px",
    fontFamily: TITULOS,
    fontSize: "17px",
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-block",
  },
  pie: {
    fontFamily: TEXTO,
    fontSize: "12px",
    lineHeight: "1.5",
    color: COLOR.apagado,
    textAlign: "center",
    margin: "0 0 4px",
  },
} satisfies Record<string, CSSProperties>;

function Trozos({ trozos }: { trozos: Trozo[] }) {
  return trozos.map((t, i) => {
    if (typeof t === "string") return <span key={i}>{t}</span>;
    if ("negrita" in t) return <strong key={i}>{t.negrita}</strong>;
    return (
      <Link key={i} href={t.enlace} style={s.enlace}>
        {t.texto ?? t.enlace}
      </Link>
    );
  });
}

function PintarBloque({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case "parrafo":
      return (
        <Text style={s.parrafo}>
          <Trozos trozos={bloque.trozos} />
        </Text>
      );
    case "nota":
      return (
        <Text style={s.nota}>
          <Trozos trozos={bloque.trozos} />
        </Text>
      );
    case "lista":
      return (
        <Section style={s.lista}>
          {bloque.elementos.map((trozos, i) => (
            <Text key={i} style={s.elemento}>
              <span style={s.marca}>✓</span>&nbsp;&nbsp;
              <Trozos trozos={trozos} />
            </Text>
          ))}
        </Section>
      );
    case "destacado":
      return (
        <Section style={s.destacado}>
          <Text style={s.destacadoAntetitulo}>{bloque.antetitulo}</Text>
          <Text style={s.destacadoDia}>{bloque.secundaria}</Text>
          <Text style={s.destacadoHora}>{bloque.principal}</Text>
        </Section>
      );
    case "sello":
      return (
        <Section style={{ textAlign: "center", margin: "0 0 16px" }}>
          <Text style={s.sello}>{bloque.texto}</Text>
        </Section>
      );
    case "boton":
      return (
        <Section style={{ textAlign: "center", margin: "8px 0 22px" }}>
          <Button href={bloque.url} style={s.boton}>
            {bloque.texto}
          </Button>
        </Section>
      );
  }
}

export function Plantilla({ idioma, contenido }: { idioma: Idioma; contenido: ContenidoEmail }) {
  return (
    <Html lang={LOCALE[idioma]}>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>{contenido.asunto}</title>
      </Head>
      <Preview>{contenido.previa}</Preview>
      <Body style={s.body}>
        <Container style={s.contenedor}>
          <Section style={s.tarjeta}>
            <Img
              src={contenido.logo}
              width="76"
              height="76"
              alt={contenido.pie.afa}
              style={s.logo}
            />
            <Text style={s.antetitulo}>{contenido.antetitulo}</Text>
            <Heading as="h1" style={s.titulo}>
              {contenido.titulo}
            </Heading>
            <Text style={s.parrafo}>{contenido.saludo}</Text>
            {contenido.bloques.map((bloque, i) => (
              <PintarBloque key={i} bloque={bloque} />
            ))}
          </Section>
          <Section style={{ textAlign: "center", padding: "22px 0 0" }}>
            <Img
              src={contenido.mascotas}
              width="360"
              height="51"
              alt=""
              style={{ margin: "0 auto", display: "block", maxWidth: "100%", height: "auto" }}
            />
          </Section>
          <Section style={{ maxWidth: "360px", margin: "10px auto 0" }}>
            <Row>
              {ESTACIONES.map((color, i) => (
                <Column
                  key={color}
                  style={{
                    backgroundColor: color,
                    height: "6px",
                    lineHeight: "6px",
                    fontSize: "1px",
                    width: "25%",
                    borderRadius: i === 0 ? "6px 0 0 6px" : i === 3 ? "0 6px 6px 0" : "0",
                  }}
                >
                  &nbsp;
                </Column>
              ))}
            </Row>
          </Section>
          <Section style={{ padding: "14px 12px 0" }}>
            <Text style={s.pie}>
              <strong>{contenido.pie.afa}</strong>
              {" · "}
              <Link href={contenido.pie.privacidad.url} style={{ color: COLOR.apagado }}>
                {contenido.pie.privacidad.texto}
              </Link>
            </Text>
            <Text style={s.pie}>{contenido.pie.motivo}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
