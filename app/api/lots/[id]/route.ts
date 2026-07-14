import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const receptionId = parseInt(id)

    const reception = await prisma.reception.findUnique({
      where: { id: receptionId },
      include: {
        bobines: {
          include: {
            mouvements: {
              orderBy: { date_mouvement: 'desc' }
            }
          },
          orderBy: { num_bobine: 'asc' }
        }
      }
    })

    if (!reception) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    return NextResponse.json(reception)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}