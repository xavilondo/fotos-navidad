# Verificación del sorteo

Guía para la persona verificadora del AFA: cómo reproducir el sorteo de las fotos de Navidad y comprobar que el resultado publicado es exactamente el que sale de la lista cerrada y del número de la ONCE.

Versión del algoritmo: **`reparto-v1.0`**. El código está en `src/dominio/reparto/` y el comando de verificación en `scripts/reparto-verificar.ts`.

## 1. Qué recibes y qué compruebas

Recibes del admin el **archivo exportado** del panel:

```json
{ "lista": { …la lista canónica… }, "exclusiones": [{ "id": "…", "motivo": "Inscripción duplicada" }] }
```

Necesitas además el **número del Cupón Diario de la ONCE** del día del cierre, que consultas tú en la web oficial.

Compruebas tres cosas:

1. Que la **huella** que calcula el comando es la que se publicó al cerrar la inscripción (en la web y en el WhatsApp del AFA), antes de conocerse el número. Así sabes que la lista no se ha tocado después.
2. Que el **número de la ONCE** es el oficial.
3. Que la **huella del resultado** y las **estadísticas** coinciden con las publicadas en la página del sorteo.

Si las tres coinciden, el reparto publicado es el que dicta el algoritmo, sin margen para nadie.

## 2. Cómo usar el comando

Con Node 22 y pnpm, desde la raíz del repositorio (`pnpm install` la primera vez):

```sh
pnpm reparto:verificar exportacion.json 48213
pnpm reparto:verificar lista.json 48213 exclusiones.json
pnpm reparto:verificar exportacion.json 48213 --asignaciones
```

- El primer argumento es la lista canónica sola o el archivo exportado (el comando distingue las dos formas).
- El segundo es el número de la ONCE **tal cual** (cinco cifras, con los ceros a la izquierda: `04821`, no `4821`). Si no tiene cinco cifras, el comando avisa pero lo usa igual.
- El tercero, opcional, son las exclusiones si no vienen en el archivo exportado: `[{ "id", "motivo" }]` o `["id", …]`.
- `--asignaciones` imprime además la tabla id → hueco (solo ids aleatorios, sin datos personales).

Imprime la huella, la semilla, la versión, las estadísticas y la huella del resultado. Puedes probarlo con los ejemplos del repositorio:

```sh
pnpm reparto:verificar docs/ejemplos/lista-ejemplo.json 48213 --asignaciones
pnpm reparto:verificar docs/ejemplos/exportacion-ejemplo.json 48213
```

El comando rechaza una lista que no esté en su forma canónica (por ejemplo, inscripciones desordenadas) o que no sea coherente (franjas desconocidas, repetidas, más de 6 favoritas…).

## 3. Paso a paso

### 3.1 Lista canónica

```json
{
  "edicion": "navidad-2026",
  "version": 1,
  "franjas": [{ "codigo": "lun-1500", "huecos": 6 }, …],
  "inscripciones": [{ "id": "<uuid>", "favoritas": ["lun-1700", "mar-1730"], "imposibles": ["lun-1500"] }, …]
}
```

- `franjas` va en **orden cronológico**. `huecos` cuenta solo los huecos **libres** (no bloqueados). Una franja puede tener 0 huecos libres: sigue en la lista (las familias pueden haberla marcado), pero no se puede asignar.
- `inscripciones` va **ordenada por `id`**. Cada una tiene hasta 6 `favoritas` **en su orden** (1ª, 2ª…) y hasta 10 `imposibles`, **ordenadas**. Una franja no puede ser favorita e imposible a la vez, ni repetirse.
- «Ordenar» es comparar cadenas por unidades de código UTF-16 (el orden por defecto de JavaScript). Para ids y códigos en ASCII, como los nuestros, es el orden de bytes y coincide con el `sorted()` de Python.
- No hay nombres, emails ni nada personal: solo un id aleatorio y las preferencias.

### 3.2 Huella

La huella es el **SHA-256 en hexadecimal** (minúsculas) de los bytes UTF-8 del **JSON canónico** de la lista: claves de los objetos ordenadas (por unidades de código UTF-16), sin espacios, los arrays en su orden, cadenas y números escritos como en `JSON.stringify`. Para estos datos coincide con el estándar RFC 8785 (JCS) y con `json.dumps(lista, sort_keys=True, separators=(",", ":"), ensure_ascii=False)` de Python.

La lista **completa** es la que se resume en la huella, incluidas las inscripciones que luego se excluyan.

### 3.3 Semilla

```
semilla = SHA-256( huella_hex + ":" + numeroOnce )   (bytes UTF-8, resultado en hex)
```

