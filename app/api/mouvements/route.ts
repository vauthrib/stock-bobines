import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const bobine = await prisma.bobine.findUnique({
      where: { code_bobine: data.code_bobine.toUpperCase() },
      include: { reception: true }
    })

    if (!bobine) {
      return NextResponse.json({ error: 'Bobine introuvable' }, { status: 404 })
    }

    let nouveauPoids = parseFloat(bobine.poids_actuel.toString())
    let nouveauLieu = bobine.lieu
    let nouveauStatut = bobine.statut
    const poidsMouvement = parseFloat(data.poids_mouvement) || 0
    const poidsInitial = parseFloat(bobine.poids_initial.toString())

    // Logique selon le type de mouvement
    if (data.type_mouvement === 'TRANSFERT_VERS_USINE') {
      if (bobine.lieu === 'USINE') {
        return NextResponse.json({ error: 'Cette bobine est déjà en usine' }, { status: 400 })
      }
      nouveauLieu = 'USINE'
      nouveauStatut = 'EN_STOCK'
    } 
    else if (data.type_mouvement === 'RETOUR_USINE') {
      if (bobine.lieu !== 'USINE') {
        return NextResponse.json({ error: 'Cette bobine n\'est pas en usine' }, { status: 400 })
      }
      
      // CAS 1 : Poids = 0 → bobine finie, sort du stock
      if (poidsMouvement === 0) {
        nouveauPoids = 0
        nouveauStatut = 'DECHET'
        nouveauLieu = 'DECHET'
      }
      // CAS 2 : Poids = poids initial → retour sans consommation (erreur ou prod annulée)
      else if (poidsMouvement >= poidsInitial) {
        nouveauPoids = poidsInitial
        nouveauLieu = data.lieu_destination || 'STOCK_PRINCIPAL'
        nouveauStatut = 'EN_STOCK'
      }
      // CAS 3 : Poids < poids initial → retour normal avec consommation
      else {
        nouveauPoids = poidsMouvement
        nouveauLieu = data.lieu_destination || 'STOCK_PRINCIPAL'
        if (nouveauPoids <= 0) {
          nouveauStatut = 'VIDE'
        } else {
          nouveauStatut = 'PARTIELLE'
        }
      }
    }
    else if (data.type_mouvement === 'SORTIE_DECHET') {
      nouveauPoids = 0
      nouveauStatut = 'DECHET'
      nouveauLieu = 'DECHET'
    }
    else if (data.type_mouvement === 'ENTREE_FOURNISSEUR') {
      nouveauPoids = poidsMouvement
      nouveauStatut = 'EN_STOCK'
      nouveauLieu = 'STOCK_PRINCIPAL'
    }

    // Mettre à jour la bobine
    await prisma.bobine.update({
      where: { id: bobine.id },
      data: {
        poids_actuel: nouveauPoids,
        statut: nouveauStatut,
        lieu: nouveauLieu,
        num_commande_fabrication: data.num_commande_fabrication !== undefined 
          ? data.num_commande_fabrication 
          : bobine.num_commande_fabrication
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
        texte_libre: data.texte_libre || null,
        lieu_destination: nouveauLieu
      }
    })

    return NextResponse.json({ 
      message: 'Mouvement enregistré',
      poids_restant: nouveauPoids,
      statut: nouveauStatut,
      lieu: nouveauLieu
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}