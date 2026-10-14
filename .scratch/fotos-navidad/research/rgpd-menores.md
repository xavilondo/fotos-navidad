# Requisitos RGPD para datos de menores

Investigación del ticket [11 — Requisitos RGPD para datos de menores](../issues/11-requisitos-rgpd-para-datos-de-menores.md).

**Esto es investigación, no asesoramiento jurídico.** Resume lo que dicen las fuentes primarias y propone requisitos mínimos razonables. Si el AFA tiene dudas sobre un punto concreto, puede consultar a la AEPD o a un profesional.

Fuentes consultadas el **13-10-2026**. Las marcas **[Inferencia]** señalan conclusiones propias que no son texto literal de ninguna fuente.

Abreviaturas y fuentes base:
- **RGPD**: Reglamento (UE) 2016/679. EUR-Lex: <https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679>. EUR-Lex devolvía una página de verificación anti-bots, así que el texto se leyó en la reproducción oficial del DOUE que publica el BOE: <https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807>.
- **LOPDGDD**: Ley Orgánica 3/2018, texto consolidado del BOE: <https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673>.
- **LSSI**: Ley 34/2002, texto consolidado del BOE: <https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758>.
- **Guía AEPD centros**: *Guía para centros educativos*, cap. VI «Tratamiento de datos por las AMPA», pp. 47-49: <https://www.aepd.es/guias/guia-centros-educativos.pdf>.
- **Guía AEPD informar**: *Guía para el cumplimiento del deber de informar*: <https://www.aepd.es/guias/guia-modelo-clausula-informativa.pdf>.
- **Lista EIPD AEPD**: *Listas de tipos de tratamientos que requieren EIPD (art. 35.4)*: <https://www.aepd.es/documento/listas-dpia-es-35-4.pdf>.
- **Guía AEPD contratos**: *Directrices para la elaboración de contratos entre responsables y encargados*: <https://www.aepd.es/guias/guia-directrices-contratos.pdf>.

Contexto: el AFA es una asociación con personalidad jurídica propia. La Guía AEPD centros (p. 47) dice que las AMPA «son responsables de su tratamiento, por lo que deben cumplir con las obligaciones de la normativa de protección de datos». Por tanto, **el responsable es el AFA**, no la escuela.

---

## 1. Base jurídica y quién consiente por los menores de 14 años

**Qué dicen las fuentes**

- RGPD art. 6.1 enumera las bases: a) consentimiento, b) ejecución de un contrato o medidas precontractuales a petición del interesado, f) interés legítimo, «en particular cuando el interesado sea un niño», en cuyo caso pesan más sus derechos.
- **LOPDGDD art. 7.1**: un menor solo puede consentir por sí mismo «cuando sea mayor de catorce años». **Art. 7.2**: si el tratamiento de datos de menores de 14 se basa en el consentimiento, «solo será lícito si consta el del titular de la patria potestad o tutela».
- RGPD art. 8 (16 años, rebajables a 13) solo se aplica a la «oferta directa a niños de servicios de la sociedad de la información». **[Inferencia]** No es este caso: la web se dirige a las familias, no a los peques.
- **Guía AEPD centros, p. 48**, pregunta «¿Necesitan las AMPA obtener el consentimiento…?». Respuesta: depende de si los padres son socios. Si lo son, el tratamiento está amparado «por la relación que vincula al AMPA con sus asociados» y no hace falta consentimiento, aunque sí informar. Si no lo son, «debería obtenerse su consentimiento».
- RGPD art. 7.1: si la base es el consentimiento, el AFA debe poder **demostrar** que se dio. Art. 7.3: se puede retirar en cualquier momento, y retirarlo debe ser «tan fácil» como darlo. Art. 7.4: no se puede condicionar un servicio al consentimiento para datos que **no son necesarios** para ese servicio.
- LOPDGDD art. 6.2: si hay varias finalidades, debe constar que el consentimiento se da para cada una.
- RGPD considerando 32: «el silencio, las casillas ya marcadas o la inacción no deben constituir consentimiento».

