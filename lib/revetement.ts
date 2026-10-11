// Couleurs et styles d'affichage des items (Administration > Items)
// - un revêtement peut avoir une couleur (texte affiché dans cette couleur)
// - une dureté peut avoir un style (gras, souligné, italique, majuscules, chasse fixe)

export const REVETEMENTS_BASE = ['Inox']

// Couleurs par défaut, utilisées tant qu'aucune couleur n'est configurée dans l'administration
export function couleurRevetementDefaut(rev?: string | null): string | null {
  const v = (rev || '').trim().toLowerCase()
  if (!v) return null
  if (v.startsWith('galva')) return '#2563eb'
  if (v.includes('inox')) return '#9a3412'
  if (v.startsWith('sans')) return '#000000'
  return null
}

// Choix possibles pour une couleur de revêtement
export const COULEURS_PROPOSEES: { nom: string; valeur: string }[] = [
  { nom: 'Noir', valeur: '#000000' },
  { nom: 'Gris', valeur: '#4b5563' },
  { nom: 'Bleu', valeur: '#2563eb' },
  { nom: 'Bleu foncé', valeur: '#1e3a8a' },
  { nom: 'Vert', valeur: '#15803d' },
  { nom: 'Orange foncé', valeur: '#9a3412' },
  { nom: 'Orange', valeur: '#ea580c' },
  { nom: 'Rouge', valeur: '#dc2626' },
  { nom: 'Violet', valeur: '#7c3aed' },
  { nom: 'Marron', valeur: '#78350f' },
]

// Choix possibles pour le style d'une dureté (cumulables)
export const STYLES_DURETE: { token: string; libelle: string; classe: string }[] = [
  { token: 'gras', libelle: 'Gras', classe: 'font-bold' },
  { token: 'souligne', libelle: 'Souligné', classe: 'underline' },
  { token: 'italique', libelle: 'Italique', classe: 'italic' },
  { token: 'majuscules', libelle: 'MAJUSCULES', classe: 'uppercase tracking-wide' },
  { token: 'monospace', libelle: 'Chasse fixe', classe: 'font-mono' },
]

const TOKENS_STYLE = new Set(STYLES_DURETE.map(s => s.token))

// "souligne,gras" -> "underline font-bold"
export function classeStyleDurete(style?: string | null): string {
  if (!style) return ''
  const tokens = style.split(',').map(t => t.trim().toLowerCase()).filter(t => TOKENS_STYLE.has(t))
  return STYLES_DURETE.filter(s => tokens.includes(s.token)).map(s => s.classe).join(' ')
}
