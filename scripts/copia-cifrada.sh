#!/usr/bin/env bash
# Copia cifrada de la base de datos (antes del sorteo y al cierre). Se borra con la purga.
#   pnpm copia:cifrada            → copias/fotos-AAAAMMDD-HHMM.sql.gz.gpg
# Pide una contraseña (guardadla en el gestor de contraseñas del AFA, NUNCA junto a la copia).
# Para restaurar: gpg -d copias/<archivo>.gpg | gunzip | psql "$DATABASE_URL"
set -euo pipefail
if [ -f .env.local ] && [ -z "${DATABASE_URL:-}" ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.local; set +a
fi
: "${DATABASE_URL:?Falta DATABASE_URL}"
mkdir -p copias
destino="copias/fotos-$(date +%Y%m%d-%H%M).sql.gz.gpg"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 | gpg --symmetric --cipher-algo AES256 --output "$destino"
echo "Copia cifrada en $destino. Guardadla fuera del repositorio y borradla al purgar la edición."
