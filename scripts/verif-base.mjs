// Diagnostic d'une base : schéma, compteurs, marqueur de site.
// Usage :  node scripts/verif-base.mjs "postgresql://..."
//          node scripts/verif-base.mjs --env .env.srga
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const arg = process.argv[2]
if (!arg) {
  console.error('Usage : node scripts/verif-base.mjs "<DATABASE_URL>" | --env .env.srga')
  process.exit(2)
}

let url = arg
if (arg === '--env') {
  const f = process.argv[3]
  const ligne = readFileSync(f, 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('DATABASE_URL='))
  if (!ligne) {
    console.error(`DATABASE_URL introuvable dans ${f}`)
    process.exit(2)
  }
  url = ligne.slice(ligne.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

const prisma = new PrismaClient({ datasources: { db: { url } } })

try {
  const [receptions, bobines, mouvements, items, users, connections, parametres] =
    await Promise.all([
      prisma.reception.count(),
      prisma.bobine.count(),
      prisma.mouvement.count(),
      prisma.itemPersonnalise.count(),
      prisma.user.count(),
      prisma.connectionLog.count(),
      prisma.parametre.count(),
    ])
  console.log('✅ Schéma en place')
  console.log(
    `   réceptions=${receptions} bobines=${bobines} mouvements=${mouvements} items=${items} utilisateurs=${users} connexions=${connections} paramètres=${parametres}`
  )
  const marqueurs = await prisma.parametre.findMany()
  console.log(`   marqueur de site : ${marqueurs.map((m) => `${m.cle}=${m.valeur}`).join(', ') || '(aucun)'}`)
  const somme = await prisma.bobine.aggregate({
    _sum: { poids_initial: true, poids_actuel: true },
  })
  console.log(
    `   poids initial=${Number(somme._sum.poids_initial ?? 0).toFixed(2)} kg  actuel=${Number(somme._sum.poids_actuel ?? 0).toFixed(2)} kg`
  )
} catch (e) {
  console.log('❌ ÉCHEC : ' + String(e.message).split('\n').filter(Boolean).slice(0, 4).join(' | '))
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
