// Identité du site déployé : RGM, SRGA ou ARIV.
// Une seule base de code, trois déploiements : chaque projet Vercel définit
// NEXT_PUBLIC_SITE (RGM | SRGA | ARIV), NEXT_PUBLIC_SITE_URL et sa propre DATABASE_URL.
// Les données ne se croisent jamais puisque chaque site a sa base.

export type CodeSite = 'RGM' | 'SRGA' | 'ARIV'

export type ThemeSite = {
  code: CodeSite
  nom: string        // nom affiché de l'application
  fond: string       // couleur de fond générale des pages
  fondFin: string    // bas du dégradé (connexion, accueil, fiche bobine)
  accent: string     // couleur du badge de site et des éléments d'identité
}

// RGM en vert, SRGA en rose, ARIV en bleu
const THEMES: Record<CodeSite, ThemeSite> = {
  RGM: { code: 'RGM', nom: 'Gestion Stock Bobines', fond: '#ecfdf5', fondFin: '#a7f3d0', accent: '#047857' },
  SRGA: { code: 'SRGA', nom: 'Gestion Stock Bobines', fond: '#fdf2f8', fondFin: '#fbcfe8', accent: '#be185d' },
  ARIV: { code: 'ARIV', nom: 'Gestion Stock Bobines', fond: '#eff6ff', fondFin: '#bfdbfe', accent: '#1d4ed8' }
}

const codeDemande = (process.env.NEXT_PUBLIC_SITE || 'RGM').trim().toUpperCase()

// Site courant : RGM par défaut si la variable est absente ou inconnue
export const SITE: ThemeSite = THEMES[codeDemande as CodeSite] || THEMES.RGM

// URL publique du site (utilisée pour les QR codes des étiquettes)
export const URL_SITE = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()

// Dégradé de fond propre au site
export const degradeSite = `linear-gradient(to bottom right, ${SITE.fond}, ${SITE.fondFin})`
