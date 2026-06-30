import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const bobines = await prisma.bobine.findMany({
      include: {
        reception: true
      },
      orderBy: { code_bobine: 'asc' }
    })

    return NextResponse.json(bobines)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}