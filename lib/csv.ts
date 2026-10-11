// Nombres des exports CSV au format français : virgule décimale (ex. 12.50 -> 12,50).
// Ne touche qu'une valeur qui est entièrement un nombre décimal : les libellés
// comme "Ø1.2" ou les dates restent inchangés.
// À n'utiliser que pour les exports destinés à l'utilisateur. Les sauvegardes
// (api/backup) doivent rester en point décimal, car l'import les relit avec parseFloat.
export function nombreCsv(valeur: string | number): string {
  return String(valeur).replace(/^(-?\d+)\.(\d+)$/, '$1,$2')
}
