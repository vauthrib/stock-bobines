import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const LABELS: Record<string, string> = {
  ENTREE_FOURNISSEUR: 'Entree en stock (fournisseur)',
  SORTIE_USINE: 'Sortie stock vers usine',
  RETOUR_USINE: 'Retour usine vers stock',
  SORTIE_DECHET: 'Sortie dechet (rebut)',
  TRANSFERT_VERS_USINE: 'Transfert vers usine',
  TRANSFERT_VERS_STOCK: 'Transfert vers stock',
  TRANSFERT_VERS_DECHET: 'Transfert vers dechet'
}

const fmtDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })

// Échappement CSV (séparateur ; pour Excel FR)
const esc = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  try {
    const mouvements = await prisma.mouvement.findMany({
      include: {
        bobine: {
          include: { reception: true }
        }
      },
      orderBy: [{ date_mouvement: 'asc' }, { id: 'asc' }]
    })

    // Reconstitution du poids restant après chaque pointage (lecture seule, aucune écriture)
    const poidsRestant = new Map<number, number>()
    const poidsInitial = new Map<number, number>()

    const headers = [
      'Date', 'Heure', 'Code Bobine', 'Lot', 'Type de pointage',
      'Poids pointe (kg)', 'Poids restant apres (kg)', 'Poids initial bobine (kg)',
      'Dimension', 'Matiere', 'Durete', 'Revetement',
      'Fournisseur', 'N commande', 'Type produit',
      'N commande fabrication', 'Lieu apres pointage',
      'Client', 'N commande client', 'Note'
    ]

    const rows = mouvements.map(m => {
      const b = m.bobine
      const r = b.reception

      if (!poidsInitial.has(b.id)) {
        poidsInitial.set(b.id, parseFloat(b.poids_initial.toString()))
        poidsRestant.set(b.id, parseFloat(b.poids_initial.toString()))
      }
      const p = parseFloat(m.poids_mouvement.toString())
      if (m.type_mouvement === 'ENTREE_FOURNISSEUR' || m.type_mouvement === 'RETOUR_USINE') {
        poidsRestant.set(b.id, p)
      } else if (m.type_mouvement === 'SORTIE_DECHET' || m.type_mouvement === 'TRANSFERT_VERS_DECHET') {
        poidsRestant.set(b.id, 0)
      }

      const dimension = r.type_materiel === 'Fil'
        ? `Ø${r.diametre_fil}`
        : `${r.largeur_feuillard}x${r.longueur_feuillard}`
      const lot = `${r.code_fournisseur}${r.num_commande}${r.num_type_produit}`
      const d = new Date(m.date_mouvement)

      return [
        fmtDate.format(d),
        fmtHeure.format(d),
        b.code_bobine,
        lot,
        LABELS[m.type_mouvement] || m.type_mouvement,
        m.poids_mouvement.toString(),
        poidsRestant.get(b.id)!.toFixed(2),
        poidsInitial.get(b.id)!.toFixed(2),
        dimension,
        r.matiere,
        r.durete,
        r.revetement,
        r.code_fournisseur,
        r.num_commande,
        r.num_type_produit,
        b.num_commande_fabrication || '',
        m.lieu_destination || b.lieu,
        m.client || '',
        m.n_commande_client || '',
        m.texte_libre || ''
      ].map(esc).join(';')
    })

    // Récapitulatif en fin de fichier
    const total = (t: string) => mouvements.filter(m => m.type_mouvement === t).reduce((s, m) => s + parseFloat(m.poids_mouvement.toString()), 0)
    const count = (t: string) => mouvements.filter(m => m.type_mouvement === t).length
    rows.push('')
    rows.push('RECAPITULATIF')
    rows.push(`Nombre de pointages : ${mouvements.length}`)
    rows.push(`Entrees en stock : ${count('ENTREE_FOURNISSEUR')} pointage(s), ${total('ENTREE_FOURNISSEUR').toFixed(2)} kg`)
    rows.push(`Transferts vers usine : ${count('TRANSFERT_VERS_USINE') + count('SORTIE_USINE')} pointage(s)`)
    rows.push(`Retours usine : ${count('RETOUR_USINE')} pointage(s), ${total('RETOUR_USINE').toFixed(2)} kg`)
    rows.push(`Mises au rebut : ${count('SORTIE_DECHET') + count('TRANSFERT_VERS_DECHET')} pointage(s), ${(total('SORTIE_DECHET') + total('TRANSFERT_VERS_DECHET')).toFixed(2)} kg`)

    const csv = [headers.join(';'), ...rows].join('\n')
    const BOM = '\uFEFF'
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pointages_bobines_${date}.csv"`
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
