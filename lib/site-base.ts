import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SITE } from '@/lib/site'

// Clé du marqueur stocké dans la base : le site propriétaire (RGM, SRGA, ARIV)
const CLE_SITE = 'site_code'

export type EtatSiteBase = { app: string; code: string; conflit: boolean }

// Lit le site propriétaire de la base ; s'il n'existe pas encore, il est posé
// au premier démarrage (le premier site qui ouvre la base en devient propriétaire).
export async function etatSiteBase(): Promise<EtatSiteBase> {
  const enregistre = await prisma.parametre.findUnique({ where: { cle: CLE_SITE } })
  if (enregistre) {
    return { app: SITE.code, code: enregistre.valeur, conflit: enregistre.valeur !== SITE.code }
  }
  await prisma.parametre.create({ data: { cle: CLE_SITE, valeur: SITE.code } }).catch(() => undefined)
  const apres = await prisma.parametre.findUnique({ where: { cle: CLE_SITE } })
  const code = apres?.valeur ?? SITE.code
  return { app: SITE.code, code, conflit: code !== SITE.code }
}

// Réponse de refus à opposer à toute écriture quand la base appartient à un autre site.
// En cas d'erreur inattendue (table absente, base injoignable) on laisse passer :
// mieux vaut ne jamais bloquer un site correctement configuré.
export async function refusEcritureAutreSite(): Promise<NextResponse | null> {
  try {
    const etat = await etatSiteBase()
    if (!etat.conflit) return null
    return NextResponse.json({
      error: `Base du site ${etat.code} : cette application est configurée pour ${etat.app}. `
        + 'Écriture refusée pour ne pas mélanger les données des sites.'
    }, { status: 409 })
  } catch (error) {
    console.error('Vérification du site de la base impossible :', error)
    return null
  }
}

// Hôte et nom de la base, sans jamais exposer les identifiants
export function infosConnexionBase() {
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    return { hote: url.hostname || '?', base: url.pathname.replace(/^\//, '') || '?' }
  } catch {
    return { hote: '?', base: '?' }
  }
}
