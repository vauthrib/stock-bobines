import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { login, password, appareil } = await request.json()

    const user = await prisma.user.findUnique({ where: { login } })

    if (!user || user.password !== password) {
      return NextResponse.json({ valid: false, error: 'Login ou mot de passe incorrect' }, { status: 401 })
    }

    if (!user.actif) {
      return NextResponse.json({ valid: false, error: 'Compte désactivé' }, { status: 403 })
    }

    // Vérification jour & horaire (sauf Super Admin)
    if (!user.isSuper) {
      const now = new Date()
      const day = now.getDay() // 0=Dim, 1=Lun... 5=Ven, 6=Sam
      const currentTime = now.getHours() * 60 + now.getMinutes()
      
      const isWeekday = day >= 1 && day <= 5
      const isWorkingHours = currentTime >= 450 && currentTime < 1080 // 7h30 à 18h00

      if (!isWeekday || !isWorkingHours) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Accès autorisé uniquement du Lundi au Vendredi, de 7h30 à 18h00' 
        }, { status: 403 })
      }
    }

    // Logging (max 1000 entrées)
    try {
      const count = await prisma.connectionLog.count()
      if (count >= 1000) {
        const oldest = await prisma.connectionLog.findMany({ orderBy: { date_connexion: 'asc' }, take: 100 })
        await prisma.connectionLog.deleteMany({ where: { id: { in: oldest.map(l => l.id) } } })
      }
      await prisma.connectionLog.create({
        data: {
          utilisateur: user.login,
          appareil: appareil || 'Inconnu',
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
        }
      })
    } catch (logError) { console.error('Erreur logging:', logError) }

    return NextResponse.json({ 
      valid: true, 
      user: user.login,
      isSuper: user.isSuper,
      isAdmin: user.isAdmin
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}