Por ejemplo, `SHA-256("3bedb570…ae94e:48213")`.

### 3.4 Flujo de aleatoriedad

Toda la suerte del sorteo sale de un único flujo determinado por la semilla:

- **Bloques**: `bloque_c = SHA-256( semillaBytes ‖ uint32be(c) )` para `c = 0, 1, 2…`, donde `semillaBytes` son los **32 bytes** que representa la semilla hex (no el texto) y `uint32be(c)` son 4 bytes big-endian.
- Cada bloque de 32 bytes da **8 enteros uint32** big-endian, en orden. El flujo es la concatenación de todos.
- **Entero uniforme en [0, n)**, por rechazo: `límite = 2^32 − (2^32 mod n)`; se lee el siguiente uint32 `x`; si `x ≥ límite` se descarta y se lee otro; si no, el resultado es `x mod n`. Siempre consume al menos un uint32.
- **Permutación** (Fisher–Yates) de una lista `a` de longitud `n`: para `i = n − 1` hasta `1`, `j = uniforme(i + 1)` (un entero en [0, i]) e intercambiar `a[i]` y `a[j]`. Una lista de 0 o 1 elementos no consume nada.

El flujo se usa **siempre en este orden**:

1. **π**: permutación de las inscripciones **del sorteo** (ya sin las excluidas), partiendo del orden de la lista canónica (por id). π es el orden de desempate entre familias.
2. **σ**: permutación de **todas** las franjas de la lista (también las de 0 huecos libres), partiendo del orden cronológico. σ desempata entre franjas del mismo nivel.
3. **Barajado de huecos**: para cada franja con al menos 1 hueco libre, en orden cronológico, una permutación de `[0, 1, …, huecos − 1]`. Se baraja **toda** franja con huecos libres, aunque nadie acabe en ella, para que lo consumido no dependa del resultado.

### 3.5 Niveles

Para una familia con `k` favoritas (0 a 6), el nivel de cada franja es:

| Franja                                   | Nivel   |
| ---------------------------------------- | ------- |
| su favorita en la posición `p`           | `p`     |
| ni favorita ni imposible («nos va bien») | `k + 1` |
| hora imposible                           | `8`     |

El «nos va bien» va justo después de la última favorita (**regla antitruco**): marcar una sola favorita no da ventaja, porque perderla te deja en nivel 2. Una familia sin favoritas está a nivel 1 en toda franja que no sea imposible.

### 3.6 Paso 1: el mejor reparto posible (leximin)

Se busca un reparto de franjas (cada inscripción a una franja con huecos libres, sin pasarse de su capacidad) que minimice, por este orden, cuántas familias quedan en nivel 8, luego en nivel 7, …, hasta nivel 1.

Equivale a un **flujo de coste mínimo** fuente → inscripción (capacidad 1) → franja (capacidad = huecos libres) → sumidero, con coste `B^(nivel − 1)` por inscripción, donde `B = nº de inscripciones del sorteo + 1`. Como en ningún nivel puede haber `B` familias, minimizar la suma es minimizar el vector (nº en nivel 8, nº en nivel 7, …). Se calcula con enteros exactos (BigInt). El coste mínimo es **C\***.

Si hay más inscripciones (sin las excluidas) que huecos libres, no hay reparto: el sorteo no se puede lanzar.

### 3.7 Paso 2: desempate

Suele haber muchos repartos con coste C\*. Para elegir uno:

> Para cada inscripción **en orden π**, se recorren sus franjas con huecos libres ordenadas por (**nivel** ascendente, **posición en σ**), y se le **fija la primera** con la que todavía existe un reparto de coste C\* que respete todo lo fijado antes.

El resultado (qué franja tiene cada inscripción) es único.

La forma ingenua de hacerlo es recalcular un flujo de coste mínimo completo por cada prueba. El código hace una comprobación equivalente mucho más rápida: dado un reparto óptimo, existe otro óptimo con la inscripción `i` en la franja `f` si y solo si el ciclo más barato del grafo residual que mueve `i` a `f` (y reacomoda a otras familias no fijadas) cuesta 0. Los tests comprueban que da **exactamente** lo mismo que la versión ingenua y que una fuerza bruta que aplica la definición de arriba al pie de la letra (`src/dominio/reparto/optimo.test.ts` y `reparto.test.ts`).

### 3.8 Paso 3: huecos

Dentro de cada franja, sus inscripciones, **en orden π**, reciben los huecos en el orden del barajado de esa franja: la primera recibe el primer número del barajado, la segunda el segundo, etc.

