import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase()
    
    const bobine = await prisma.bobine.findUnique({
      where: { code_bobine: code },
      include: {
        reception: true,
        mouvements: {
          orderBy: { date_mouvement: 'desc' },
          take: 5
        }
      }
    })

    if (!bobine) {
      return NextResponse.json({ error: 'Bobine introuvable' }, { status: 404 })
    }

    return NextResponse.json(bobine)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}