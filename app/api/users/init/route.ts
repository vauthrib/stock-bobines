import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refusEcritureAutreSite } from '@/lib/site-base'

export async function POST() {
  try {
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const count = await prisma.user.count()
    
    if (count > 0) {
      return NextResponse.json({ message: 'Utilisateurs déjà existants', count })
    }
    
    const defaultUsers = [
      { login: 'Masrour', password: '7391', isSuper: false, isAdmin: false },
      { login: 'Khiara', password: '3719', isSuper: false, isAdmin: false },
      { login: 'Benamar', password: '9173', isSuper: false, isAdmin: false },
      { login: 'Benoit', password: '33142580', isSuper: true, isAdmin: true }
    ]
    
    for (const user of defaultUsers) {
      await prisma.user.create({ data: user })
    }
    
    return NextResponse.json({ message: 'Utilisateurs par défaut créés', count: defaultUsers.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}