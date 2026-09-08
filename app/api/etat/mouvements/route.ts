import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dimension = searchParams.get('dimension') || ''
    const durete = searchParams.get('durete') || ''
    const revetement = searchParams.get('revetement') || ''

    // Recherche des lots correspondant au produit (même construction de dimension que la page État)
    const receptionWhere: Record<string, unknown> = {}
    if (durete) receptionWhere.durete = durete
    if (revetement) receptionWhere.revetement = revetement

    const receptions = await prisma.reception.findMany({ where: receptionWhere })
    const receptionIds = receptions
      .filter(r => {
        const dim = r.type_materiel === 'Fil'
          ? `Ø${r.diametre_fil}`
          : `${r.largeur_feuillard}x${r.longueur_feuillard}`
        return dim === dimension
      })
      .map(r => r.id)

    if (receptionIds.length === 0) return NextResponse.json([])

    const bobines = await prisma.bobine.findMany({
      where: { reception_id: { in: receptionIds } },
      select: { id: true, code_bobine: true }
    })

    if (bobines.length === 0) return NextResponse.json([])

    const mouvements = await prisma.mouvement.findMany({
      where: { bobine_id: { in: bobines.map(b => b.id) } },
      include: { bobine: true },
      orderBy: [{ date_mouvement: 'desc' }, { id: 'desc' }],
      take: 1000
    })

    return NextResponse.json(mouvements.map(m => ({
      id: m.id,
      date_mouvement: m.date_mouvement,
      code_bobine: m.bobine.code_bobine,
      type_mouvement: m.type_mouvement,
      poids_mouvement: m.poids_mouvement.toString(),
      lieu_destination: m.lieu_destination,
      n_commande_client: m.n_commande_client,
      client: m.client,
      texte_libre: m.texte_libre
    })))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