El hueco se escribe `codigoFranja.i`, donde `i` es el índice (desde 0) del hueco **libre** dentro de su franja en orden cronológico, sin contar los bloqueados. Por ejemplo, si en `lun-1730` están bloqueados los huecos de 17:30 y 17:35, `lun-1730.0` es el de las 17:40. La app traduce ese índice a la hora real.

### 3.9 Huella del resultado

```
huellaResultado = SHA-256( JSON canónico de [{ "id": …, "hueco": … }, …] ordenado por id )
```

Resume quién tiene cada hueco sin publicarlo.

### 3.10 Exclusiones

Si tras el cierre hay que quitar una inscripción (un duplicado, una baja), no se edita la lista: se registra una exclusión (id + motivo). Las exclusiones se quitan **antes de todo** (antes de calcular π): las excluidas no consumen aleatoriedad, no cuentan en `B` ni en las estadísticas. La **huella sigue siendo la de la lista completa**, la que se publicó. Un id excluido que no esté en la lista es un error.

### 3.11 Estadísticas

- **Por nivel**: cuántas familias quedan en cada nivel 1…8.
- **Por preferencia**, según lo que le tocó a cada familia: su 1ª…6ª favorita, «nos va bien», hora imposible, y «sin favoritas» para las familias que no marcaron ninguna y no cayeron en una imposible.
- **Con favorita**: familias que marcaron alguna favorita y les tocó una; sobre el total de las que marcaron alguna.

## 4. Ejemplo resuelto (vectores fijos)

Estos valores son «golden tests» (`src/dominio/reparto/golden.test.ts`) y se han reproducido con una implementación independiente en Python. Si tu cálculo da lo mismo, entiendes el algoritmo.

Lista (`docs/ejemplos/lista-ejemplo.json`), con número de la ONCE `48213`:

| id      | favoritas (en orden)         | imposibles         |
| ------- | ---------------------------- | ------------------ |
| `1b9d…` | lun-1700, lun-1730           | mar-1700           |
| `6ec0…` | lun-1700                     | —                  |
| `9f1c…` | —                            | lun-1730           |
| `c3a5…` | lun-1800, lun-1700, mar-1700 | —                  |
| `e2d4…` | mar-1700, lun-1730           | lun-1700, lun-1800 |

Franjas: `lun-1700` (2 huecos libres), `lun-1730` (1), `lun-1800` (0), `mar-1700` (3).

**JSON canónico** (una sola línea, aquí partida):

```
{"edicion":"ejemplo-2026","franjas":[{"codigo":"lun-1700","huecos":2},{"codigo":"lun-1730","huecos":1},
{"codigo":"lun-1800","huecos":0},{"codigo":"mar-1700","huecos":3}],"inscripciones":[{"favoritas":["lun-1700",
"lun-1730"],"id":"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed","imposibles":["mar-1700"]},…],"version":1}
```

| Valor                       | Resultado                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Huella                      | `3bedb5703ebf6a2355d084732fbda589e3c7fffb9ee8b3beb410b3a9876ae94e`                                                    |
| Semilla (con `48213`)       | `cfa2c723c118d7fa0d04a319c5d9fc1020d7da8751dbb400d71e6cb1460084a8`                                                    |
| Primeros 10 uint32          | 1643086374, 2903682444, 265208887, 1007551742, 1132955599, 1235130495, 1871421258, 3005936517, 3104238532, 3158854088 |
| Huella del resultado        | `ed157a82e7b9326b5d3df103a0ea44b7edc6b98db20dcae07b837cd80beb7042`                                                    |
| Con la exclusión de `6ec0…` | `7ff231f2b62b6e9fb7868f15035760ec7a35e1801b1ed8ca3ac142010eeeff96`                                                    |

**Uso del flujo** (aquí ningún uint32 se rechaza; se consumen exactamente los 10 de la tabla):

- π, partiendo de `[0, 1, 2, 3, 4]` (las inscripciones por id): `i=4`: 1643086374 mod 5 = 4, nada · `i=3`: 2903682444 mod 4 = 0, intercambia 3↔0 · `i=2`: 265208887 mod 3 = 1, intercambia 2↔1 · `i=1`: 1007551742 mod 2 = 0, intercambia 1↔0. **π = [2, 3, 1, 0, 4]**: `9f1c`, `c3a5`, `6ec0`, `1b9d`, `e2d4`.
- σ, partiendo de `[0, 1, 2, 3]`: 1132955599 mod 4 = 3 · 1235130495 mod 3 = 0 · 1871421258 mod 2 = 0. **σ = [1, 2, 0, 3]**: lun-1730, lun-1800, lun-1700, mar-1700.
- Barajados: `lun-1700` → 3005936517 mod 2 = 1 → **[0, 1]**; `lun-1730` → **[0]** (no consume); `mar-1700` → 3104238532 mod 3 = 1, luego 3158854088 mod 2 = 0 → **[2, 0, 1]**.

