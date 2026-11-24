import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refusEcritureAutreSite } from '@/lib/site-base'

// Nombre maximum de bobines acceptées dans un lot (arrivage et modification)
const MAX_BOBINES_PAR_LOT = 250

export async function POST(request: NextRequest) {
  try {
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const data = await request.json()
    const nb = Number(data.nombre_bobines)

    if (!Number.isInteger(nb) || nb < 1) {
      return NextResponse.json({ error: `Nombre de bobines invalide (1 à ${MAX_BOBINES_PAR_LOT})` }, { status: 400 })
    }

    if (nb > MAX_BOBINES_PAR_LOT) {
      return NextResponse.json({ error: `Maximum ${MAX_BOBINES_PAR_LOT} bobines par lot` }, { status: 400 })
    }

    const existing = await prisma.reception.findUnique({
      where: {
        code_fournisseur_num_commande_num_type_produit: {
          code_fournisseur: data.code_fournisseur.toUpperCase(),
          num_commande: data.num_commande.padStart(2, '0'),
          num_type_produit: data.num_type_produit.padStart(2, '0')
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ce lot existe déjà' }, { status: 400 })
    }

    // Création en bloc : 1 insertion pour le lot, 1 pour les bobines, 1 pour les mouvements.
    // (250 bobines créées une par une feraient 500 allers-retours vers la base)
    const poidsParBobine = data.poids_bobines || []

    const { reception, bobines } = await prisma.$transaction(async (tx) => {
      const reception = await tx.reception.create({
        data: {
          code_fournisseur: data.code_fournisseur.toUpperCase(),
          num_commande: data.num_commande.padStart(2, '0'),
          num_type_produit: data.num_type_produit.padStart(2, '0'),
          type_materiel: data.type_materiel,
          diametre_fil: data.diametre_fil ? parseFloat(data.diametre_fil) : null,
          longueur_feuillard: data.longueur_feuillard ? parseFloat(data.longueur_feuillard) : null,
          largeur_feuillard: data.largeur_feuillard ? parseFloat(data.largeur_feuillard) : null,
          matiere: data.matiere,
          durete: data.durete,
          revetement: data.revetement,
          date_reception: new Date(data.date_reception)
        }
      })

      // Bobines avec leurs poids individuels
      await tx.bobine.createMany({
        data: Array.from({ length: nb }, (_, i) => {
          const poids = parseFloat(poidsParBobine[i]) || 0
          const numBobine = (i + 1).toString().padStart(2, '0')
          return {
            reception_id: reception.id,
            code_bobine: `${reception.code_fournisseur}${reception.num_commande}${reception.num_type_produit}-${numBobine}`,
            num_bobine: i + 1,
            poids_initial: poids,
            poids_actuel: poids,
            statut: 'EN_STOCK' as const
          }
        })
      })

      const bobines = await tx.bobine.findMany({
        where: { reception_id: reception.id },
        orderBy: { num_bobine: 'asc' }
      })

      // Enregistrer le mouvement d'entrée de chaque bobine
      await tx.mouvement.createMany({
        data: bobines.map(b => ({
          bobine_id: b.id,
          type_mouvement: 'ENTREE_FOURNISSEUR' as const,
          poids_mouvement: b.poids_initial,
          utilisateur: data.utilisateur || null
        }))
      })

      return { reception, bobines }
    }, { timeout: 30000 })

    return NextResponse.json({ 
      message: `Réception créée avec ${nb} bobines`,
      reception,
      bobines
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}