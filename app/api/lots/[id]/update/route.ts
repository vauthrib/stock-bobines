import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const receptionId = parseInt(id)
    const data = await request.json()

    // Vérifier que le lot existe
    const existing = await prisma.reception.findUnique({
      where: { id: receptionId },
      include: { bobines: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    // Vérifier l'unicité si on change les codes
    if (
      data.code_fournisseur !== existing.code_fournisseur ||
      data.num_commande !== existing.num_commande ||
      data.num_type_produit !== existing.num_type_produit
    ) {
      const duplicate = await prisma.reception.findUnique({
        where: {
          code_fournisseur_num_commande_num_type_produit: {
            code_fournisseur: data.code_fournisseur,
            num_commande: data.num_commande,
            num_type_produit: data.num_type_produit
          }
        }
      })

      if (duplicate && duplicate.id !== receptionId) {
        return NextResponse.json({ error: 'Ce lot existe déjà' }, { status: 400 })
      }
    }

    // Transaction atomique
    await prisma.$transaction(async (tx) => {
      // Mettre à jour la réception
      await tx.reception.update({
        where: { id: receptionId },
        data: {
          code_fournisseur: data.code_fournisseur,
          num_commande: data.num_commande,
          num_type_produit: data.num_type_produit,
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

      // Supprimer les bobines qui ne sont plus dans la liste
      const bobineIds = data.bobines.map((b: any) => b.id).filter((id: number) => id > 0)
      const bobinesASupprimer = existing.bobines.filter(b => !bobineIds.includes(b.id))
      
      for (const bobine of bobinesASupprimer) {
        await tx.mouvement.deleteMany({ where: { bobine_id: bobine.id } })
        await tx.bobine.delete({ where: { id: bobine.id } })
      }

      // Mettre à jour ou créer les bobines
      const nouveauCodeLot = `${data.code_fournisseur}${data.num_commande}${data.num_type_produit}`
      
      for (let i = 0; i < data.bobines.length; i++) {
        const bobineData = data.bobines[i]
        const numBobine = i + 1
        const nouveauCodeBobine = `${nouveauCodeLot}-${numBobine.toString().padStart(2, '0')}`

        if (bobineData.id > 0) {
          // Mettre à jour une bobine existante
          await tx.bobine.update({
            where: { id: bobineData.id },
            data: {
              code_bobine: nouveauCodeBobine,
              num_bobine: numBobine,
              poids_initial: parseFloat(bobineData.poids_initial),
              poids_actuel: parseFloat(bobineData.poids_actuel),
              statut: bobineData.statut,
              lieu: bobineData.lieu,
              num_commande_fabrication: bobineData.num_commande_fabrication || null
            }
          })
        } else {
          // Créer une nouvelle bobine
          await tx.bobine.create({
            data: {
              reception_id: receptionId,
              code_bobine: nouveauCodeBobine,
              num_bobine: numBobine,
              poids_initial: parseFloat(bobineData.poids_initial),
              poids_actuel: parseFloat(bobineData.poids_actuel),
              statut: bobineData.statut || 'EN_STOCK',
              lieu: bobineData.lieu || 'STOCK_PRINCIPAL',
              num_commande_fabrication: bobineData.num_commande_fabrication || null
            }
          })
        }
      }
    })

    return NextResponse.json({ message: 'Lot mis à jour avec succès' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur: ' + (error as Error).message }, { status: 500 })
  }
}