**Conclusión**

- El formulario lo usan familias socias y no socias. La forma más sencilla de cumplir la guía de la AEPD para las dos es usar como base el **consentimiento del adulto**, que consiente por sí mismo y, como titular de la patria potestad, por sus peques (RGPD 6.1.a y LOPDGDD 7.2). **[Inferencia]** La casilla obligatoria del paso 5, ya decidida en el ticket 04, encaja: los datos son necesarios para el servicio, así que exigirla no infringe el art. 7.4.
- **[Inferencia]** Una alternativa defendible es el art. 6.1.b: la familia pide un servicio (la inscripción) y el AFA lo presta. Pero la guía AEPD, para no socios, habla de consentimiento, así que se recomienda este.
- Retirar el consentimiento equivale a **cancelar la inscripción**, que ya se hace con el enlace de acceso. Hay que decirlo en el texto informativo (art. 13.2.c).
- Para cualquier finalidad extra, como guardar el resultado para el año siguiente (§4), hace falta un **consentimiento aparte, opcional y sin marcar**: LOPDGDD 6.2 y considerando 32.

---

## 2. Información del art. 13 y cómo darla por capas en el móvil

**Contenido obligatorio (RGPD art. 13.1 y 13.2), en el momento de recoger los datos:**

| Art. | Qué hay que decir | Aplicado a esta app |
|---|---|---|
| 13.1.a | Identidad y contacto del responsable | AFA CEI Las Palmeras, NIF y email |
| 13.1.b | Contacto del DPD, «en su caso» | No aplica (ver §3) |
| 13.1.c | Fines y base jurídica | Organizar la sesión: inscripción, sorteo, cambios de hora y avisos. Base: consentimiento |
| 13.1.e | Destinatarios | El fotógrafo (agenda) y los proveedores técnicos como encargados |
| 13.1.f | Transferencias a terceros países y garantías | EE. UU. (ver §3) |
| 13.2.a | Plazo de conservación o criterios | Ver §4 |
| 13.2.b | Derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad | Ver §6 |
| 13.2.c | Derecho a retirar el consentimiento | «Cancelando la inscripción» |
| 13.2.d | Derecho a reclamar ante la autoridad de control | AEPD, www.aepd.es |
| 13.2.e | Si dar los datos es obligatorio y qué pasa si no | Nombre, email y peques son necesarios. Teléfono y observaciones, opcionales |
| 13.2.f | Decisiones automatizadas del art. 22 y su lógica | El sorteo (ver nota) |

- RGPD art. 12.1 y considerando 58: lenguaje claro y sencillo, «en particular» cuando la información afecta a niños.
- **Nota sobre el sorteo. [Inferencia]** El art. 22.1 se refiere a decisiones automatizadas «que produzcan efectos jurídicos» o afecten «significativamente de modo similar». Asignar una hora entre las que caben todas las familias difícilmente llega a ese umbral. Aun así, explicar la lógica del sorteo en la segunda capa, enlazando a la página de transparencia, cuesta poco y cubre el art. 13.2.f si alguien lo interpretara de otra forma.

**Capas: LOPDGDD art. 11 y Guía AEPD informar**

- **LOPDGDD art. 11.1-2**: se cumple el art. 13 dando una **información básica** y una dirección electrónica «que permita acceder de forma sencilla e inmediata a la restante información». La básica incluye, como mínimo: a) la identidad del responsable, b) la finalidad y c) la posibilidad de ejercer los derechos de los arts. 15 a 22.
- **Guía AEPD informar, §5-6, pp. 5-7**:
  - Recomienda **cinco epígrafes** en la primera capa: Responsable, Finalidad, Legitimación, Destinatarios y Derechos. «Destinatarios» debe aparecer **siempre**, aunque no haya cesiones.
  - Presentación preferente **en tabla**, con el título «Información básica sobre protección de datos», en el **mismo campo de visión que el botón de enviar**. Si el diseño no lo permite, hay que poner una llamada junto al botón que indique dónde está.
  - Es buena práctica que cada epígrafe enlace a su apartado de la segunda capa («+info»).
  - Destinatarios (§7.4, p. 13): «es conveniente informar también de la existencia de Encargados de Tratamiento… especialmente en los casos en que impliquen transferencias a terceros países».
  - Derechos (§7.5, p. 14): hay que explicar «cómo puede el interesado ejercer materialmente estos derechos».