**Niveles** (lun-1800 no tiene huecos libres):

| id     | lun-1700 | lun-1730               | mar-1700 |
| ------ | -------- | ---------------------- | -------- |
| `1b9d` | 1        | 2                      | 8        |
| `6ec0` | 1        | 2 («nos va bien», k=1) | 2        |
| `9f1c` | 1        | 8                      | 1        |
| `c3a5` | 2        | 4 («nos va bien», k=3) | 3        |
| `e2d4` | 8        | 2                      | 1        |

**Paso 1.** Lo mejor posible es 3 familias en nivel 1 y 2 en nivel 2: `c3a5` tiene que ir a lun-1700 (si no, nivel 3 o peor), y en lun-1700 solo queda un hueco para `1b9d` o `6ec0`; la otra se queda con nivel 2.

**Paso 2**, en orden π:

1. `9f1c`: candidatas lun-1700 y mar-1700 (nivel 1; lun-1700 va antes en σ). Con `9f1c` en lun-1700, `1b9d` y `6ec0` quedarían ambas en nivel 2: ya no es óptimo. Se fija **mar-1700**.
2. `c3a5`: **lun-1700** (nivel 2), la única que mantiene el óptimo.
3. `6ec0`: **lun-1700** (nivel 1): sigue siendo óptimo si `1b9d` va a lun-1730.
4. `1b9d`: lun-1700 ya está llena; **lun-1730** (nivel 2).
5. `e2d4`: **mar-1700** (nivel 1).

**Paso 3**, en orden π: `9f1c` → mar-1700.**2**; `c3a5` → lun-1700.**0**; `6ec0` → lun-1700.**1**; `1b9d` → lun-1730.**0**; `e2d4` → mar-1700.**0**.

Con la exclusión de `6ec0` (archivo `docs/ejemplos/exportacion-ejemplo.json`) la huella y la semilla no cambian, pero π se calcula sobre 4 inscripciones y el reparto cambia: `1b9d` → lun-1700.1, `9f1c` → mar-1700.2, `c3a5` → lun-1700.0, `e2d4` → mar-1700.1.

## 5. Comprobarlo sin este repositorio

La huella, la semilla y el flujo se pueden calcular con cualquier herramienta. En Python 3:

```python
import hashlib, json, sys

lista = json.load(open(sys.argv[1], encoding="utf-8"))
lista = lista.get("lista", lista)  # admite también el archivo exportado
numero_once = sys.argv[2]

canonico = json.dumps(lista, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
huella = hashlib.sha256(canonico.encode("utf-8")).hexdigest()
semilla = hashlib.sha256(f"{huella}:{numero_once}".encode("utf-8")).hexdigest()

def flujo(semilla_hex):
    contador = 0
    while True:
        bloque = hashlib.sha256(bytes.fromhex(semilla_hex) + contador.to_bytes(4, "big")).digest()
        contador += 1
        for k in range(8):
            yield int.from_bytes(bloque[4 * k : 4 * k + 4], "big")

f = flujo(semilla)
print("huella ", huella)
print("semilla", semilla)
print("uint32 ", [next(f) for _ in range(10)])
```

`python3 verificar.py docs/ejemplos/lista-ejemplo.json 48213` imprime los valores de la tabla del apartado 4.

## 6. Rendimiento y límites

El cálculo completo (paso 1, desempate y huecos) con 119 inscripciones y 20 franjas, en el peor caso realista (todas piden las mismas franjas de 17:00 a 18:30), tarda **menos de 20 ms** en un portátil; el test exige menos de 2 s. Crece aproximadamente como `n · (n · m + m³)` (n inscripciones, m franjas): unos 100 ms con 300 inscripciones y 50 franjas, 1 s con 600 y 100, y 8 s con 1.200 y 200. Muy por encima de lo que necesita una edición. La versión ingenua del paso 2 tarda unos 2 s con 119 inscripciones.

## 7. Versiones

Cualquier cambio que altere el resultado para alguna entrada (el JSON canónico, la semilla, el flujo, el orden de uso, los niveles o el desempate) exige una versión nueva (`reparto-v1.1`, …) y actualizar este documento y los vectores fijos. El sorteo guarda la versión con la que se lanzó.
