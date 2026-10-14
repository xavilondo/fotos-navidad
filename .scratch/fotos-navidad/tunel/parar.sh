#!/bin/bash
# Para el túnel y el servidor (caffeinate termina solo al morir cloudflared).
cd "$(dirname "$0")"
pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4174" 2>/dev/null
pkill -f "http.server 4174" 2>/dev/null
rm -f tunel.pid servidor.pid url.txt
echo parado
