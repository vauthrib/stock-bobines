import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categorie = searchParams.get('categorie')
    
    const where = categorie ? { categorie: categorie as any } : {}
    
    const items = await prisma.itemPersonnalise.findMany({
      where,
      orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }, { nom: 'asc' }]
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const item = await prisma.itemPersonnalise.create({
      data: {
        categorie: data.categorie,
        nom: data.nom,
        ordre: data.ordre || 0,
        couleur: data.couleur || null,
        style: data.style || null
      }
    })

    return NextResponse.json(item)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cet item existe déjà' }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const item = await prisma.itemPersonnalise.update({
      where: { id: data.id },
      data: {
        nom: data.nom,
        ordre: data.ordre,
        ...(data.couleur !== undefined ? { couleur: data.couleur || null } : {}),
        ...(data.style !== undefined ? { style: data.style || null } : {})
      }
    })

    return NextResponse.json(item)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Cet item existe déjà' }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    await prisma.itemPersonnalise.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Item supprimé' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}