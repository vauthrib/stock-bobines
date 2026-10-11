import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refusEcritureAutreSite } from '@/lib/site-base'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { login: 'asc' }
    })
    
    // Masquer les mots de passe
    const safeUsers = users.map(u => ({
      ...u,
      password: '••••••'
    }))
    
    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const data = await request.json()
    
    if (!data.login || !data.password) {
      return NextResponse.json({ error: 'Login et mot de passe requis' }, { status: 400 })
    }
    
    const user = await prisma.user.create({
      data: {
        login: data.login,
        password: data.password,
        isSuper: data.isSuper || false,
        isAdmin: data.isAdmin || false,
        actif: data.actif !== false
      }
    })
    
    return NextResponse.json(user)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ce login existe déjà' }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }
    
    const updateData: any = {}
    if (data.login !== undefined) updateData.login = data.login
    if (data.password !== undefined && data.password !== '••••••') updateData.password = data.password
    if (data.isSuper !== undefined) updateData.isSuper = data.isSuper
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin
    if (data.actif !== undefined) updateData.actif = data.actif
    
    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData
    })
    
    return NextResponse.json(user)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }
    
    await prisma.user.delete({
      where: { id: parseInt(id) }
    })
    
    return NextResponse.json({ message: 'Utilisateur supprimé' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
