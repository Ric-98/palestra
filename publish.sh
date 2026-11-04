#!/bin/zsh
# Pubblica una nuova versione: aggiorna il numero di versione, commit e push.
# Uso: ./publish.sh "messaggio"
set -e
cd "$(dirname "$0")"
V="$(date +%Y-%m-%d).$(date +%H%M)"
sed -i '' "s/^const VERSION = .*/const VERSION = '$V';/" sw.js
sed -i '' "s/^export const APP_VERSION = .*/export const APP_VERSION = '$V';/" js/version.js
git add -A
git commit -q -m "${1:-Aggiornamento} ($V)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -q
echo "Pubblicata versione $V"
