import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mois = parseInt(searchParams.get('mois') || '1')
    
    const dateLimite = new Date()
    dateLimite.setMonth(dateLimite.getMonth() - mois)

    const mouvements = await prisma.mouvement.findMany({
      where: {
        date_mouvement: { gte: dateLimite },
        type_mouvement: { in: ['SORTIE_USINE', 'SORTIE_DECHET'] }
      },
      include: {
        bobine: {
          include: { reception: true }
        }
      },
      orderBy: { date_mouvement: 'desc' }
    })

    const headers = [
      'Date', 'Code Bobine', 'Type Sortie', 'Client',
      'N° Commande Client', 'Matière', 'Dureté', 'Revêtement',
      'Poids Sorti (kg)', 'Note'
    ]

    const rows = mouvements.map(m => {
      const b = m.bobine
      const r = b.reception
      return [
        m.date_mouvement.toISOString().replace('T', ' ').substring(0, 16),
        b.code_bobine,
        m.type_mouvement,
        m.client || '',
        m.n_commande_client || '',
        r.matiere,
        r.durete,
        r.revetement,
        m.poids_mouvement.toString(),
        m.texte_libre || ''
      ].join(';')
    })

    const csv = [headers.join(';'), ...rows].join('\n')
    const BOM = '\uFEFF'

    return new NextResponse(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consommation_${mois}_mois.csv"`
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}