import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validation
    if (data.nombre_bobines > 99) {
      return NextResponse.json({ error: 'Maximum 99 bobines par lot' }, { status: 400 })
    }

    // Vérifier si le lot existe déjà
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

    // Créer la réception
    const reception = await prisma.reception.create({
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

    // Créer les bobines
    const bobines = []
    for (let i = 1; i <= data.nombre_bobines; i++) {
      const numBobine = i.toString().padStart(2, '0')
      const codeBobine = `${reception.code_fournisseur}${reception.num_commande}${reception.num_type_produit}-${numBobine}`
      
      const bobine = await prisma.bobine.create({
        data: {
          reception_id: reception.id,
          code_bobine: codeBobine,
          num_bobine: i,
          poids_initial: parseFloat(data.poids_par_bobine),
          poids_actuel: parseFloat(data.poids_par_bobine),
          statut: 'EN_STOCK'
        }
      })
      
      // Enregistrer le mouvement d'entrée
      await prisma.mouvement.create({
        data: {
          bobine_id: bobine.id,
          type_mouvement: 'ENTREE_FOURNISSEUR',
          poids_mouvement: parseFloat(data.poids_par_bobine)
        }
      })
      
      bobines.push(bobine)
    }

    return NextResponse.json({ 
      message: `Réception créée avec ${data.nombre_bobines} bobines`,
      reception,
      bobines
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}