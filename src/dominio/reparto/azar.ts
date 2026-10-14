import { createHash } from "node:crypto";
import { sha256Hex } from "./canonico";

const DOS_A_LA_32 = 2 ** 32;

/**
 * La semilla pública del sorteo: SHA-256 hex de los bytes UTF-8 de `huella_hex + ":" + numeroOnce`.
 * El número de la ONCE se usa tal cual se escribe (cinco cifras, con los ceros a la izquierda).
 */
export function calcularSemilla(huellaHex: string, numeroOnce: string): string {
  return sha256Hex(`${huellaHex}:${numeroOnce}`);
}

/**
 * El flujo de aleatoriedad del sorteo, determinado solo por la semilla.
 *
 * Bloque `c` (c = 0, 1, 2…) = SHA-256(semillaBytes ‖ uint32be(c)), donde `semillaBytes` son los
 * 32 bytes que representa la semilla hex. Cada bloque da 8 enteros uint32 big-endian, en orden.
 */
export class FlujoAzar {
  private readonly semilla: Buffer;
  private contador = 0;
  private bloque: Buffer = Buffer.alloc(0);
  private posicion = 0;
  /** Cuántos uint32 se han consumido (para documentar y comprobar). */
  consumidos = 0;

  constructor(semillaHex: string) {
    if (!/^[0-9a-f]{64}$/.test(semillaHex)) {
      throw new Error("La semilla debe ser un SHA-256 en hexadecimal (64 caracteres en minúscula)");
    }
    this.semilla = Buffer.from(semillaHex, "hex");
  }

  siguienteUint32(): number {
    if (this.posicion >= this.bloque.length) {
      const c = Buffer.alloc(4);
      c.writeUInt32BE(this.contador++);
      this.bloque = createHash("sha256").update(this.semilla).update(c).digest();
      this.posicion = 0;
    }
    const x = this.bloque.readUInt32BE(this.posicion);
    this.posicion += 4;
    this.consumidos++;
    return x;
  }

  /**
   * Entero uniforme en [0, n) por rechazo: límite = 2^32 − (2^32 mod n); se leen uint32 `x` hasta
   * que `x < límite` y se devuelve `x mod n`. Siempre consume al menos un uint32.
   */
  enteroUniforme(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > DOS_A_LA_32) {
      throw new RangeError(`enteroUniforme: n fuera de rango (${n})`);
    }
    const limite = DOS_A_LA_32 - (DOS_A_LA_32 % n);
    for (;;) {
      const x = this.siguienteUint32();
      if (x < limite) return x % n;
    }
  }

  /**
   * Fisher–Yates: para i = n−1 hasta 1, j = enteroUniforme(i + 1) e intercambia los elementos i y j.
   * Devuelve una copia permutada; no modifica la entrada.
   */
  permutar<T>(elementos: readonly T[]): T[] {
    const a = [...elementos];
    for (let i = a.length - 1; i >= 1; i--) {
      const j = this.enteroUniforme(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
