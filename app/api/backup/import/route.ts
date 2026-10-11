import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refusEcritureAutreSite } from '@/lib/site-base'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  const clean = dateStr.trim()
  
  const formats = [
    clean,
    clean.replace(' ', 'T'),
    clean.split(' ')[0] + 'T00:00:00.000Z',
    clean.split('T')[0] + 'T00:00:00.000Z'
  ]
  
  for (const fmt of formats) {
    const date = new Date(fmt)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    // Jamais d'import (donc d'écrasement) sur la base d'un autre site
    const refus = await refusEcritureAutreSite()
    if (refus) return refus

    const formData = await request.formData()
    const allFile = formData.get('all') as File | null

    if (!allFile || allFile.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Lire le contenu
    const content = await allFile.text()
    const cleanContent = content.replace(/^\uFEFF/, '')
    
    // Séparer par sections
    const sections: Record<string, string[]> = {}
    let currentSection = ''
    const lines = cleanContent.split(/\r?\n/)
    
    for (const line of lines) {
      const trimmed = line.trim()
      const sectionMatch = trimmed.match(/^###SECTION:(\w+)###$/)
      if (sectionMatch) {
        currentSection = sectionMatch[1]
        sections[currentSection] = []
        continue
      }
      if (currentSection && trimmed) {
        sections[currentSection].push(trimmed)
      }
    }

    // Parser chaque section
    const parseSectionData = (sectionName: string) => {
      const sectionLines = sections[sectionName] || []
      if (sectionLines.length === 0) return []
      
      const headers = parseCsvLine(sectionLines[0])
      const rows = sectionLines.slice(1).map(line => {
        const values = parseCsvLine(line)
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || ''
        })
        return obj
      })
      
      return rows
    }

    const receptionsData = parseSectionData('RECEPTIONS')
    const bobinesData = parseSectionData('BOBINES')
    const mouvementsData = parseSectionData('MOUVEMENTS')
    const itemsData = parseSectionData('ITEMS')

    console.log('Sections trouvées:', Object.keys(sections))
    console.log('Réceptions:', receptionsData.length)
    console.log('Bobines:', bobinesData.length)
    console.log('Mouvements:', mouvementsData.length)
    console.log('Items:', itemsData.length)

    // VALIDATION AVANT import
    const receptionIdMap = new Map<number, number>()
    const bobineIdMap = new Map<number, number>()
    
    // Valider les réceptions
    for (let i = 0; i < receptionsData.length; i++) {
      const row = receptionsData[i]
      if (!row.id || !row.code_fournisseur || !row.num_commande || !row.num_type_produit) {
        return NextResponse.json({ 
          error: `Réception ligne ${i + 1}: champs manquants (id, code_fournisseur, num_commande, num_type_produit)` 
        }, { status: 400 })
      }
      const date = parseDate(row.date_reception)
      if (!date) {
        return NextResponse.json({ 
          error: `Réception ligne ${i + 1}: date invalide "${row.date_reception}"` 
        }, { status: 400 })
      }
    }

    // Valider les bobines
    for (let i = 0; i < bobinesData.length; i++) {
      const row = bobinesData[i]
      if (!row.id || !row.reception_id || !row.code_bobine) {
        return NextResponse.json({ 
          error: `Bobine ligne ${i + 1}: champs manquants (id, reception_id, code_bobine)` 
        }, { status: 400 })
      }
    }

    // Valider les mouvements
    for (let i = 0; i < mouvementsData.length; i++) {
      const row = mouvementsData[i]
      if (!row.id || !row.bobine_id) {
        return NextResponse.json({ 
          error: `Mouvement ligne ${i + 1}: champs manquants (id, bobine_id)` 
        }, { status: 400 })
      }
      const date = parseDate(row.date_mouvement)
      if (!date) {
        return NextResponse.json({ 
          error: `Mouvement ligne ${i + 1}: date invalide "${row.date_mouvement}"` 
        }, { status: 400 })
      }
    }

    // TOUT EST VALIDE, on peut procéder SANS transaction (plus rapide)
    try {
      // Effacer dans l'ordre
      await prisma.mouvement.deleteMany()
      await prisma.bobine.deleteMany()
      await prisma.reception.deleteMany()
      await prisma.itemPersonnalise.deleteMany()

      // Importer les items
      for (const row of itemsData) {
        try {
          await prisma.itemPersonnalise.create({
            data: {
              categorie: row.categorie as any,
              nom: row.nom,
              ordre: parseInt(row.ordre) || 0
            }
          })
        } catch (e) {
          console.log('Item ignoré:', row)
        }
      }

      // Importer les réceptions
      for (const row of receptionsData) {
        const oldId = parseInt(row.id)
        const date = parseDate(row.date_reception)
        if (!date || isNaN(oldId)) continue
        
        const newReception = await prisma.reception.create({
          data: {
            code_fournisseur: row.code_fournisseur,
            num_commande: row.num_commande,
            num_type_produit: row.num_type_produit,
            type_materiel: (row.type_materiel || 'Fil') as any,
            diametre_fil: row.diametre_fil ? parseFloat(row.diametre_fil) : null,
            longueur_feuillard: row.longueur_feuillard ? parseFloat(row.longueur_feuillard) : null,
            largeur_feuillard: row.largeur_feuillard ? parseFloat(row.largeur_feuillard) : null,
            matiere: row.matiere,
            durete: row.durete,
            revetement: row.revetement,
            date_reception: date
          }
        })
        receptionIdMap.set(oldId, newReception.id)
      }

      // Importer les bobines
      for (const row of bobinesData) {
        const oldId = parseInt(row.id)
        const oldReceptionId = parseInt(row.reception_id)
        const newReceptionId = receptionIdMap.get(oldReceptionId)
        
        if (!newReceptionId || isNaN(oldId)) continue
        
        const newBobine = await prisma.bobine.create({
          data: {
            reception_id: newReceptionId,
            code_bobine: row.code_bobine,
            num_bobine: parseInt(row.num_bobine) || 1,
            poids_initial: parseFloat(row.poids_initial) || 0,
            poids_actuel: parseFloat(row.poids_actuel) || 0,
            statut: (row.statut || 'EN_STOCK') as any,
            lieu: (row.lieu || 'STOCK_PRINCIPAL') as any,
            num_commande_fabrication: row.num_commande_fabrication || null
          }
        })
        bobineIdMap.set(oldId, newBobine.id)
      }

      // Importer les mouvements
      for (const row of mouvementsData) {
        const oldBobineId = parseInt(row.bobine_id)
        const newBobineId = bobineIdMap.get(oldBobineId)
        const date = parseDate(row.date_mouvement)
        
        if (!newBobineId || !date) continue

        await prisma.mouvement.create({
          data: {
            bobine_id: newBobineId,
            type_mouvement: (row.type_mouvement || 'ENTREE_FOURNISSEUR') as any,
            poids_mouvement: parseFloat(row.poids_mouvement) || 0,
            n_commande_client: row.n_commande_client || null,
            client: row.client || null,
            texte_libre: row.texte_libre || null,
            lieu_destination: row.lieu_destination ? (row.lieu_destination as any) : null,
            date_mouvement: date
          }
        })
      }

      return NextResponse.json({ 
        message: 'Base restaurée avec succès',
        stats: {
          receptions: receptionsData.length,
          bobines: bobinesData.length,
          mouvements: mouvementsData.length,
          items: itemsData.length
        }
      })
    } catch (importError) {
      console.error('Erreur pendant l\'import:', importError)
      return NextResponse.json({ 
        error: 'Erreur pendant l\'import: ' + (importError as Error).message + '. Les données ont peut-être été partiellement importées.' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Erreur générale:', error)
    return NextResponse.json({ error: 'Erreur serveur: ' + (error as Error).message }, { status: 500 })
  }
}