- **[Inferencia] Aplicación al móvil.** La tabla de 5 filas, en versión compacta, va en el **paso 5 (Resumen)**, justo encima de la casilla y del botón «Enviar». Cada fila tiene una línea y un «+info» que abre una hoja inferior (*bottom sheet*) o la página `/privacidad#epigrafe`. La segunda capa es la página `/privacidad`, enlazada también desde el pie de todas las páginas y desde los emails.

---

## 3. Registro de actividades, contratos de encargado y transferencias a EE. UU.

### Registro de actividades de tratamiento (RAT)

- RGPD art. 30.1: cada responsable lleva un registro. Contenido: responsable, fines, categorías de interesados y de datos, destinatarios, transferencias, plazos de supresión y medidas de seguridad.
- RGPD art. 30.5: no obliga a organizaciones de menos de 250 personas, **salvo** que el tratamiento «pueda entrañar un riesgo», «no sea ocasional» o incluya categorías especiales. LOPDGDD art. 31.1 remite a esa misma excepción.
- AEPD, FAQ «¿Estoy obligado a elaborar un RAT?» (<https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/7-registro-de-actividades-de-tratamiento/FAQ-0249-estoy-obligado-a-elaborar-un-rat>): esas excepciones son muy limitadas y «la mayoría de los responsables o encargados del tratamiento que empleen a menos de 250 trabajadores estarán obligadas a llevar un registro».
- **[Inferencia]** Hay datos de menores, y LOPDGDD 28.2.e los cita como factor de mayor riesgo. Por eso el AFA **debe llevar el RAT**. Para este tratamiento basta una ficha de una página. La AEPD ofrece **Facilita RGPD** para tratamientos de escaso riesgo; su FAQ no excluye a los menores, pero avisa de que la documentación generada hay que adaptarla: <https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/3-que-obligaciones-establece-el-rgpd-para-los-responsables/FAQ-0243-sobre-el-uso-de-herramienta-facilita>.

### Delegado de protección de datos y evaluación de impacto

- **DPD: no obligatorio.** RGPD art. 37.1 lo exige a organismos públicos, a quien observe a gran escala y a quien trate a gran escala categorías especiales. LOPDGDD art. 34.1 lista entidades obligadas: incluye los «centros docentes», pero **no las asociaciones de familias**. **[Inferencia]** Ninguno de esos supuestos encaja con el AFA.
- **EIPD.** Según la Lista EIPD AEPD, la EIPD es necesaria «en la mayoría de los casos» en que se cumplen **dos o más** criterios.
  - Se cumple el criterio 9, «datos de menores de 14 años».
  - El criterio 2 se refiere a decisiones automatizadas que impidan «el acceso a un bien o un servicio». **[Inferencia]** El sorteo no impide el acceso, porque todas las familias tienen hueco, así que no se cumple.
  - Con **un solo criterio, la EIPD no es obligatoria** según la lista. LOPDGDD art. 28.1-2 pide igualmente valorar los riesgos. **[Inferencia]** Basta con un análisis de riesgos breve y escrito, que se puede hacer con la herramienta Evalúa-Riesgo RGPD de la AEPD: <https://evalua-riesgo.aepd.es/>.

### Contratos de encargado (RGPD art. 28)

