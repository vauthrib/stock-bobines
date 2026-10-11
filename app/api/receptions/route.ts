import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (data.nombre_bobines > 99) {
      return NextResponse.json({ error: 'Maximum 99 bobines par lot' }, { status: 400 })
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

    // Créer les bobines avec leurs poids individuels
    const bobines = []
    const poidsParBobine = data.poids_bobines || []
    
    for (let i = 0; i < data.nombre_bobines; i++) {
      const numBobine = (i + 1).toString().padStart(2, '0')
      const codeBobine = `${reception.code_fournisseur}${reception.num_commande}${reception.num_type_produit}-${numBobine}`
      const poids = parseFloat(poidsParBobine[i]) || 0
      
      const bobine = await prisma.bobine.create({
        data: {
          reception_id: reception.id,
          code_bobine: codeBobine,
          num_bobine: i + 1,
          poids_initial: poids,
          poids_actuel: poids,
          statut: poids > 0 ? 'EN_STOCK' : 'EN_STOCK'
        }
      })
      
      // Enregistrer le mouvement d'entrée
      await prisma.mouvement.create({
        data: {
          bobine_id: bobine.id,
          type_mouvement: 'ENTREE_FOURNISSEUR',
          poids_mouvement: poids,
          utilisateur: data.utilisateur || null
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