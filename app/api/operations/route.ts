import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Historique des opérations : chaque mouvement de bobine avec sa bobine, son
// auteur et le sens du mouvement. Lecture seule.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limiteDemandee = parseInt(searchParams.get('limit') || '300')
    const limite = isNaN(limiteDemandee) ? 300 : Math.min(Math.max(limiteDemandee, 1), 2000)

    const mouvements = await prisma.mouvement.findMany({
      include: {
        bobine: {
          include: { reception: true }
        }
      },
      orderBy: [{ date_mouvement: 'desc' }, { id: 'desc' }],
      take: limite
    })

    const operations = mouvements.map(m => {
      const r = m.bobine.reception
      const dimension = r.type_materiel === 'Fil'
        ? `Ø${r.diametre_fil ?? '?'}`
        : `${r.largeur_feuillard ?? '?'}x${r.longueur_feuillard ?? '?'}`

      return {
        id: m.id,
        date_mouvement: m.date_mouvement,
        code_bobine: m.bobine.code_bobine,
        num_bobine: m.bobine.num_bobine,
        lot: `${r.code_fournisseur}${r.num_commande}${r.num_type_produit}`,
        fournisseur: r.code_fournisseur,
        type_mouvement: m.type_mouvement,
        poids_mouvement: m.poids_mouvement,
        lieu_destination: m.lieu_destination,
        client: m.client,
        n_commande_client: m.n_commande_client,
        texte_libre: m.texte_libre,
        utilisateur: m.utilisateur,
        num_commande_fabrication: m.bobine.num_commande_fabrication,
        dimension,
        matiere: r.matiere,
        durete: r.durete,
        revetement: r.revetement
      }
    })

    return NextResponse.json(operations)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
