import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Trouver la bobine
    const bobine = await prisma.bobine.findUnique({
      where: { code_bobine: data.code_bobine.toUpperCase() }
    })

    if (!bobine) {
      return NextResponse.json({ error: 'Bobine introuvable' }, { status: 404 })
    }

    let nouveauPoids = parseFloat(bobine.poids_actuel.toString())
    const poidsMouvement = parseFloat(data.poids_mouvement)

    // Logique de mise à jour du poids
    if (data.type_mouvement === 'SORTIE_USINE' || data.type_mouvement === 'SORTIE_DECHET') {
      if (poidsMouvement > nouveauPoids) {
        return NextResponse.json({ error: 'Poids supérieur au stock restant' }, { status: 400 })
      }
      nouveauPoids -= poidsMouvement
    } else if (data.type_mouvement === 'RETOUR_USINE') {
      nouveauPoids += poidsMouvement
    }

    // Déterminer le nouveau statut
    let nouveauStatut: 'EN_STOCK' | 'PARTIELLE' | 'VIDE' | 'DECHET' = 'EN_STOCK'
    if (nouveauPoids <= 0) {
      nouveauStatut = data.type_mouvement === 'SORTIE_DECHET' ? 'DECHET' : 'VIDE'
    } else if (nouveauPoids < parseFloat(bobine.poids_initial.toString())) {
      nouveauStatut = 'PARTIELLE'
    }

    // Mettre à jour la bobine
    await prisma.bobine.update({
      where: { id: bobine.id },
      data: {
        poids_actuel: nouveauPoids,
        statut: nouveauStatut
      }
    })

    // Enregistrer le mouvement
    await prisma.mouvement.create({
      data: {
        bobine_id: bobine.id,
        type_mouvement: data.type_mouvement,
        poids_mouvement: poidsMouvement,
        n_commande_client: data.n_commande_client || null,
        client: data.client || null,
        texte_libre: data.texte_libre || null
      }
    })

    return NextResponse.json({ 
      message: 'Mouvement enregistré',
      poids_restant: nouveauPoids,
      statut: nouveauStatut
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}