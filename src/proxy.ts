import { NextResponse, type NextRequest } from "next/server";

/**
 * Cabeceras de seguridad en cada página: CSP con nonce (los scripts de Next lo llevan solos),
 * HSTS, sin marcos y, en `/i/*`, `Referrer-Policy: no-referrer` para que el token del enlace de
 * acceso no salga nunca hacia otro sitio.
 */
export function proxy(request: NextRequest) {
  // Primera barrera del panel (la de verdad está en cada página, acción y ruta): sin cookie, a entrar.
  const ruta = request.nextUrl.pathname;
  if (
    ruta.startsWith("/admin") &&
    ruta !== "/admin/entrar" &&
    !request.cookies.has("sesion_admin")
  ) {
    return NextResponse.redirect(new URL("/admin/entrar", request.url));
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const desarrollo = process.env.NODE_ENV === "development";
  const turnstile = "https://challenges.cloudflare.com";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${turnstile}${desarrollo ? " 'unsafe-eval'" : ""}`,
    // Motion y next/font escriben estilos en línea.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${turnstile}${desarrollo ? " ws:" : ""}`,
    `frame-src ${turnstile}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const cabecerasPeticion = new Headers(request.headers);
  cabecerasPeticion.set("x-nonce", nonce);
  cabecerasPeticion.set("Content-Security-Policy", csp);
  const respuesta = NextResponse.next({ request: { headers: cabecerasPeticion } });

  respuesta.headers.set("Content-Security-Policy", csp);
  respuesta.headers.set("X-Content-Type-Options", "nosniff");
  respuesta.headers.set("X-Frame-Options", "DENY");
  respuesta.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  respuesta.headers.set(
    "Referrer-Policy",
    request.nextUrl.pathname.startsWith("/i/") ? "no-referrer" : "strict-origin-when-cross-origin",
  );
  if (process.env.VERCEL) {
    respuesta.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  if (request.nextUrl.pathname.startsWith("/i/") || request.nextUrl.pathname.startsWith("/admin")) {
    respuesta.headers.set("Cache-Control", "private, no-store");
    respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return respuesta;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|marca|clases).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
