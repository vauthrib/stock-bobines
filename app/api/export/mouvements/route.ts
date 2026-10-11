import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { nombreCsv } from '@/lib/csv'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const numCommande = searchParams.get('commande')
    
    let where = {}
    if (numCommande) {
      where = {
        n_commande_client: numCommande
      }
    }

    const mouvements = await prisma.mouvement.findMany({
      where,
      include: {
        bobine: {
          include: {
            reception: true
          }
        }
      },
      orderBy: { date_mouvement: 'desc' }
    })

    // Calcul du poids total par type de mouvement
    const sortiesUsine = mouvements.filter(m => m.type_mouvement === 'SORTIE_USINE')
    const poidsTotalSortie = sortiesUsine.reduce((sum, m) => sum + parseFloat(m.poids_mouvement.toString()), 0)
    
    const dechets = mouvements.filter(m => m.type_mouvement === 'SORTIE_DECHET')
    const poidsTotalDechet = dechets.reduce((sum, m) => sum + parseFloat(m.poids_mouvement.toString()), 0)

    const headers = [
      'Date', 'Code Bobine', 'Type Mouvement', 'Poids (kg)',
      'Client', 'N° Commande Client', 'Matière', 'Dureté',
      'Lieu Destination', 'Note'
    ]

    const rows = mouvements.map(m => {
      const b = m.bobine
      const r = b.reception
      return [
        m.date_mouvement.toISOString().replace('T', ' ').substring(0, 16),
        b.code_bobine,
        m.type_mouvement,
        nombreCsv(m.poids_mouvement.toString()),
        m.client || '',
        m.n_commande_client || '',
        r.matiere,
        r.durete,
        m.lieu_destination || '',
        m.texte_libre || ''
      ].join(';')
    })

    // Ajouter les totaux en fin de fichier
    rows.push('')
    rows.push('RÉCAPITULATIF')
    rows.push(`Total sorties usine: ${nombreCsv(poidsTotalSortie.toFixed(2))} kg`)
    rows.push(`Total déchets: ${nombreCsv(poidsTotalDechet.toFixed(2))} kg`)
    rows.push(`Poids total utilisé: ${nombreCsv((poidsTotalSortie + poidsTotalDechet).toFixed(2))} kg`)

    const csv = [headers.join(';'), ...rows].join('\n')
    const BOM = '\uFEFF'

    const filename = numCommande 
      ? `mouvements_${numCommande}.csv`
      : 'tous_mouvements.csv'

    return new NextResponse(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}