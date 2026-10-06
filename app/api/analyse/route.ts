import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Analyse complete des mouvements : chaque bobine avec sa reception (lot,
// fournisseur, dimension) et l'historique chronologique de ses mouvements
// (entree fournisseur, sorties usine, retours usine, mises au dechet...)
export async function GET() {
  try {
    const bobines = await prisma.bobine.findMany({
      include: {
        reception: true,
        mouvements: {
          orderBy: [{ date_mouvement: 'asc' }, { id: 'asc' }]
        }
      },
      orderBy: { code_bobine: 'asc' }
    })

    return NextResponse.json(bobines)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