- Art. 28.1 y 28.3: el responsable solo puede usar encargados con garantías suficientes. El tratamiento se rige por un contrato con un contenido mínimo: instrucciones documentadas, confidencialidad, seguridad, subencargados, ayuda con los derechos, borrado o devolución al terminar y auditorías. Art. 28.9: el contrato puede ser electrónico. La Guía AEPD contratos (apdo. 5, p. 4) recuerda que el contrato debe constar por escrito, «inclusive en formato electrónico».
- **[Inferencia]** Aceptar en línea el DPA estándar del proveedor sirve como contrato del art. 28, siempre que ese DPA cubra el plan contratado.

Situación de cada proveedor:

| Proveedor | ¿Cubre el DPA el plan previsto? | Rol | Transferencias |
|---|---|---|---|
| **Vercel** | **No está claro en Hobby.** Los Terms §10.1 incorporan el DPA por referencia (<https://vercel.com/legal/terms>, act. 01-06-2026). Pero el DPA §1 dice que «applies to Vercel's Processing of Personal Data as a Processor … for Customers who are on Enterprise and Pro plans», y el §4.a repite «Enterprise or Pro» (<https://vercel.com/legal/dpa>, act. 17-03-2026, vigente desde el 31-03-2026). Además, **Terms §3: en Hobby (y en la prueba de Pro), Vercel puede usar «Your Content» para entrenar modelos de IA y compartirlo con terceros con ese fin** («Model Training»). En Pro de pago viene desactivado por defecto. | Encargado (Pro/Enterprise) | DPA §13.a: «primary processing facilities are in the United States». Usa SCC de 2021 (Schedule 3). El DPA no menciona el DPF. |
| **Neon** (ahora Databricks) | Sí, por incorporación. La Product Specific Schedule (Neon) (<https://neon.com/platform-terms>, act. 05-08-2026) se aplica al acceder al servicio y remite al Master Cloud Services Agreement de Databricks. Según una lectura de la página <https://www.databricks.com/legal/mcsa> (act. 20-02-2026), su §1.1.4.1 dice: «The terms of the DPA are incorporated by reference». | Encargado (DPA de Databricks §2.1) | DPA de Databricks: SCC, aviso de brechas en 72 h y borrado al terminar (<https://www.databricks.com/legal/dpa>). Subencargados en <https://www.databricks.com/legal/databricks-subprocessors>, más Grafana Labs (EE. UU.). |
| **Resend** | Sí. El DPA §12 dice que es vinculante «upon Customer's acceptance of the Agreement» (<https://resend.com/legal/dpa>, act. 31-12-2025). Los Terms §1 lo citan (<https://resend.com/legal/terms-of-service>, act. 27-08-2026). | Encargado (§2.1). Responsable independiente de los datos de cuenta y uso (§9.1). | §6.1: el tratamiento principal se hace en EE. UU. SCC (§6.2) y certificación DPF (§11.1). Subencargados en <https://resend.com/legal/subprocessors>. |
| **Cloudflare Turnstile** | Sí. El Self-Serve Subscription Agreement §6.1 incorpora el DPA cuando hay datos personales europeos (<https://www.cloudflare.com/terms/>, act. 12-09-2025). DPA v6.4, vigente desde el 03-04-2026 (<https://www.cloudflare.com/cloudflare-customer-dpa/>). | Encargado para detectar bots y **responsable** para mejorar Turnstile, con base en interés legítimo (Turnstile Privacy Addendum, act. 18-06-2025: <https://www.cloudflare.com/turnstile-privacy-policy/>) | DPA §6.4: Cloudflare cumple el DPF. Si no, se aplican las SCC (§6.2). Señales recogidas: IP, huella TLS y User-Agent. |

**El fotógrafo también es un destinatario.** Recibe la agenda con el nombre del peque, la clase y la hora. **[Inferencia]** Si trata esos datos por cuenta del AFA, es un **encargado** y hace falta un contrato del art. 28 (sirve el modelo de la Guía AEPD contratos) o, como mínimo, un compromiso escrito de confidencialidad, de uso exclusivo para la sesión y de borrado. Las fotos que hace son otro tratamiento, fuera de esta app, y el AFA debería dejar claro quién es su responsable.

### Transferencias a EE. UU.

- RGPD art. 45.1: una transferencia basada en una decisión de adecuación «no requerirá ninguna autorización específica». Art. 46.2.c: sin decisión de adecuación, sirven las **cláusulas tipo** de la Comisión.
- **Marco de Privacidad de Datos UE-EE. UU. (DPF)**: Decisión de Ejecución (UE) 2023/1531, <https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023D1531>. El Tribunal General desestimó el recurso de anulación (asunto T-553/23, 03-09-2025) y hay un **recurso de casación pendiente (C-703/25 P)**, cuyo anuncio se publicó en el DO C/2025/6610 (<https://eur-lex.europa.eu/eli/C/2025/6610/oj>). **No he podido abrir EUR-Lex ni la ficha de curia.europa.eu**: lo anterior sale de los títulos de resultados de búsqueda y de fuentes secundarias. Conviene comprobar en curia.europa.eu si ha habido sentencia después del 13-10-2026.
- **[Inferencia]** Los cuatro proveedores tienen SCC en su DPA, y Resend, Cloudflare y Neon/Databricks las tienen como respaldo o vía principal. La transferencia queda cubierta aunque el DPF cayera. Las medidas razonables por parte del AFA son:
  1. Minimizar lo que llega a EE. UU.: **ningún nombre de peque en los emails**, ya decidido en el ticket 08.
  2. Usar regiones de la UE: Neon en Frankfurt, funciones de Vercel en `fra1` y Resend en `eu-west-1`.
  3. Informar de la transferencia en la segunda capa (art. 13.1.f).

---

## 4. Plazos de conservación y qué se puede guardar entre ediciones

**Qué dicen las fuentes**

- RGPD art. 5.1.e: los datos se conservan «durante no más tiempo del necesario». Considerando 39: el responsable «ha de establecer plazos para su supresión o revisión periódica». Art. 25.2: por defecto se limitan la cantidad, la extensión y el **plazo de conservación**.
- Ninguna norma fija un plazo concreto para este tipo de inscripción. La Guía AEPD informar (§7.2, p. 11) admite indicar un plazo o un criterio.
- **LOPDGDD art. 32 (bloqueo)**: al suprimir, el responsable «estará obligado a bloquear los datos». Quedan reservados solo para jueces, Ministerio Fiscal y autoridades de protección de datos, «solo por el plazo de prescripción» de las responsabilidades, y después se destruyen. Art. 32.4: si el sistema no permite bloquear, basta un **copiado seguro** con evidencia de fecha y de no manipulación. Las infracciones prescriben a los 3, 2 o 1 años según sean muy graves, graves o leves (LOPDGDD arts. 72-74).
- RGPD art. 6.4: si los datos se usan para otro fin, hay que valorar si es compatible con el original. Art. 13.3: hay que informar **antes** de ese tratamiento ulterior.

**Guardar entre ediciones «qué preferencia obtuvo» para compensar**

- **[Inferencia]** Esta es una **finalidad distinta**, porque afecta al sorteo del año siguiente. Necesita base propia e información desde el principio. Hay dos opciones:
  - **(a) Consentimiento aparte, opcional y sin marcar.** Por ejemplo: «Guardad nuestro resultado para compensarnos el año que viene». Es coherente con la base del §1 y fácil de demostrar. Inconveniente: quien no marque la casilla no tendrá compensación.
  - **(b) Interés legítimo (6.1.f).** Hay que hacer y documentar una ponderación, informar y permitir la oposición (art. 21.1).
- Se recomienda **(a)**, por simplicidad y por coherencia con la guía de la AEPD para AMPA.
- **Datos mínimos [Inferencia]:** no hace falta guardar ni nombres ni datos de peques. Basta con:
  - una **clave seudónima del email**: HMAC del email normalizado con una clave secreta del AFA (art. 25.1 cita la seudonimización),
  - la edición,
  - y un valor numérico de compensación, por ejemplo el puesto de la preferencia obtenida.
- El dato seudonimizado **sigue siendo dato personal**. Hay que declararlo y borrarlo cuando se haya aplicado en la edición siguiente, o como máximo a los ~13 meses si la familia no vuelve.

---

## 5. ¿Basta el aviso de «no incluyáis datos de salud» en observaciones?

**Qué dicen las fuentes**

- RGPD art. 9.1 prohíbe tratar datos de salud salvo que se aplique una excepción del 9.2.
  - La excepción del 9.2.a requiere consentimiento **explícito** y para fines especificados.
  - La del 9.2.d, para asociaciones sin ánimo de lucro, se limita a las que tienen finalidad «política, filosófica, religiosa o sindical». **[Inferencia]** No cubre a un AFA.
- LOPDGDD art. 28.2.c considera de mayor riesgo el tratamiento «no meramente incidental o accesorio» de categorías especiales.
- RGPD art. 25.1-2: protección de datos desde el diseño y por defecto, incluida la minimización.

**Conclusión [Inferencia]**

- El aviso es necesario, pero **no basta por sí solo**. Si una familia escribe igualmente un dato de salud (por ejemplo, «el peque tiene autismo, mejor a primera hora»), el AFA lo estaría tratando sin base del art. 9.2. Como es un tratamiento incidental y no buscado, el riesgo es bajo si se aplican medidas de diseño:
  1. Texto del aviso junto al campo, no solo en el placeholder: «No incluyáis datos de salud ni de otro tipo sensible. Si necesitáis algo especial para la sesión, escribidnos a [email del AFA]».
  2. Límite de 300 caracteres, ya decidido.
  3. Las observaciones **no van en los emails ni en las exportaciones** al fotógrafo por defecto. Solo las ve el admin.
  4. El admin puede **editar o borrar** unas observaciones, con una acción «Eliminar dato sensible» que deja constancia en la auditoría sin guardar el texto.
  5. Se borran con el resto de la inscripción (§4).
- Si el AFA quisiera **recoger** necesidades especiales a propósito, haría falta un consentimiento explícito aparte (9.2.a) y más medidas. Se recomienda no hacerlo en 2026.

---

## 6. Derechos que hay que poder atender y cómo

**Qué dicen las fuentes**

- RGPD arts. 15 a 22: acceso (con copia, 15.3), rectificación (16), supresión (17), limitación (18), portabilidad (20, cuando la base es el consentimiento o un contrato y el tratamiento es automatizado) y oposición (21, cuando la base es el interés legítimo).
- RGPD art. 12.3: hay que responder **en un mes**, prorrogable dos más avisando dentro del primer mes. Art. 12.6: si hay dudas razonables, se puede pedir información para confirmar la identidad.
- **LOPDGDD art. 12.6**: los titulares de la patria potestad ejercen los derechos de los **menores de 14 años**. Art. 12.2: medios fácilmente accesibles, y no se puede denegar un derecho porque se pida por otro medio. Art. 12.4: el AFA debe poder **probar** que respondió. Art. 12.7: es **gratuito**.
- **LOPDGDD art. 13.2**: el derecho de acceso se entiende atendido si se ofrece un «sistema de acceso remoto, directo y seguro». **[Inferencia]** El **enlace de acceso** cumple esa función mientras está vigente, hasta el 1/11.
- RGPD art. 15.4 y 20.4: atender un derecho no puede perjudicar a otras personas. **[Inferencia]** Ejemplo: si el otro progenitor pide los datos de su peque, se le dan los del peque, pero no el email ni el teléfono del adulto que inscribió.

**Cómo atenderlos en esta app [Inferencia]**

| Derecho | Mientras el enlace vale (hasta el 1/11) | Después |
|---|---|---|
| Acceso | La familia ve su inscripción con el enlace | Email al AFA y respuesta con una copia (PDF o JSON) |
| Rectificación | Edita con el enlace (todo menos el email) | Email al AFA. El admin corrige |
| Supresión / retirar consentimiento | «Cancelar» con el enlace (borrado real) | Email al AFA. El admin borra |
| Portabilidad | — | El admin exporta la inscripción en JSON |
| Limitación / oposición | Raras. Por email | El admin marca la inscripción como «limitada» o la excluye |

- Para verificar la identidad, basta con que la petición llegue desde el email de la inscripción o se confirme respondiendo desde él (art. 12.6).
- Hay que registrar cada petición: fecha, derecho, respuesta y fecha de respuesta (LOPDGDD 12.4). Basta una hoja del AFA o una tabla del admin.
- **Brechas de seguridad:**
  - RGPD art. 33.1: notificar a la AEPD en un plazo de **72 h**, salvo que sea improbable que haya riesgo.
  - Art. 34: comunicarlo a las familias si el riesgo es alto.
  - Art. 33.5: documentar todas las brechas, se notifiquen o no.

---

## Recomendación para el spec

Requisitos mínimos, pensados para un AFA de voluntarios con ~120 familias.

### A. Textos en la app

1. **Paso 5, encima de la casilla y del botón Enviar**: tabla «Información básica sobre protección de datos» con 5 filas y un «+info» en cada una (LOPDGDD 11 y Guía AEPD informar §6). Borrador:
   - **Responsable:** AFA CEI Las Palmeras ([NIF]), [email del AFA].
   - **Finalidad:** organizar la sesión de fotos de Navidad: inscripción, sorteo de horas, cambios de hora y avisos.
   - **Legitimación:** vuestro consentimiento, también como madre, padre o tutor/a de los peques. Podéis retirarlo cancelando la inscripción.
   - **Destinatarios:** el fotógrafo recibe la agenda (nombre del peque, clase y hora). Usamos proveedores técnicos con contrato. Algunos están en EE. UU., con cláusulas tipo de la UE.
   - **Derechos:** ver, corregir y borrar vuestros datos con vuestro enlace o escribiendo a [email]. Más en [Privacidad].
2. **Casilla obligatoria** (no marcada por defecto): «He leído la información sobre protección de datos y consiento, también como madre, padre o tutor/a de los peques, que el AFA trate estos datos para organizar la sesión de fotos».
3. **Casilla opcional** (no marcada por defecto) para la compensación del año siguiente (§4): «Guardad nuestro resultado de este año para compensarnos en el sorteo del año que viene. Solo guardamos una clave de vuestro email y un número».
4. **Observaciones**: aviso visible junto al campo, con un email alternativo para necesidades especiales (§5).
5. **Página `/privacidad`** (segunda capa), enlazada desde el pie de página y desde los emails. Incluye:
   - contacto completo del responsable,
   - qué datos se recogen y cuáles son obligatorios (13.2.e),
   - las finalidades, incluida la compensación,
   - la explicación del sorteo, enlazando a la página de transparencia (13.2.f),
   - la tabla de plazos (punto C),
   - la lista de encargados con sus países y garantías (13.1.e-f),
   - cómo ejercer cada derecho, la retirada del consentimiento y la reclamación ante la AEPD (13.2.b-d),
   - la versión y la fecha del texto.
6. **Borrador en el móvil (localStorage)**: no necesita aviso de cookies, porque es almacenamiento «estrictamente necesario» para un servicio «expresamente solicitado» (LSSI art. 22.2, último párrafo). **[Inferencia]** Basta con mencionarlo en `/privacidad`. Turnstile se explica allí también como medida antibots.

### B. Qué guardar como prueba

7. Por inscripción: fecha y hora del consentimiento, **versión del texto de privacidad** aceptado y el valor de la casilla de compensación (RGPD 7.1).
8. Una tabla de **peticiones de derechos** y una de **brechas** (LOPDGDD 12.4 y RGPD 33.5). Pueden ser simples tablas del admin.

### C. Plazos de conservación [Inferencia: propuesta razonable, no hay plazo legal fijado]

| Dato | Plazo |
|---|---|
| Inscripción completa: adulto, peques, preferencias, observaciones, teléfono | Hasta el **cierre de la edición**, que marca el admin cuando se entregan las fotos y se cierran los lotes. **Como máximo, el 31 de enero** siguiente. Después, purga automática |
| Inscripción cancelada por la familia | Borrado inmediato. Queda una línea anónima en la auditoría (ya decidido) |
| Registro de auditoría | Al purgar, se anonimiza: sin nombres, emails ni teléfonos |
| Clave de compensación (solo con la casilla marcada) | HMAC del email, edición y número. Hasta que se aplica en la edición siguiente, **máximo 13 meses** |
| Estadísticas agregadas (página de transparencia) | Sin límite: no son datos personales |
| `pg_dump` de cierre | Cifrado y fuera de línea, con acceso solo de la junta. Es la «copia bloqueada» de LOPDGDD 32.4. Proponer **12 meses** y destruirlo, con el límite máximo de 3 años del art. 32.2. **[Inferencia]** El alcance real del bloqueo en este caso es discutible: el AFA debe decidirlo y anotarlo en el RAT |
| Exportaciones (agenda del fotógrafo, lotes) | El fotógrafo las borra tras la sesión. El AFA borra las suyas en la purga, salvo los datos contables que necesite (sin nombres de peques) |

### D. Contratos y proveedores

9. **Vercel: no basta con Hobby para datos personales.** El DPA solo cubre Pro y Enterprise, y en Hobby los Terms permiten el «Model Training» con «Your Content». Opciones:
   - **(a) Recomendada:** **Vercel Pro desde el día antes de abrir la inscripción hasta la purga**. En Pro de pago el Model Training viene desactivado por defecto: hay que comprobarlo en los ajustes del equipo. Coste: unos 20 $/mes durante 2-4 meses. Además resuelve la duda sobre el uso «comercial» del ticket 03.
   - **(b)** Pedir a Vercel por escrito que confirme que el DPA se aplica en Hobby y que el Model Training se puede desactivar. Sin esa confirmación, mejor (a).
   - **[Inferencia]** Esto es una conclusión propia a partir del texto de los Terms y del DPA. Vercel no lo dice en ninguna página.
10. **Neon, Resend y Cloudflare**: el DPA queda aceptado al aceptar los términos. Hay que guardar un PDF fechado de cada DPA en la carpeta del AFA y anotarlo en el RAT.
11. **Fotógrafo**: un contrato de encargo breve (Guía AEPD contratos) o un compromiso firmado de confidencialidad, uso exclusivo para la sesión y borrado tras la entrega.
12. Las cuentas de todos los proveedores deben estar **a nombre del email del AFA** (ya fijado en el mapa), no de una persona.

### E. Documentación del AFA (fuera de la app)

13. Una **ficha del RAT** de una página (RGPD 30.1). Se puede generar con Facilita RGPD y adaptar.
14. Un **análisis de riesgos** breve y escrito (LOPDGDD 28) con Evalúa-Riesgo RGPD. No hace falta EIPD (un solo criterio de la lista de la AEPD) ni DPD.

### F. Medidas de diseño y seguridad que se derivan (RGPD 25 y 32)

15. Ningún nombre de peque ni observación en los emails, ya decidido. Todo en regiones de la UE.
16. Tokens de enlace guardados como hash. Acceso al admin solo para 1-2 personas con autenticación fuerte.
17. La agenda del fotógrafo solo incluye peque, clase y hora: sin email, teléfono ni observaciones.
18. Admin con «Eliminar dato sensible» en observaciones, exportación JSON por inscripción (acceso y portabilidad) y purga de la edición con un botón y confirmación.
