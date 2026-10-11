// Analyse des mouvements : période (début / fin) et transferts stock → usine.
// Helpers purs et testables, partagés par la page Analyse.

// Un mouvement réduit à ce dont l'analyse de période a besoin
export type MvtPondere = { date_mouvement: string; poids_mouvement: string | number }

// Date locale au format YYYY-MM-DD (évite le décalage UTC de toISOString)
export const isoJour = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Date du jour d'il y a `mois` mois (raccourcis 3 / 6 / 12 mois)
export const jourIlYaMois = (mois: number) => { const d = new Date(); d.setMonth(d.getMonth() - mois); return isoJour(d) }

// Affichage d'une date au format YYYY-MM-DD (jour local, sans décalage de fuseau)
export const fmtJour = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR')
}

// Bornes de la période : début à 00:00:00, fin à 23:59:59.999 (bornes incluses)
export const bornesPeriode = (debut: string, fin: string) => ({
  t0: debut ? new Date(`${debut}T00:00:00`).getTime() : -Infinity,
  t1: fin ? new Date(`${fin}T23:59:59.999`).getTime() : Infinity
})

// Vrai si la date (ISO) tombe dans la période ; période vide = tout l'historique
export const dansPeriode = (valeurIso: string, debut: string, fin: string) => {
  const t = new Date(valeurIso).getTime()
  if (Number.isNaN(t)) return false
  const { t0, t1 } = bornesPeriode(debut, fin)
  return t >= t0 && t <= t1
}

// Mouvements compris dans la période choisie
export const mouvementsPeriode = <T extends MvtPondere>(mvts: T[], debut: string, fin: string) => {
  const { t0, t1 } = bornesPeriode(debut, fin)
  return mvts.filter(m => { const t = new Date(m.date_mouvement).getTime(); return !Number.isNaN(t) && t >= t0 && t <= t1 })
}

// Somme des poids d'une liste de mouvements (kg)
export const poidsMouvements = (mvts: MvtPondere[]) => mvts.reduce((s, m) => s + (parseFloat(String(m.poids_mouvement)) || 0), 0)

// Types de mouvement qui font sortir la bobine du stock (ou des lieux en général)
const TYPE_VERS_USINE = ['SORTIE_USINE', 'TRANSFERT_VERS_USINE']
const TYPE_VERS_DECHET = ['SORTIE_DECHET', 'TRANSFERT_VERS_DECHET']

export const versUsine = (type: string) => TYPE_VERS_USINE.includes(type)

// Un mouvement avec son type, pour reconstituer le poids au fil de l'historique
export type MvtHistorique = MvtPondere & { type_mouvement: string }

// Poids de la bobine au moment de chaque mouvement, reconstitué dans l'ordre chronologique.
// Les sorties vers l'usine ne portent aucun poids : le poids qui change de lieu est le poids
// courant de la bobine (poids initial, puis poids du dernier retour usine, et 0 après un rebut).
// Retourne une Map « index du mouvement → poids qui a changé de lieu (kg) ».
export const poidsLorsMouvements = (mvts: MvtHistorique[], poidsInitial: number) => {
  let courant = Number.isFinite(poidsInitial) ? poidsInitial : 0
  const poids = new Map<number, number>()
  mvts.forEach((m, i) => {
    const p = parseFloat(String(m.poids_mouvement)) || 0
    if (m.type_mouvement === 'ENTREE_FOURNISSEUR') { if (p > 0) courant = p }
    else if (versUsine(m.type_mouvement)) { poids.set(i, courant) }
    else if (m.type_mouvement === 'RETOUR_USINE') { courant = p }
    else if (TYPE_VERS_DECHET.includes(m.type_mouvement)) { courant = 0 }
    // TRANSFERT_VERS_STOCK : le poids ne change pas, seul le lieu change
  })
  return poids
}

// Poids net qui a changé de lieu : sorties vers l'usine − retours vers le stock
// (le poids réellement consommé par l'usine, plus celui qui y est encore)
export const poidsNet = (poidsSorties: number, poidsRetours: number) => poidsSorties - poidsRetours

// Poids à afficher pour un mouvement : le poids enregistré, sinon le poids reconstitué
export const poidsAffiche = (m: MvtPondere, poidsReconstitue?: number) => {
  const p = parseFloat(String(m.poids_mouvement)) || 0
  return p === 0 && poidsReconstitue !== undefined ? poidsReconstitue : p
}

// Libellé lisible de la période (titres, exports CSV)
export const libellePeriode = (debut: string, fin: string) => {
  if (!debut && !fin) return "tout l'historique"
  return `${debut ? fmtJour(debut) : 'origine'} → ${fin ? fmtJour(fin) : "aujourd'hui"}`
}
