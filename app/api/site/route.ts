import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SITE } from '@/lib/site'
import { etatSiteBase, infosConnexionBase } from '@/lib/site-base'

// Identité du site courant, site propriétaire de la base et état des données.
// Sert à repérer immédiatement une base mal rattachée (données non croisées).
export async function GET() {
  try {
    const base = await etatSiteBase()
    const [bobines, receptions, mouvements, items, utilisateurs] = await Promise.all([
      prisma.bobine.count(),
      prisma.reception.count(),
      prisma.mouvement.count(),
      prisma.itemPersonnalise.count(),
      prisma.user.count()
    ])
    return NextResponse.json({
      app: SITE.code,
      nom: SITE.nom,
      base,
      connexion: infosConnexionBase(),
      stats: { bobines, receptions, mouvements, items, utilisateurs }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
