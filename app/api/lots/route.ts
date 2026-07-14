import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const receptions = await prisma.reception.findMany({
      include: {
        bobines: {
          orderBy: { num_bobine: 'asc' }
        }
      },
      orderBy: { date_reception: 'desc' }
    })

    return NextResponse.json(receptions)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}