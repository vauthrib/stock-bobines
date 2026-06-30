import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const bobines = await prisma.bobine.findMany({
      include: { reception: true },
      orderBy: { code_bobine: 'asc' }
    })

    // Construction du CSV (séparateur ; pour Excel FR)
    const headers = [
      'Code Bobine', 'Fournisseur', 'Commande', 'Type Produit',
      'Matière', 'Type', 'Dimension', 'Dureté', 'Revêtement',
      'Poids Initial', 'Poids Actuel', 'Statut', 'Date Réception'
    ]

    const rows = bobines.map(b => {
      const r = b.reception
      const dimension = r.type_materiel === 'Fil' 
        ? `Ø${r.diametre_fil}`
        : `${r.largeur_feuillard}x${r.longueur_feuillard}`
      
      return [
        b.code_bobine,
        r.code_fournisseur,
        r.num_commande,
        r.num_type_produit,
        r.matiere,
        r.type_materiel,
        dimension,
        r.durete,
        r.revetement,
        b.poids_initial.toString(),
        b.poids_actuel.toString(),
        b.statut,
        r.date_reception.toISOString().split('T')[0]
      ].join(';')
    })

    const csv = [headers.join(';'), ...rows].join('\n')
    
    // Ajouter BOM pour UTF-8 (pour les accents dans Excel)
    const BOM = '\uFEFF'
    
    return new NextResponse(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="stock_actuel.csv"'
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}