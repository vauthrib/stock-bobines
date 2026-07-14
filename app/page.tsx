'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'

type Bobine = {
  id: number
  code_bobine: string
  poids_initial: string
  poids_actuel: string
  statut: string
  lieu: string
  num_commande_fabrication: string | null
  reception: {
    code_fournisseur: string
    num_commande: string
    num_type_produit: string
    matiere: string
    type_materiel: string
    diametre_fil: string | null
    largeur_feuillard: string | null
    longueur_feuillard: string | null
    durete: string
    revetement: string
    date_reception: string
  }
}

type ReceptionData = {
  code_fournisseur: string
  num_commande: string
  num_type_produit: string
  type_materiel: string
  diametre_fil?: string
  longueur_feuillard?: string
  largeur_feuillard?: string
  matiere: string
  durete: string
  revetement: string
  date_reception: string
  nombre_bobines: number
  poids_bobines: number[]
}

export default function Home() {
  const [bobines, setBobines] = useState<Bobine[]>([])
  const [etatResume, setEtatResume] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState<'home' | 'arrivage' | 'usine' | 'retour_usine' | 'retour' | 'etat' | 'autre'>('home')

  const [wizardStep, setWizardStep] = useState(1)
  const [receptionData, setReceptionData] = useState<ReceptionData>({
    code_fournisseur: '',
    num_commande: '',
    num_type_produit: '',
    type_materiel: 'Fil',
    matiere: '',
    durete: '',
    revetement: '',
    date_reception: new Date().toISOString().split('T')[0],
    nombre_bobines: 1,
    poids_bobines: []
  })

  const [showScan, setShowScan] = useState(false)
  const [selectedBobine, setSelectedBobine] = useState<Bobine | null>(null)
  const [numCommandeFabrication, setNumCommandeFabrication] = useState('')
  const [poidsRestant, setPoidsRestant] = useState('')

  const [showEtiquette, setShowEtiquette] = useState(false)
  const [bobinesToPrint, setBobinesToPrint] = useState<Bobine[]>([])

  const [codeAcces, setCodeAcces] = useState('')
  const [autreAcces, setAutreAcces] = useState(false)
  const [moisConso, setMoisConso] = useState(3)
  const [commandeFilter, setCommandeFilter] = useState('')

  const [diametreFilter, setDiametreFilter] = useState<string>('')
  const [filtreDiametreUsine, setFiltreDiametreUsine] = useState<string>('')
  const [rechercheNomUsine, setRechercheNomUsine] = useState('')

  const [itemsMatiere, setItemsMatiere] = useState<any[]>([])
  const [itemsDurete, setItemsDurete] = useState<any[]>([])
  const [itemsRev, setItemsRev] = useState<any[]>([])

  const [backupFile, setBackupFile] = useState<File | null>(null)

  // États pour l'édition de lots
  const [showEditLot, setShowEditLot] = useState(false)
  const [lots, setLots] = useState<any[]>([])
  const [editingLot, setEditingLot] = useState<any>(null)

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'https://stock-bobines.vercel.app'
  }

  useEffect(() => {
    chargerBobines()
    chargerItems()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [])

  const chargerBobines = async () => {
    try {
      const res = await fetch('/api/bobines')
      const data = await res.json()
      setBobines(data)
    } catch (error) {
      console.error(error)
    }
  }

  const chargerEtat = async () => {
    try {
      const res = await fetch('/api/etat')
      const data = await res.json()
      setEtatResume(data)
    } catch (error) {
      console.error(error)
    }
  }

  const chargerItems = async () => {
    try {
      const [matRes, durRes, revRes] = await Promise.all([
        fetch('/api/items?categorie=MATIERE'),
        fetch('/api/items?categorie=DURETE'),
        fetch('/api/items?categorie=REVETEMENT')
      ])
      setItemsMatiere(await matRes.json())
      setItemsDurete(await durRes.json())
      setItemsRev(await revRes.json())
    } catch (error) {
      console.error(error)
    }
  }

  const chargerLots = async () => {
    try {
      const res = await fetch('/api/lots')
      const data = await res.json()
      setLots(data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleReset = async () => {
    if (confirm('⚠️ Effacer TOUTES les données ? Cette action est irréversible !')) {
      try {
        await fetch('/api/reset', { method: 'POST' })
        alert('✅ Base réinitialisée')
        chargerBobines()
        chargerItems()
      } catch (error) {
        alert('❌ Erreur')
      }
    }
  }

  const handleExportBase = async () => {
    try {
      const res = await fetch('/api/backup/all')
      if (!res.ok) throw new Error('Erreur serveur')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `backup_stock_bobines_${date}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      alert('✅ Fichier CSV de backup téléchargé')
    } catch (error) {
      alert('❌ Erreur lors de l\'export')
    }
  }

  const handleImportBase = async () => {
    if (!backupFile) {
      alert('⚠️ Veuillez sélectionner un fichier CSV')
      return
    }

    if (!confirm('⚠️ Cette action va ÉCRASER toutes les données actuelles. Continuer ?')) {
      return
    }

    try {
      const formData = new FormData()
      formData.append('all', backupFile)

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert('✅ Base restaurée avec succès')
        chargerBobines()
        chargerItems()
        setBackupFile(null)
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'import')
    }
  }

  const handleEditLot = async (lotId: number) => {
    try {
      const res = await fetch(`/api/lots/${lotId}`)
      const data = await res.json()
      setEditingLot(data)
      setShowEditLot(true)
    } catch (error) {
      alert('❌ Erreur de chargement du lot')
    }
  }

  const handleSaveLot = async () => {
    if (!editingLot) return

    try {
      const res = await fetch(`/api/lots/${editingLot.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLot)
      })

      if (res.ok) {
        alert('✅ Lot mis à jour avec succès')
        setShowEditLot(false)
        setEditingLot(null)
        chargerBobines()
        chargerLots()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      alert('❌ Erreur de sauvegarde')
    }
  }

  const handleAddBobine = () => {
    if (!editingLot) return
    const newBobine = {
      id: 0,
      code_bobine: '',
      num_bobine: editingLot.bobines.length + 1,
      poids_initial: '0',
      poids_actuel: '0',
      statut: 'EN_STOCK',
      lieu: 'STOCK_PRINCIPAL',
      num_commande_fabrication: ''
    }
    setEditingLot({
      ...editingLot,
      bobines: [...editingLot.bobines, newBobine]
    })
  }

  const handleRemoveBobine = (index: number) => {
    if (!editingLot) return
    if (!confirm('Supprimer cette bobine ? Tous ses mouvements seront aussi supprimés.')) return
    
	const newBobines = editingLot.bobines.filter((_: any, i) => i !== index)
    setEditingLot({
      ...editingLot,
      bobines: newBobines
    })
  }

  const handleUpdateBobine = (index: number, field: string, value: any) => {
    if (!editingLot) return
    const newBobines = [...editingLot.bobines]
    newBobines[index] = { ...newBobines[index], [field]: value }
    setEditingLot({ ...editingLot, bobines: newBobines })
  }

  const handleEtape1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    setReceptionData({
      ...receptionData,
      code_fournisseur: (formData.get('code_fournisseur') as string).toUpperCase(),
      num_commande: formData.get('num_commande') as string,
      num_type_produit: formData.get('num_type_produit') as string
    })
    
    setWizardStep(2)
  }

  const handleEtape2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    const nombreBobines = parseInt(formData.get('nombre_bobines') as string)
    
    setReceptionData({
      ...receptionData,
      type_materiel: formData.get('type_materiel') as string,
      diametre_fil: formData.get('diametre_fil') as string,
      longueur_feuillard: formData.get('longueur_feuillard') as string,
      largeur_feuillard: formData.get('largeur_feuillard') as string,
      matiere: formData.get('matiere') as string,
      durete: formData.get('durete') as string,
      revetement: formData.get('revetement') as string,
      date_reception: formData.get('date_reception') as string,
      nombre_bobines: nombreBobines,
      poids_bobines: new Array(nombreBobines).fill(0)
    })
    
    setWizardStep(3)
  }

  const handlePoidsChange = (index: number, value: string) => {
    const newPoids = [...receptionData.poids_bobines]
    newPoids[index] = parseFloat(value) || 0
    setReceptionData({ ...receptionData, poids_bobines: newPoids })
  }

  const poidsTotal = receptionData.poids_bobines.reduce((sum, p) => sum + p, 0)

  const handleValiderReception = async () => {
    try {
      const res = await fetch('/api/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receptionData)
      })
      
      if (res.ok) {
        await res.json()
        
        const bobinesCompletes = await fetch('/api/bobines').then(r => r.json())
        const bobinesDuLot = bobinesCompletes.filter((b: Bobine) => 
          b.reception.code_fournisseur === receptionData.code_fournisseur &&
          b.reception.num_commande === receptionData.num_commande.padStart(2, '0') &&
          b.reception.num_type_produit === receptionData.num_type_produit.padStart(2, '0')
        )
        
        alert('✅ Réception créée avec succès !')
        
        if (confirm('Voulez-vous imprimer les étiquettes maintenant ?')) {
          setBobinesToPrint(bobinesDuLot)
          setShowEtiquette(true)
        } else {
          setCurrentPage('home')
          setWizardStep(1)
        }
        chargerBobines()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      alert('❌ Erreur de connexion')
    }
  }

  const startScanner = () => {
    setShowScan(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        qrbox: { width: 250, height: 250 },
        fps: 5
      }, false)

      scanner.render(
        (decodedText) => {
          const bobine = bobines.find(b => b.code_bobine === decodedText.toUpperCase())
          if (bobine) {
            setSelectedBobine(bobine)
            setShowScan(false)
            scanner.clear()
          } else {
            alert('❌ Bobine non trouvée')
          }
        },
        (error) => {}
      )

      scannerRef.current = scanner
    }, 100)
  }

  const handleVersUsine = async () => {
    if (!selectedBobine) return
    
    if (selectedBobine.lieu === 'USINE') {
      alert('⚠️ Cette bobine est déjà en usine')
      return
    }
    
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: selectedBobine.code_bobine,
          type_mouvement: 'TRANSFERT_VERS_USINE',
          poids_mouvement: 0,
          num_commande_fabrication: numCommandeFabrication
        })
      })
      if (res.ok) {
        alert('✅ Transférée vers usine')
        setCurrentPage('home')
        setSelectedBobine(null)
        setNumCommandeFabrication('')
        chargerBobines()
      }
    } catch (error) {
      alert('❌ Erreur')
    }
  }

  const handleRetourUsine = async () => {
    if (!selectedBobine) return
    
    if (selectedBobine.lieu !== 'USINE') {
      alert('⚠️ Cette bobine n\'est pas en usine')
      return
    }
    
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: selectedBobine.code_bobine,
          type_mouvement: 'RETOUR_USINE',
          poids_mouvement: parseFloat(poidsRestant),
          lieu_destination: 'STOCK_PRINCIPAL'
        })
      })
      if (res.ok) {
        alert('✅ Retour stock principal')
        setCurrentPage('home')
        setSelectedBobine(null)
        setPoidsRestant('')
        chargerBobines()
      }
    } catch (error) {
      alert('❌ Erreur')
    }
  }

  const handleRetourDechet = async () => {
    if (!selectedBobine) return
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: selectedBobine.code_bobine,
          type_mouvement: 'SORTIE_DECHET',
          poids_mouvement: parseFloat(selectedBobine.poids_actuel)
        })
      })
      if (res.ok) {
        alert('✅ Mise au rebut')
        setCurrentPage('home')
        setSelectedBobine(null)
        chargerBobines()
      }
    } catch (error) {
      alert('❌ Erreur')
    }
  }

  const lotsDisponibles = bobines.reduce((acc, bobine) => {
    const key = `${bobine.reception.code_fournisseur}-${bobine.reception.num_commande}-${bobine.reception.num_type_produit}`
    if (!acc[key]) {
      acc[key] = {
        id: key,
        code_fournisseur: bobine.reception.code_fournisseur,
        num_commande: bobine.reception.num_commande,
        num_type_produit: bobine.reception.num_type_produit,
        nom: `${bobine.reception.code_fournisseur}${bobine.reception.num_commande}${bobine.reception.num_type_produit}`,
        nb_bobines: 0
      }
    }
    acc[key].nb_bobines++
    return acc
  }, {} as Record<string, any>)

  const handleImprimerLot = (lotKey: string) => {
    const lot = lotsDisponibles[lotKey]
    const bobinesDuLot = bobines.filter(b => 
      b.reception.code_fournisseur === lot.code_fournisseur &&
      b.reception.num_commande === lot.num_commande &&
      b.reception.num_type_produit === lot.num_type_produit
    )
    setBobinesToPrint(bobinesDuLot)
    setShowEtiquette(true)
  }

  const handleCodeAcces = () => {
    if (codeAcces === '1111') {
      setAutreAcces(true)
    } else {
      alert('❌ Code incorrect')
    }
  }

  const exporterCSV = (type: 'stock' | 'consommation' | 'mouvements') => {
    let url = ''
    if (type === 'stock') url = '/api/export/stock'
    else if (type === 'consommation') url = `/api/export/consommation?mois=${moisConso}`
    else if (type === 'mouvements') url = `/api/export/mouvements${commandeFilter ? `?commande=${commandeFilter}` : ''}`
    window.open(url, '_blank')
  }

  const diametresDisponibles = Array.from(new Set(
    bobines
      .filter(b => b.lieu === 'STOCK_PRINCIPAL' && b.reception.type_materiel === 'Fil' && b.reception.diametre_fil)
      .map(b => parseFloat(b.reception.diametre_fil!))
  )).sort((a, b) => a - b)

  const etatFiltre = etatResume
    .filter(item => {
      if (!diametreFilter) return true
      const match = item.dimension.match(/Ø?([\d.]+)/)
      if (!match) return true
      return parseFloat(match[1]) === parseFloat(diametreFilter)
    })
    .sort((a, b) => {
      const matchA = a.dimension.match(/Ø?([\d.]+)/)
      const matchB = b.dimension.match(/Ø?([\d.]+)/)
      const diamA = matchA ? parseFloat(matchA[1]) : 9999
      const diamB = matchB ? parseFloat(matchB[1]) : 9999
      return diamA - diamB
    })

  // ============ MODAL ÉDITION LOT ============
  if (showEditLot && editingLot) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-orange-900">✏️ Éditer le lot</h1>
            <button onClick={() => {
              setShowEditLot(false)
              setEditingLot(null)
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-md p-4">
            <h2 className="text-lg font-semibold mb-3">Informations du lot</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code Fournisseur</label>
                <input type="text" value={editingLot.code_fournisseur}
                  onChange={(e) => setEditingLot({ ...editingLot, code_fournisseur: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-md uppercase" maxLength={4} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">N° Commande</label>
                <input type="text" value={editingLot.num_commande}
                  onChange={(e) => setEditingLot({ ...editingLot, num_commande: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md" maxLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">N° Type Produit</label>
                <input type="text" value={editingLot.num_type_produit}
                  onChange={(e) => setEditingLot({ ...editingLot, num_type_produit: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md" maxLength={2} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={editingLot.type_materiel}
                  onChange={(e) => setEditingLot({ ...editingLot, type_materiel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="Fil">Fil</option>
                  <option value="Feuillard">Feuillard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date réception</label>
                <input type="date" value={editingLot.date_reception.split('T')[0]}
                  onChange={(e) => setEditingLot({ ...editingLot, date_reception: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>

            {editingLot.type_materiel === 'Fil' ? (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Diamètre (mm)</label>
                <input type="number" step="0.01" value={editingLot.diametre_fil || ''}
                  onChange={(e) => setEditingLot({ ...editingLot, diametre_fil: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Largeur (mm)</label>
                  <input type="number" step="0.01" value={editingLot.largeur_feuillard || ''}
                    onChange={(e) => setEditingLot({ ...editingLot, largeur_feuillard: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longueur (mm)</label>
                  <input type="number" step="0.01" value={editingLot.longueur_feuillard || ''}
                    onChange={(e) => setEditingLot({ ...editingLot, longueur_feuillard: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Matière</label>
                <select value={editingLot.matiere}
                  onChange={(e) => setEditingLot({ ...editingLot, matiere: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md">
                  {itemsMatiere.map(item => (
                    <option key={item.id} value={item.nom}>{item.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dureté</label>
                <select value={editingLot.durete}
                  onChange={(e) => setEditingLot({ ...editingLot, durete: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md">
                  {itemsDurete.map(item => (
                    <option key={item.id} value={item.nom}>{item.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Revêtement</label>
                <select value={editingLot.revetement}
                  onChange={(e) => setEditingLot({ ...editingLot, revetement: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md">
                  {itemsRev.map(item => (
                    <option key={item.id} value={item.nom}>{item.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Bobines ({editingLot.bobines.length})</h2>
              <button onClick={handleAddBobine}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
                ➕ Ajouter une bobine
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {editingLot.bobines.map((bobine: any, index: number) => (
                <div key={index} className="border rounded-md p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-sm">Bobine {index + 1}</h3>
                    <button onClick={() => handleRemoveBobine(index)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                      🗑️ Supprimer
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Poids initial (kg)</label>
                      <input type="number" step="0.01" value={bobine.poids_initial}
                        onChange={(e) => handleUpdateBobine(index, 'poids_initial', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Poids actuel (kg)</label>
                      <input type="number" step="0.01" value={bobine.poids_actuel}
                        onChange={(e) => handleUpdateBobine(index, 'poids_actuel', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Statut</label>
                      <select value={bobine.statut}
                        onChange={(e) => handleUpdateBobine(index, 'statut', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm">
                        <option value="EN_STOCK">En stock</option>
                        <option value="PARTIELLE">Partielle</option>
                        <option value="VIDE">Vide</option>
                        <option value="DECHET">Déchet</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Lieu</label>
                      <select value={bobine.lieu}
                        onChange={(e) => handleUpdateBobine(index, 'lieu', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm">
                        <option value="STOCK_PRINCIPAL">Stock Principal</option>
                        <option value="USINE">Usine</option>
                        <option value="DECHET">Déchet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">N° Commande Fabrication</label>
                      <input type="text" value={bobine.num_commande_fabrication || ''}
                        onChange={(e) => handleUpdateBobine(index, 'num_commande_fabrication', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => {
              setShowEditLot(false)
              setEditingLot(null)
            }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-md">
              Annuler
            </button>
            <button onClick={handleSaveLot}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md">
              ✓ Sauvegarder les modifications
            </button>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            ⚠️ <strong>Attention :</strong> La modification du code du lot renomme automatiquement toutes les bobines. 
            La suppression d'une bobine efface aussi tout son historique de mouvements.
          </div>
        </div>
      </div>
    )
  }

  // ============ PAGE PRINCIPALE ============
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-blue-900 mb-12">📦 Gestion Stock Bobines</h1>
          
          <div className="grid grid-cols-2 gap-6">
            <button onClick={() => setCurrentPage('arrivage')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              ➕ Nouvel Arrivage
            </button>
            <button onClick={() => setCurrentPage('usine')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              ➡️ Vers Usine
            </button>
            <button onClick={() => setCurrentPage('retour_usine')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              🔙 Retour Usine
            </button>
            <button onClick={() => setCurrentPage('retour')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              🗑️ Retour
            </button>
            <button onClick={() => {
              setCurrentPage('etat')
              chargerEtat()
            }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              📊 État
            </button>
            <button onClick={() => setCurrentPage('autre')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">
              🔐 Autre
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PAGE ÉTIQUETTES ============
  if (showEtiquette && bobinesToPrint.length > 0) {
    const baseUrl = getBaseUrl()
    
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-blue-900">
                🏷️ {bobinesToPrint.length} étiquette(s)
              </h1>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md">
                  🖨️ Imprimer
                </button>
                <button onClick={() => {
                  setShowEtiquette(false)
                  setBobinesToPrint([])
                }} className="text-red-600 hover:text-red-800 px-4">
                  ✕
                </button>
              </div>
            </div>

            <div id="etiquettes-grid">
              {bobinesToPrint.map((bobine, index) => {
                const r = bobine.reception
                const dimension = r.type_materiel === 'Fil' 
                  ? `Ø${r.diametre_fil}`
                  : `${r.largeur_feuillard}x${r.longueur_feuillard}`
                const qrUrl = `${baseUrl}/bobine/${bobine.code_bobine}`

                return (
                  <div key={index} className="etiquette">
                    <div className="etiquette-content">
                      <div className="etiquette-left">
                        <p className="etiquette-header">{r.code_fournisseur} Cmd {r.num_commande}</p>
                        <p className="etiquette-code">{bobine.code_bobine}</p>
                        <p className="etiquette-gros text-blue-800">{dimension}</p>
                        <p className="etiquette-gros text-green-800">{bobine.poids_initial} kg</p>
                        <p className="etiquette-gros">{r.matiere}</p>
                        <p className="etiquette-gros">{r.durete}</p>
                        <p className="etiquette-gros">{r.revetement}</p>
                      </div>
                      <div className="etiquette-right">
                        <QRCodeSVG value={qrUrl} size={90} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <style jsx global>{`
          .etiquette-header { font-size: 0.7rem; font-weight: bold; }
          .etiquette-code { font-size: 0.85rem; font-family: monospace; font-weight: bold; }
          .etiquette-gros { font-size: 1.4rem; font-weight: bold; line-height: 1.05; }
          @media print {
            body * { visibility: hidden; }
            #etiquettes-grid, #etiquettes-grid * { visibility: visible; }
            #etiquettes-grid {
              position: absolute; left: 0; top: 0; width: 210mm;
              display: grid;
              grid-template-columns: repeat(3, 62mm);
              grid-template-rows: repeat(3, 90mm);
              gap: 3mm; padding: 10mm;
            }
            .etiquette { width: 62mm; height: 90mm; border: 1px solid #000; padding: 2mm; page-break-inside: avoid; box-sizing: border-box; }
            .etiquette-content { display: flex; height: 100%; gap: 2mm; }
            .etiquette-left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .etiquette-right { display: flex; align-items: center; justify-content: center; }
            .etiquette-header { font-size: 0.6rem; }
            .etiquette-code { font-size: 0.7rem; }
            .etiquette-gros { font-size: 1.15rem; }
            @page { size: A4 portrait; margin: 0; }
          }
          @media screen {
            #etiquettes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .etiquette { border: 2px solid #000; padding: 8px; min-height: 200px; }
            .etiquette-content { display: flex; height: 100%; gap: 10px; }
            .etiquette-left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .etiquette-right { display: flex; align-items: center; justify-content: center; }
          }
        `}</style>
      </>
    )
  }

  // ============ PAGE SCAN ============
  if (showScan) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">📷 Scanner</h1>
            <button onClick={() => {
              setShowScan(false)
              if (scannerRef.current) scannerRef.current.clear()
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>
          <div id="reader" className="w-full"></div>
        </div>
      </div>
    )
  }

  // ============ PAGE ARRIVAGE ============
  if (currentPage === 'arrivage') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">➕ Arrivage - Étape {wizardStep}/3</h1>
            <button onClick={() => {
              setCurrentPage('home')
              setWizardStep(1)
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          {wizardStep === 1 && (
            <form onSubmit={handleEtape1} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code Fournisseur</label>
                  <input name="code_fournisseur" maxLength={4} required className="w-full px-4 py-2 border rounded-md uppercase" placeholder="MUGA" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">N° Commande</label>
                  <input name="num_commande" maxLength={2} required className="w-full px-4 py-2 border rounded-md" placeholder="05" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">N° Type Produit</label>
                  <input name="num_type_produit" maxLength={2} required className="w-full px-4 py-2 border rounded-md" placeholder="12" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md">Suivant →</button>
            </form>
          )}

          {wizardStep === 2 && (
            <form onSubmit={handleEtape2} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select name="type_materiel" className="w-full px-4 py-2 border rounded-md">
                    <option value="Fil">Fil</option>
                    <option value="Feuillard">Feuillard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Matière</label>
                  <select name="matiere" required className="w-full px-4 py-2 border rounded-md">
                    <option value="">-- Choisir --</option>
                    {itemsMatiere.map(item => (<option key={item.id} value={item.nom}>{item.nom}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dureté</label>
                  <select name="durete" required className="w-full px-4 py-2 border rounded-md">
                    <option value="">-- Choisir --</option>
                    {itemsDurete.map(item => (<option key={item.id} value={item.nom}>{item.nom}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Revêtement</label>
                  <select name="revetement" required className="w-full px-4 py-2 border rounded-md">
                    <option value="">-- Choisir --</option>
                    {itemsRev.map(item => (<option key={item.id} value={item.nom}>{item.nom}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Diamètre (mm)</label>
                  <input name="diametre_fil" type="number" step="0.01" className="w-full px-4 py-2 border rounded-md" placeholder="1.20" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date réception</label>
                  <input name="date_reception" type="date" required className="w-full px-4 py-2 border rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre de bobines</label>
                <input name="nombre_bobines" type="number" min="1" max="99" defaultValue="1" required className="w-full px-4 py-2 border rounded-md" />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                💡 Les listes sont gérables dans <strong>Autre → Gestion des items</strong>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setWizardStep(1)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md">← Retour</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md">Suivant →</button>
              </div>
            </form>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {receptionData.poids_bobines.map((poids, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium">Bobine {String(index + 1).padStart(2, '0')}</label>
                    <input type="number" step="0.01" value={poids || ''} onChange={(e) => handlePoidsChange(index, e.target.value)} className="flex-1 px-4 py-2 border rounded-md" placeholder="kg" />
                  </div>
                ))}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-lg font-semibold text-green-800">Total : {poidsTotal.toFixed(2)} kg</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setWizardStep(2)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md">← Retour</button>
                <button onClick={handleValiderReception} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md">✓ Valider</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ PAGE VERS USINE ============
  if (currentPage === 'usine') {
    const bobinesStock = bobines.filter(b => b.lieu === 'STOCK_PRINCIPAL')
    
    const diametresStock = Array.from(new Set(
      bobinesStock.filter(b => b.reception.type_materiel === 'Fil' && b.reception.diametre_fil).map(b => parseFloat(b.reception.diametre_fil!))
    )).sort((a, b) => a - b)

    const bobinesFiltrees = bobinesStock.filter(b => {
      if (filtreDiametreUsine) {
        const diamBobine = b.reception.diametre_fil ? parseFloat(b.reception.diametre_fil) : null
        if (diamBobine?.toString() !== filtreDiametreUsine) return false
      }
      if (rechercheNomUsine) {
        const search = rechercheNomUsine.toUpperCase()
        const match = b.code_bobine.toUpperCase().includes(search) || b.reception.matiere.toUpperCase().includes(search) || b.reception.durete.toUpperCase().includes(search) || b.reception.revetement.toUpperCase().includes(search)
        if (!match) return false
      }
      return true
    })

    const poidsTotalDispo = bobinesFiltrees.reduce((sum, b) => sum + parseFloat(b.poids_actuel.toString()), 0)
    const poidsTotalStock = bobinesStock.reduce((sum, b) => sum + parseFloat(b.poids_actuel.toString()), 0)

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-purple-900">➡️ Vers Usine</h1>
            <button onClick={() => {
              setCurrentPage('home')
              setSelectedBobine(null)
              setFiltreDiametreUsine('')
              setRechercheNomUsine('')
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          {!selectedBobine ? (
            <div className="space-y-4">
              <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md">📷 Scanner un code-barre</button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Rechercher une bobine</label>
                <input type="text" value={rechercheNomUsine} onChange={(e) => setRechercheNomUsine(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md" placeholder="Code bobine, matière, dureté..." />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par diamètre</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFiltreDiametreUsine('')} className={`px-3 py-1 rounded-md text-sm font-semibold ${!filtreDiametreUsine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>Tous</button>
                  {diametresStock.map(d => (
                    <button key={d} onClick={() => setFiltreDiametreUsine(d.toString())} className={`px-3 py-1 rounded-md text-sm font-semibold ${filtreDiametreUsine === d.toString() ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>Ø {d} mm</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                  <p className="text-xs text-gray-600">Poids filtré</p>
                  <p className="text-xl font-bold text-green-800">{poidsTotalDispo.toFixed(2)} kg</p>
                  <p className="text-xs text-gray-500">{bobinesFiltrees.length} bobine(s)</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                  <p className="text-xs text-gray-600">Poids total stock</p>
                  <p className="text-xl font-bold text-gray-800">{poidsTotalStock.toFixed(2)} kg</p>
                  <p className="text-xs text-gray-500">{bobinesStock.length} bobine(s)</p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Bobines disponibles ({bobinesFiltrees.length})</h2>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {bobinesFiltrees.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">Aucune bobine trouvée</p>
                  ) : (
                    bobinesFiltrees.map(b => {
                      const dim = b.reception.type_materiel === 'Fil' ? `Ø${b.reception.diametre_fil}` : `${b.reception.largeur_feuillard}x${b.reception.longueur_feuillard}`
                      return (
                        <div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-purple-50 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono font-semibold">{b.code_bobine}</div>
                              <div className="text-sm text-gray-600">{dim} - {b.reception.matiere} - {b.reception.durete}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-800">{b.poids_actuel} kg</div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p>
                <p className="text-sm">{selectedBobine.reception.matiere} - {selectedBobine.poids_actuel} kg</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">N° commande fabrication</label>
                <input type="text" value={numCommandeFabrication} onChange={(e) => setNumCommandeFabrication(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="CMD-001" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedBobine(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md">← Retour</button>
                <button onClick={handleVersUsine} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md">✓ Valider</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ PAGE RETOUR USINE ============
  if (currentPage === 'retour_usine') {
    const bobinesUsine = bobines.filter(b => b.lieu === 'USINE')
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-900">🔙 Retour Usine</h1>
            <button onClick={() => {
              setCurrentPage('home')
              setSelectedBobine(null)
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          {!selectedBobine ? (
            <div className="space-y-4">
              <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md">📷 Scanner</button>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {bobinesUsine.map(b => (
                  <div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-indigo-50 cursor-pointer">
                    <div className="font-mono font-semibold">{b.code_bobine}</div>
                    <div className="text-sm text-gray-600">{b.num_commande_fabrication} - {b.poids_actuel} kg</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                <p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p>
                <p className="text-sm">Commande: {selectedBobine.num_commande_fabrication}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Poids restant (kg)</label>
                <input type="number" step="0.01" value={poidsRestant} onChange={(e) => setPoidsRestant(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="15.5" />
              </div>
              <button onClick={handleRetourUsine} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md">✓ Valider (retour stock principal)</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ PAGE RETOUR (déchets) ============
  if (currentPage === 'retour') {
    const bobinesStock = bobines.filter(b => b.lieu === 'STOCK_PRINCIPAL')
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-red-900">🗑️ Mise au rebut</h1>
            <button onClick={() => {
              setCurrentPage('home')
              setSelectedBobine(null)
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          {!selectedBobine ? (
            <div className="space-y-4">
              <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md">📷 Scanner</button>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {bobinesStock.map(b => (
                  <div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-red-50 cursor-pointer">
                    <div className="font-mono font-semibold">{b.code_bobine}</div>
                    <div className="text-sm text-gray-600">{b.reception.matiere} - {b.poids_actuel} kg</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p>
                <p className="text-sm">{selectedBobine.poids_actuel} kg</p>
              </div>
              <button onClick={handleRetourDechet} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-md">✓ Mettre au rebut</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ PAGE ÉTAT ============
  if (currentPage === 'etat') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-900">📊 État du stock</h1>
            <button onClick={() => setCurrentPage('home')} className="text-red-600 hover:text-red-800 px-4">✕</button>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par diamètre</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDiametreFilter('')} className={`px-4 py-2 rounded-md text-sm font-semibold ${!diametreFilter ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>Tous</button>
              {diametresDisponibles.map(d => (
                <button key={d} onClick={() => setDiametreFilter(d.toString())} className={`px-4 py-2 rounded-md text-sm font-semibold ${diametreFilter === d.toString() ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>Ø {d} mm</button>
              ))}
            </div>
          </div>

          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Imprimer étiquettes d'un lot</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(lotsDisponibles).map((lot: any) => (
                <button key={lot.id} onClick={() => handleImprimerLot(lot.id)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-semibold">{lot.nom} ({lot.nb_bobines})</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Dimension</th>
                  <th className="px-3 py-2 text-left">Dureté</th>
                  <th className="px-3 py-2 text-left">Revêtement</th>
                  <th className="px-3 py-2 text-right">Nb bobines</th>
                  <th className="px-3 py-2 text-right">Poids total</th>
                </tr>
              </thead>
              <tbody>
                {etatFiltre.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-500">Aucune donnée</td></tr>
                ) : (
                  etatFiltre.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold">{item.dimension}</td>
                      <td className="px-3 py-2">{item.durete}</td>
                      <td className="px-3 py-2">{item.revetement}</td>
                      <td className="px-3 py-2 text-right">{item.nombre_bobines}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-800">{item.poids_total.toFixed(2)} kg</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ============ PAGE AUTRE ============
  if (currentPage === 'autre') {
    if (!autreAcces) {
      return (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-6">🔐 Accès protégé</h1>
            <input type="password" value={codeAcces} onChange={(e) => setCodeAcces(e.target.value)} className="w-full px-4 py-2 border rounded-md mb-4" placeholder="Code à 4 chiffres" maxLength={4} />
            <button onClick={handleCodeAcces} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-md">Valider</button>
            <button onClick={() => setCurrentPage('home')} className="w-full mt-2 text-gray-600">Retour</button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">🔐 Administration</h1>
            <button onClick={() => {
              setCurrentPage('home')
              setAutreAcces(false)
              setCodeAcces('')
            }} className="text-red-600 hover:text-red-800">✕</button>
          </div>

          {/* Gestion des items */}
          <div className="mb-8 border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">📝 Gestion des items</h2>
            <ItemsManager onItemsChange={chargerItems} />
          </div>

          {/* Gestion des lots */}
          <div className="mb-8 border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">📦 Gestion des lots</h2>
            <button onClick={chargerLots} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4">
              🔄 Charger les lots
            </button>
            
            {lots.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Code Lot</th>
                      <th className="px-3 py-2 text-left">Fournisseur</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Nb bobines</th>
                      <th className="px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map(lot => (
                      <tr key={lot.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold">
                          {lot.code_fournisseur}{lot.num_commande}{lot.num_type_produit}
                        </td>
                        <td className="px-3 py-2">{lot.code_fournisseur}</td>
                        <td className="px-3 py-2">{new Date(lot.date_reception).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3 py-2 text-right">{lot.bobines.length}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => handleEditLot(lot.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs">
                            ✏️ Éditer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Code d'accès mobile */}
          <div className="mb-8 border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">🔐 Code d'accès mobile</h2>
            <p className="text-sm text-gray-600 mb-3">Ce code est utilisé pour accéder aux infos des bobines depuis un smartphone (via QR code).</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800"><strong>Code actuel :</strong> {process.env.NEXT_PUBLIC_ACCESS_CODE || '1234'}</p>
              <p className="text-xs text-yellow-700 mt-2">Pour modifier ce code, ajoutez la variable d'environnement <code>ACCESS_CODE</code> dans Vercel</p>
            </div>
          </div>

          {/* Exports CSV */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">📊 Exports CSV</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => exporterCSV('stock')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">💾 Stock actuel</button>
              <button onClick={() => exporterCSV('mouvements')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">📥 Tous mouvements</button>
            </div>
          </div>

          {/* Stats par commande */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">📈 Stats par commande</h2>
            <div className="flex gap-2">
              <input type="text" value={commandeFilter} onChange={(e) => setCommandeFilter(e.target.value)} className="flex-1 px-4 py-2 border rounded-md" placeholder="N° commande" />
              <button onClick={() => exporterCSV('mouvements')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Exporter</button>
            </div>
          </div>

          {/* Consommation */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">📉 Consommation</h2>
            <div className="flex gap-2 items-center">
              <input type="number" value={moisConso} onChange={(e) => setMoisConso(parseInt(e.target.value) || 1)} min="1" max="120" className="w-20 px-3 py-2 border rounded-md" />
              <span>mois</span>
              <button onClick={() => exporterCSV('consommation')} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md">📈 Exporter</button>
            </div>
          </div>

          {/* Backup CSV unifié */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">💾 Backup complet de la base</h2>
            <div className="mb-4">
              <button onClick={handleExportBase} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">📥 Exporter toute la base (1 fichier CSV)</button>
              <p className="text-xs text-gray-500 mt-2">Télécharge 1 fichier CSV contenant : réceptions, bobines, mouvements et items</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-semibold mb-3">📤 Importer une base (CSV)</h3>
              <p className="text-xs text-gray-600 mb-3">Sélectionne le fichier CSV de backup :</p>
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv" onChange={(e) => setBackupFile(e.target.files?.[0] || null)} className="flex-1 text-sm" />
              </div>
              {backupFile && (<p className="text-xs text-green-700 mt-2">✅ Fichier sélectionné : {backupFile.name}</p>)}
              <button onClick={handleImportBase} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">📤 Restaurer depuis le CSV</button>
              <p className="text-xs text-red-600 mt-2">⚠️ L'import écrase TOUTES les données actuelles.</p>
            </div>
          </div>

          {/* Reset */}
          <div className="pt-4">
            <button onClick={handleReset} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-md">⚠️ Réinitialiser base de données</button>
          </div>
        </div>
      </div>
    )
  }

  return null

  function ItemsManager({ onItemsChange }: { onItemsChange: () => void }) {
    const [items, setItems] = useState<any[]>([])
    const [categorie, setCategorie] = useState<'MATIERE' | 'DURETE' | 'REVETEMENT'>('MATIERE')
    const [nouvelItem, setNouvelItem] = useState('')
    const [editingItem, setEditingItem] = useState<any>(null)

    useEffect(() => { chargerItemsCat() }, [categorie])

    const chargerItemsCat = async () => {
      try {
        const res = await fetch(`/api/items?categorie=${categorie}`)
        const data = await res.json()
        setItems(data)
      } catch (error) { console.error(error) }
    }

    const handleAjouter = async () => {
      if (!nouvelItem.trim()) return
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorie, nom: nouvelItem.trim() })
        })
        if (res.ok) {
          setNouvelItem('')
          chargerItemsCat()
          onItemsChange()
        } else {
          const error = await res.json()
          alert(`❌ ${error.error}`)
        }
      } catch (error) { alert('❌ Erreur') }
    }

    const handleModifier = async (item: any, nouveauNom: string) => {
      if (!nouveauNom.trim()) return
      try {
        const res = await fetch('/api/items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, nom: nouveauNom.trim() })
        })
        if (res.ok) {
          setEditingItem(null)
          chargerItemsCat()
          onItemsChange()
        } else {
          const error = await res.json()
          alert(`❌ ${error.error}`)
        }
      } catch (error) { alert('❌ Erreur') }
    }

    const handleSupprimer = async (id: number) => {
      if (!confirm('Supprimer cet item ?')) return
      try {
        await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
        chargerItemsCat()
        onItemsChange()
      } catch (error) { alert('❌ Erreur') }
    }

    const categorieLabels = { MATIERE: 'Matières', DURETE: 'Duretés', REVETEMENT: 'Revêtements' }

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['MATIERE', 'DURETE', 'REVETEMENT'] as const).map(cat => (
            <button key={cat} onClick={() => setCategorie(cat)} className={`px-4 py-2 rounded-md ${categorie === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{categorieLabels[cat]}</button>
          ))}
        </div>

        <div className="flex gap-2">
          <input type="text" value={nouvelItem} onChange={(e) => setNouvelItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAjouter()} className="flex-1 px-4 py-2 border rounded-md" placeholder={`Nouveau ${categorieLabels[categorie].toLowerCase()}...`} />
          <button onClick={handleAjouter} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">➕ Ajouter</button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-center py-4 text-gray-500">Aucun item dans cette catégorie</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md">
                {editingItem?.id === item.id ? (
                  <>
                    <input type="text" value={editingItem.nom} onChange={(e) => setEditingItem({ ...editingItem, nom: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleModifier(item, editingItem.nom)} className="flex-1 px-3 py-1 border rounded-md" autoFocus />
                    <button onClick={() => handleModifier(item, editingItem.nom)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm">✓</button>
                    <button onClick={() => setEditingItem(null)} className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm">✕</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{item.nom}</span>
                    <button onClick={() => setEditingItem({ ...item })} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">✏️ Modifier</button>
                    <button onClick={() => handleSupprimer(item.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm">🗑️</button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
}