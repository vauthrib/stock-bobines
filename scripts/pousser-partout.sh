#!/usr/bin/env bash
# Envoie la même branche vers tous les remotes configurés : un remote par site
# (origin = RGM, srga, ariv…). Ajouter un site : git remote add <nom> <url>.
# Usage : bash scripts/pousser-partout.sh [branche]   (défaut : main)

set -euo pipefail

branche="${1:-main}"

remotes=$(git remote)
if [ -z "$remotes" ]; then
  echo "Aucun remote configuré." >&2
  exit 1
fi

for remote in $remotes; do
  echo "→ $remote (branche $branche)"
  git push "$remote" "$branche"
done

echo "Terminé : $branche poussée vers $(echo "$remotes" | wc -l) remote(s)."
