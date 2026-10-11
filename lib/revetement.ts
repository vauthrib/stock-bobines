// Règle d'affichage : couleur de police par revêtement
// Sans = noir, Galva = bleu, Inox = orange foncé
export const couleurRevetement = (rev?: string | null) => {
  const v = (rev || '').trim().toLowerCase()
  if (v.startsWith('galva')) return 'text-blue-600'
  if (v.includes('inox')) return 'text-orange-800'
  if (v.startsWith('sans')) return 'text-black'
  return ''
}

// Revêtements toujours proposés, même s'ils ne sont pas encore en base
export const REVETEMENTS_BASE = ['Inox']
