# Simulación de familias por horarios

Type: task
Status: ready-for-human
Map: [map.md](../map.md)

## Request

El 14-10-2026 el usuario pide cargar de una vez inscripciones ficticias que modelen trabajo y extraescolares, para observar el algoritmo con mucha demanda. Corrige el objetivo inicial: dejar unos 10 huecos, no cargar 119 familias.

## Implementation

- Modelo reproducible por perfiles y actividades; objetivo 110 inscripciones para 120 huecos, conservando las previas.
- Identificación explícita de toda la tanda; sin correo ni publicación de asignaciones.
- Cambio necesario: la lista canónica seguía limitada a 6 imposibles aunque la edición ya admitía 10. Ampliada y verificada con regresión y vectores fijos.
- Procedimiento y supuestos en [simulacion-horarios.md](../../../docs/simulacion-horarios.md).

## Comments

- **14-10-2026**: plan comprobado con 3 inscripciones previas: 107 ficticias nuevas, 110 en total, 10 huecos sobrantes. Pruebas del modelo y módulo de reparto: 55 correctas.
- **14-10-2026**: carga y comprobación completas en producción de pruebas, auditadas con `admin:afa`. Simulación web y CLI coinciden: 71 primeras favoritas, 21 segundas, 6 terceras, 6 «nos va bien», 6 sin favoritas y 0 imposibles. Sin asignaciones publicadas ni emails de la tanda. Primer apellido ficticio único; cero duplicados. Segunda ejecución idempotente: 0 inserciones. Listo para revisión del usuario en el panel.
