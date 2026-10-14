#!/bin/bash
# Arranca servidor + túnel de Cloudflare desacoplados de cualquier sesión. Mantiene el Mac despierto mientras vive el túnel.
set -e
cd "$(dirname "$0")"
./publicar.sh
./parar.sh >/dev/null 2>&1 || true
DETACH='import os,sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])'
nohup python3 -c "$DETACH" python3 -m http.server 4174 --bind 127.0.0.1 --directory ../compartir > servidor.log 2>&1 &
echo $! > servidor.pid
nohup python3 -c "$DETACH" caffeinate -i cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4174 > tunel.log 2>&1 &
echo $! > tunel.pid
for i in $(seq 1 60); do u=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' tunel.log | head -1); [ -n "$u" ] && break; sleep 0.5; done
echo "${u:-ERROR: sin URL, mira tunel.log}" | tee url.txt
