#!/bin/bash
# Copia los prototipos (y solo los recursos que usan) a ../compartir, que es lo único que sirve el túnel.
set -e
cd "$(dirname "$0")/.."
REPO="$(cd ../.. && pwd)"
OUT=compartir
mkdir -p "$OUT/assets"
for f in prototipos/PROTOTIPO-*.html; do
  name=$(basename "$f" .html); name=${name#PROTOTIPO-}
  [ "$name" = selector-horarios ] && dest="$OUT/index.html" || dest="$OUT/$name.html"
  sed -e "s#'../../../dossier/assets/'#'assets/'#g" -e "s#../../../dossier/assets/#assets/#g" "$f" > "$dest"
done
# Lista cerrada de recursos públicos: mascotas, logo, grano e ilustración de invierno. Nunca fotos de peques.
for a in an-patitos an-gatitos an-ardillas an-osos an-delfines an-tigres an-elefantes an-pinguinos; do cp "$REPO/dossier/assets/$a.png" "$OUT/assets/"; done
cp "$REPO/dossier/assets/"{grain,logo-circle,wintertree}.png "$OUT/assets/"
echo "publicado en $OUT: $(ls "$OUT" | tr '\n' ' ')"
