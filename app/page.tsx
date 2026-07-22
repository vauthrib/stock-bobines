
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'

// ================= TYPES =================

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

type AutreSection = 'actions' | 'items' | 'lots' | 'users' | 'history' | 'backup' | 'reset'

// ================= COMPOSANT ITEMS (Externe) =================

function ItemsManager({ onItemsChange }: { onItemsChange: () => void }) {
  const [items, setItems] = useState<any[]>([])
  const [cat, setCat] = useState<'MATIERE' | 'DURETE' | 'REVETEMENT'>('MATIERE')
  const [nouveau, setNouveau] = useState('')
  const [edit, setEdit] = useState<any>(null)

  useEffect(() => {
    try { fetch(`/api/items?categorie=${cat}`).then(r => r.json()).then(setItems) } catch (e) { }
  }, [cat])

  const add = async () => {
    if (!nouveau.trim()) return
    try {
      const r = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie: cat, nom: nouveau.trim() })
      })
      if (r.ok) {
        setNouveau('')
        try { fetch(`/api/items?categorie=${cat}`).then(r => r.json()).then(setItems); onItemsChange() } catch (e) { }
      } else alert((await r.json()).error)
    } catch (e) { alert('❌') }
  }

  const upd = async (i: any, n: string) => {
    if (!n.trim()) return
    try {
      const r = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: i.id, nom: n.trim() })
      })
      if (r.ok) {
        setEdit(null)
        try { fetch(`/api/items?categorie=${cat}`).then(r => r.json()).then(setItems); onItemsChange() } catch (e) { }
      } else alert((await r.json()).error)
    } catch (e) { alert('❌') }
  }

  const del = async (id: number) => {
    if (!confirm('Supprimer ?')) return
    try {
      await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
      try { fetch(`/api/items?categorie=${cat}`).then(r => r.json()).then(setItems); onItemsChange() } catch (e) { }
    } catch (e) { alert('❌') }
  }

  const lab = { MATIERE: 'Matières', DURETE: 'Duretés', REVETEMENT: 'Revêtements' }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['MATIERE', 'DURETE', 'REVETEMENT'] as const).map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-md ${cat === c ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{lab[c]}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={nouveau} onChange={e => setNouveau(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} className="flex-1 px-4 py-2 border rounded-md" placeholder={`Nouveau ${lab[cat].toLowerCase()}...`} />
        <button onClick={add} className="bg-green-600 text-white px-4 py-2 rounded-md">➕ Ajouter</button>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.length === 0 ? <p className="text-center py-4 text-gray-500">Aucun</p> : items.map(i => (
          <div key={i.id} className="flex items-center gap-2 p-2 border rounded-md">
            {edit?.id === i.id ? (
              <>
                <input value={edit.nom} onChange={e => setEdit({ ...edit, nom: e.target.value })} onKeyDown={e => e.key === 'Enter' && upd(i, edit.nom)} className="flex-1 px-3 py-1 border rounded-md" autoFocus />
                <button onClick={() => upd(i, edit.nom)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">✓</button>
                <button onClick={() => setEdit(null)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">{i.nom}</span>
                <button onClick={() => setEdit({ ...i })} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">✏️</button>
                <button onClick={() => del(i.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">🗑️</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= COMPOSANT PRINCIPAL =================

export default function Home() {
  // --- Auth ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuper, setIsSuper] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // --- Data ---
  const [bobines, setBobines] = useState<Bobine[]>([])
  const [currentPage, setCurrentPage] = useState<'home' | 'arrivage' | 'usine' | 'retour_usine' | 'retour' | 'etat' | 'autre'>('home')

  // --- Wizard ---
  const [wizardStep, setWizardStep] = useState(1)
  const [receptionData, setReceptionData] = useState<ReceptionData>({
    code_fournisseur: '', num_commande: '', num_type_produit: '', type_materiel: 'Fil',
    matiere: '', durete: '', revetement: '', date_reception: new Date().toISOString().split('T')[0],
    nombre_bobines: 1, poids_bobines: []
  })

  // --- Actions ---
  const [showScan, setShowScan] = useState(false)
  const [selectedBobine, setSelectedBobine] = useState<Bobine | null>(null)
  const [numCommandeFabrication, setNumCommandeFabrication] = useState('')
  const [poidsRestant, setPoidsRestant] = useState('')

  // --- Etiquettes ---
  const [showEtiquette, setShowEtiquette] = useState(false)
  const [bobinesToPrint, setBobinesToPrint] = useState<Bobine[]>([])

  // --- Filtres & Admin ---
  const [moisConso, setMoisConso] = useState(3)
  const [commandeFilter, setCommandeFilter] = useState('')
  const [diametreFilter, setDiametreFilter] = useState<string>('')
  const [lotFilter, setLotFilter] = useState<string>('all')
  const [filtreDiametreUsine, setFiltreDiametreUsine] = useState<string>('')
  const [rechercheNomUsine, setRechercheNomUsine] = useState('')

  // --- Items & Backup ---
  const [itemsMatiere, setItemsMatiere] = useState<any[]>([])
  const [itemsDurete, setItemsDurete] = useState<any[]>([])
  const [itemsRev, setItemsRev] = useState<any[]>([])
  const [backupFile, setBackupFile] = useState<File | null>(null)

  // --- Lots ---
  const [showEditLot, setShowEditLot] = useState(false)
  const [lots, setLots] = useState<any[]>([])
  const [editingLot, setEditingLot] = useState<any>(null)

  // --- Users & History ---
  const [users, setUsers] = useState<any[]>([])
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({ login: '', password: '', isSuper: false, isAdmin: false })
  const [history, setHistory] = useState<any[]>([])
  const [autreSection, setAutreSection] = useState<AutreSection>('actions')

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : 'https://stock-bobines.vercel.app'

  // --- Effects ---
  useEffect(() => {
    const authData = localStorage.getItem('app_auth')
    if (authData) {
      try {
        const { user, date, isAdmin: admin = false, isSuper: superUser = false } = JSON.parse(authData)
        if (date === new Date().toDateString()) {
          setIsAuthenticated(true); setCurrentUser(user); setIsAdmin(admin); setIsSuper(superUser)
          chargerBobines(); chargerItems()
          return
        }
      } catch (e) { localStorage.removeItem('app_auth') }
    }
  }, [])

  // --- Loaders ---
  const chargerBobines = async () => { try { const res = await fetch('/api/bobines'); setBobines(await res.json()) } catch (e) { console.error(e) } }
  const chargerItems = async () => {
    try {
      const [m, d, r] = await Promise.all([
        fetch('/api/items?categorie=MATIERE'), fetch('/api/items?categorie=DURETE'), fetch('/api/items?categorie=REVETEMENT')
      ])
      setItemsMatiere(await m.json()); setItemsDurete(await d.json()); setItemsRev(await r.json())
    } catch (e) { console.error(e) }
  }
  const chargerLots = async () => { try { const res = await fetch('/api/lots'); setLots(await res.json()) } catch (e) { } }
  const chargerUsers = async () => { try { const res = await fetch('/api/users'); setUsers(await res.json()) } catch (e) { } }
  const chargerHistory = async () => { try { const res = await fetch('/api/auth/history?limit=100'); setHistory(await res.json()) } catch (e) { } }

  // --- Auth ---
  const handleAuth = async () => {
    if (!login.trim() || !password.trim()) return setAuthError('Veuillez remplir tous les champs')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, appareil: navigator.userAgent || 'Navigateur inconnu' })
      })
      const data = await res.json()
      if (data.valid) {
        localStorage.setItem('app_auth', JSON.stringify({ user: data.user, date: new Date().toDateString(), isAdmin: data.isAdmin, isSuper: data.isSuper }))
        setIsAuthenticated(true); setCurrentUser(data.user); setIsAdmin(data.isAdmin); setIsSuper(data.isSuper)
        chargerBobines(); chargerItems()
      } else setAuthError(data.error || 'Erreur de connexion')
    } catch (e) { setAuthError('Erreur de connexion au serveur') }
  }

  const handleLogout = () => {
    localStorage.removeItem('app_auth')
    setIsAuthenticated(false); setCurrentUser(''); setIsAdmin(false); setIsSuper(false); setLogin(''); setPassword('')
  }

  // --- Reset & Backup ---
  const handleReset = async () => {
    if (!confirm('⚠️ Effacer TOUTES les données ? Cette action est irréversible !')) return
    try { await fetch('/api/reset', { method: 'POST' }); alert('✅ Base réinitialisée'); chargerBobines(); chargerItems() } catch (e) { alert('❌ Erreur') }
  }
  const handleExportBase = async () => {
    try {
      const res = await fetch('/api/backup/all'); if (!res.ok) throw new Error()
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `backup_stock_bobines_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
      alert('✅ Fichier CSV téléchargé')
    } catch (e) { alert('❌ Erreur export') }
  }
  const handleImportBase = async () => {
    if (!backupFile) return alert('⚠️ Sélectionnez un fichier CSV')
    if (!confirm('⚠️ Écraser toutes les données actuelles ?')) return
    try {
      const formData = new FormData(); formData.append('all', backupFile)
      const res = await fetch('/api/backup/import', { method: 'POST', body: formData })
      if (res.ok) { alert('✅ Restauré'); chargerBobines(); chargerItems(); setBackupFile(null) }
      else alert(`❌ ${(await res.json()).error}`)
    } catch (e) { alert('❌ Erreur import') }
  }

  // *** AJOUT DE LA FONCTION MANQUANTE ***
  const handleUpdateUser = async () => {
    if (!editingUser) return
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      })
      if (res.ok) {
        setEditingUser(null)
        chargerUsers()
        alert('✅ Utilisateur mis à jour')
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (error) {
      alert('❌ Erreur')
    }
  }
  // ************************************

  // --- Wizard Logic ---
  const handleEtape1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget)
    setReceptionData({ ...receptionData, code_fournisseur: (fd.get('code_fournisseur') as string).toUpperCase(), num_commande: fd.get('num_commande') as string, num_type_produit: fd.get('num_type_produit') as string }); setWizardStep(2)
  }
  const handleEtape2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const nb = parseInt(fd.get('nombre_bobines') as string)
    setReceptionData({ ...receptionData, type_materiel: fd.get('type_materiel') as string, diametre_fil: fd.get('diametre_fil') as string,
      longueur_feuillard: fd.get('longueur_feuillard') as string, largeur_feuillard: fd.get('largeur_feuillard') as string,
      matiere: fd.get('matiere') as string, durete: fd.get('durete') as string, revetement: fd.get('revetement') as string,
      date_reception: fd.get('date_reception') as string, nombre_bobines: nb, poids_bobines: new Array(nb).fill(0) }); setWizardStep(3)
  }
  const handlePoidsChange = (i: number, v: string) => { const p = [...receptionData.poids_bobines]; p[i] = parseFloat(v) || 0; setReceptionData({ ...receptionData, poids_bobines: p }) }
  const poidsTotal = receptionData.poids_bobines.reduce((a, b) => a + b, 0)

  const handleValiderReception = async () => {
    try {
      const res = await fetch('/api/receptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receptionData) })
      if (res.ok) {
        await res.json()
        const all = await fetch('/api/bobines').then(r => r.json())
        const lot = all.filter((b: Bobine) => b.reception.code_fournisseur === receptionData.code_fournisseur && b.reception.num_commande === receptionData.num_commande.padStart(2, '0') && b.reception.num_type_produit === receptionData.num_type_produit.padStart(2, '0'))
        if (confirm('Voulez-vous imprimer les étiquettes ?')) { setBobinesToPrint(lot); setShowEtiquette(true) } else { setCurrentPage('autre'); setAutreSection('actions'); setWizardStep(1) }
        chargerBobines()
      } else alert(`❌ ${(await res.json()).error}`)
    } catch (e) { alert('❌ Erreur') }
  }

  // --- Scanner ---
  const startScanner = () => {
    setShowScan(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { qrbox: { width: 250, height: 250 }, fps: 5 }, false)
      scanner.render(decoded => { const b = bobines.find(b => b.code_bobine === decoded.toUpperCase()); if (b) { setSelectedBobine(b); setShowScan(false); scanner.clear() } else alert('❌ Bobine non trouvée') }, () => { })
      scannerRef.current = scanner
    }, 100)
  }

  // --- Actions Bobines ---
  const handleVersUsine = async () => {
    if (!selectedBobine) return; if (selectedBobine.lieu === 'USINE') return alert('⚠️ Déjà en usine')
    try {
      const res = await fetch('/api/mouvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_bobine: selectedBobine.code_bobine, type_mouvement: 'TRANSFERT_VERS_USINE', poids_mouvement: 0, num_commande_fabrication: numCommandeFabrication }) })
      if (res.ok) { alert('✅ Transférée'); setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null); setNumCommandeFabrication(''); chargerBobines() }
    } catch (e) { alert('❌ Erreur') }
  }

  const handleRetourUsine = async () => {
    if (!selectedBobine) return; if (selectedBobine.lieu !== 'USINE') return alert('⚠️ Pas en usine')
    const p = parseFloat(poidsRestant)
    if (p === 0) { if (!confirm('Bobine terminée ? Sera sortie du stock.')) return }
    else if (isNaN(p) || p < 0) return alert('Poids invalide')
    else if (p > parseFloat(selectedBobine.poids_initial)) return alert('Poids > initial')
    try {
      const res = await fetch('/api/mouvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_bobine: selectedBobine.code_bobine, type_mouvement: 'RETOUR_USINE', poids_mouvement: p, lieu_destination: 'STOCK_PRINCIPAL' }) })
      if (res.ok) { alert(p === 0 ? '✅ Terminée' : '✅ Retournée'); setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null); setPoidsRestant(''); chargerBobines() }
    } catch (e) { alert('❌ Erreur') }
  }

  const handleRetourDechet = async () => {
    if (!selectedBobine) return
    try {
      const res = await fetch('/api/mouvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_bobine: selectedBobine.code_bobine, type_mouvement: 'SORTIE_DECHET', poids_mouvement: parseFloat(selectedBobine.poids_actuel) }) })
      if (res.ok) { alert('✅ Rebut'); setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null); chargerBobines() }
    } catch (e) { alert('❌ Erreur') }
  }

  // --- Lots ---
  const lotsDisponibles = bobines.reduce((acc, b) => {
    const k = `${b.reception.code_fournisseur}-${b.reception.num_commande}-${b.reception.num_type_produit}`
    if (!acc[k]) acc[k] = { id: k, code_fournisseur: b.reception.code_fournisseur, num_commande: b.reception.num_commande, num_type_produit: b.reception.num_type_produit, nom: `${b.reception.code_fournisseur}${b.reception.num_commande}${b.reception.num_type_produit}`, nb_bobines: 0 }
    acc[k].nb_bobines++; return acc
  }, {} as Record<string, any>)

  const handleImprimerLot = (k: string) => {
    const lot = lotsDisponibles[k]; setBobinesToPrint(bobines.filter(b => b.reception.code_fournisseur === lot.code_fournisseur && b.reception.num_commande === lot.num_commande && b.reception.num_type_produit === lot.num_type_produit)); setShowEtiquette(true)
  }

  const handleEditLot = async (lotId: number) => {
    try {
      const res = await fetch(`/api/lots/${lotId}`)
      const data = await res.json()
      setEditingLot(data)
      setShowEditLot(true)
    } catch (error) { alert('❌ Erreur de chargement du lot') }
  }

  const exporterCSV = (type: string) => {
    const url = type === 'stock' ? '/api/export/stock' : type === 'consommation' ? `/api/export/consommation?mois=${moisConso}` : `/api/export/mouvements${commandeFilter ? `?commande=${commandeFilter}` : ''}`
    window.open(url, '_blank')
  }

  // --- Diamètres disponibles (Global) ---
  const diametresDisponibles = useMemo(() => {
    return Array.from(new Set(
      bobines
        .filter(b => b.lieu === 'STOCK_PRINCIPAL' && b.reception.type_materiel === 'Fil' && b.reception.diametre_fil)
        .map(b => parseFloat(b.reception.diametre_fil!))
    )).sort((a, b) => a - b)
  }, [bobines])

  // --- Memoized Etat ---
  const etatFiltre = useMemo(() => {
    let filtered = bobines.filter(b => b.lieu === 'STOCK_PRINCIPAL')
    if (lotFilter !== 'all') {
      const [f, c, t] = lotFilter.split('-')
      filtered = filtered.filter(b => b.reception.code_fournisseur === f && b.reception.num_commande === c && b.reception.num_type_produit === t)
    }
    if (diametreFilter) {
      filtered = filtered.filter(b => b.reception.diametre_fil?.toString() === diametreFilter)
    }

    const getDiam = (dim: string) => {
      const m = dim.match(/Ø?([\d.]+)/)
      return m ? parseFloat(m[1]) : 9999
    }

    const grouped = filtered.reduce((acc, b) => {
      const dim = b.reception.type_materiel === 'Fil' ? `Ø${b.reception.diametre_fil}` : `${b.reception.largeur_feuillard}x${b.reception.longueur_feuillard}`
      const key = `${dim}-${b.reception.durete}-${b.reception.revetement}`
      if (!acc[key]) acc[key] = { dimension: dim, durete: b.reception.durete, revetement: b.reception.revetement, nb: 0, poids: 0 }
      acc[key].nb++; acc[key].poids += parseFloat(b.poids_actuel); return acc
    }, {} as Record<string, { dimension: string, durete: string, revetement: string, nb: number, poids: number }>)

    return Object.values(grouped).sort((a, b) => getDiam(a.dimension) - getDiam(b.dimension))
  }, [bobines, lotFilter, diametreFilter])

  const totalPoidsEtat = etatFiltre.reduce((s, i) => s + i.poids, 0)
  const totalNbEtat = etatFiltre.reduce((s, i) => s + i.nb, 0)

  // ================= RENDUS CONDITIONNELS =================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6"><div className="text-6xl mb-4">📦</div><h1 className="text-2xl font-bold text-blue-900 mb-2">Gestion Stock Bobines</h1><p className="text-sm text-gray-600">Connectez-vous</p></div>
          <div className="space-y-4">
            <input type="text" value={login} onChange={e => setLogin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg" placeholder="Login" autoFocus />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg" placeholder="Mot de passe" />
            {authError && <p className="text-red-600 text-sm text-center">{authError}</p>}
            <button onClick={handleAuth} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">Se connecter</button>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">Lun-Ven 7h30-18h00 (Super Admin : permanent)</p>
        </div>
      </div>
    )
  }

  if (showEtiquette && bobinesToPrint.length > 0) {
    const baseUrl = getBaseUrl()
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-blue-900">🏷️ {bobinesToPrint.length} étiquette(s)</h1><div className="flex gap-2"><button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">🖨️ Imprimer</button><button onClick={() => { setShowEtiquette(false); setBobinesToPrint([]) }} className="text-red-600 px-4">✕</button></div></div>
          <div id="etiquettes-grid">{bobinesToPrint.map((b, i) => { const r = b.reception; const dim = r.type_materiel === 'Fil' ? `Ø${r.diametre_fil}` : `${r.largeur_feuillard}x${r.longueur_feuillard}`; return (<div key={i} className="etiquette"><div className="etiquette-content"><div className="etiquette-left"><p className="etiquette-header">{r.code_fournisseur} Cmd {r.num_commande}</p><p className="etiquette-code">{b.code_bobine}</p><p className="etiquette-gros text-blue-800">{dim}</p><p className="etiquette-gros text-green-800">{b.poids_initial} kg</p><p className="etiquette-gros">{r.matiere}</p><p className="etiquette-gros">{r.durete}</p><p className="etiquette-gros">{r.revetement}</p></div><div className="etiquette-right"><QRCodeSVG value={`${baseUrl}/bobine/${b.code_bobine}`} size={90} /></div></div></div>) })}</div>
        </div></div>
        <style jsx global>{`.etiquette-header{font-size:.7rem;font-weight:bold}.etiquette-code{font-size:.85rem;font-family:monospace;font-weight:bold}.etiquette-gros{font-size:1.4rem;font-weight:bold;line-height:1.05}@media print{body *{visibility:hidden}#etiquettes-grid,#etiquettes-grid *{visibility:visible}#etiquettes-grid{position:absolute;left:0;top:0;width:210mm;display:grid;grid-template-columns:repeat(3,62mm);grid-template-rows:repeat(3,90mm);gap:3mm;padding:10mm}.etiquette{width:62mm;height:90mm;border:1px solid #000;padding:2mm;page-break-inside:avoid;box-sizing:border-box}.etiquette-content{display:flex;height:100%;gap:2mm}.etiquette-left{flex:1;display:flex;flex-direction:column;justify-content:center}.etiquette-right{display:flex;align-items:center;justify-content:center}.etiquette-header{font-size:.6rem}.etiquette-code{font-size:.7rem}.etiquette-gros{font-size:1.15rem}@page{size:A4 portrait;margin:0}}@media screen{#etiquettes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.etiquette{border:2px solid #000;padding:8px;min-height:200px}.etiquette-content{display:flex;height:100%;gap:10px}.etiquette-left{flex:1;display:flex;flex-direction:column;justify-content:center}.etiquette-right{display:flex;align-items:center;justify-content:center}}`}</style>
      </>
    )
  }

  if (showScan) return (<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8"><div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-blue-900">📷 Scanner</h1><button onClick={() => { setShowScan(false); if (scannerRef.current) scannerRef.current.clear() }} className="text-red-600">✕</button></div><div id="reader" className="w-full"></div></div></div>)

  if (showEditLot && editingLot) {
    return (
      <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-orange-900">✏️ Éditer le lot</h1><button onClick={() => { setShowEditLot(false); setEditingLot(null) }} className="text-red-600">✕</button></div>
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-md p-4">
          <h2 className="text-lg font-semibold mb-3">Informations du lot</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-1">Code Fournisseur</label><input value={editingLot.code_fournisseur} onChange={e => setEditingLot({ ...editingLot, code_fournisseur: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-md uppercase" maxLength={4} /></div>
            <div><label className="block text-sm font-medium mb-1">N° Commande</label><input value={editingLot.num_commande} onChange={e => setEditingLot({ ...editingLot, num_commande: e.target.value })} className="w-full px-3 py-2 border rounded-md" maxLength={2} /></div>
            <div><label className="block text-sm font-medium mb-1">N° Type Produit</label><input value={editingLot.num_type_produit} onChange={e => setEditingLot({ ...editingLot, num_type_produit: e.target.value })} className="w-full px-3 py-2 border rounded-md" maxLength={2} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><label className="block text-sm font-medium mb-1">Type</label><select value={editingLot.type_materiel} onChange={e => setEditingLot({ ...editingLot, type_materiel: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="Fil">Fil</option><option value="Feuillard">Feuillard</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={editingLot.date_reception.split('T')[0]} onChange={e => setEditingLot({ ...editingLot, date_reception: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          </div>
          {editingLot.type_materiel === 'Fil' ? (<div className="mt-4"><label className="block text-sm font-medium mb-1">Diamètre</label><input type="number" step="0.01" value={editingLot.diametre_fil || ''} onChange={e => setEditingLot({ ...editingLot, diametre_fil: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>) : (<div className="grid grid-cols-2 gap-4 mt-4"><div><label className="block text-sm font-medium mb-1">Largeur</label><input type="number" step="0.01" value={editingLot.largeur_feuillard || ''} onChange={e => setEditingLot({ ...editingLot, largeur_feuillard: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div><div><label className="block text-sm font-medium mb-1">Longueur</label><input type="number" step="0.01" value={editingLot.longueur_feuillard || ''} onChange={e => setEditingLot({ ...editingLot, longueur_feuillard: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div></div>)}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div><label className="block text-sm font-medium mb-1">Matière</label><select value={editingLot.matiere} onChange={e => setEditingLot({ ...editingLot, matiere: e.target.value })} className="w-full px-3 py-2 border rounded-md">{itemsMatiere.map(i => <option key={i.id} value={i.nom}>{i.nom}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Dureté</label><select value={editingLot.durete} onChange={e => setEditingLot({ ...editingLot, durete: e.target.value })} className="w-full px-3 py-2 border rounded-md">{itemsDurete.map(i => <option key={i.id} value={i.nom}>{i.nom}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Revêtement</label><select value={editingLot.revetement} onChange={e => setEditingLot({ ...editingLot, revetement: e.target.value })} className="w-full px-3 py-2 border rounded-md">{itemsRev.map(i => <option key={i.id} value={i.nom}>{i.nom}</option>)}</select></div>
          </div>
        </div>
        <div className="mb-6"><div className="flex justify-between items-center mb-3"><h2 className="text-lg font-semibold">Bobines ({editingLot.bobines.length})</h2><button onClick={() => setEditingLot({ ...editingLot, bobines: [...editingLot.bobines, { id: 0, code_bobine: '', num_bobine: editingLot.bobines.length + 1, poids_initial: '0', poids_actuel: '0', statut: 'EN_STOCK', lieu: 'STOCK_PRINCIPAL', num_commande_fabrication: '' }] })} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm">➕ Ajouter</button></div>
          <div className="space-y-3 max-h-96 overflow-y-auto">{editingLot.bobines.map((b: any, i: number) => (<div key={i} className="border rounded-md p-4 bg-gray-50"><div className="flex justify-between"><h3 className="font-semibold text-sm">Bobine {i + 1}</h3><button onClick={() => { if (confirm('Supprimer ?')) setEditingLot({ ...editingLot, bobines: editingLot.bobines.filter((_: any, idx: number) => idx !== i) }) }} className="bg-red-600 text-white px-2 py-1 rounded text-xs">🗑️</button></div><div className="grid grid-cols-3 gap-3 mt-2"><div><label className="text-xs">Poids init.</label><input type="number" step="0.01" value={b.poids_initial} onChange={e => setEditingLot({ ...editingLot, bobines: editingLot.bobines.map((x: any, idx: number) => idx === i ? { ...x, poids_initial: e.target.value } : x) })} className="w-full px-2 py-1 border rounded text-sm" /></div><div><label className="text-xs">Poids act.</label><input type="number" step="0.01" value={b.poids_actuel} onChange={e => setEditingLot({ ...editingLot, bobines: editingLot.bobines.map((x: any, idx: number) => idx === i ? { ...x, poids_actuel: e.target.value } : x) })} className="w-full px-2 py-1 border rounded text-sm" /></div><div><label className="text-xs">Statut</label><select value={b.statut} onChange={e => setEditingLot({ ...editingLot, bobines: editingLot.bobines.map((x: any, idx: number) => idx === i ? { ...x, statut: e.target.value } : x) })} className="w-full px-2 py-1 border rounded text-sm"><option value="EN_STOCK">En stock</option><option value="PARTIELLE">Partielle</option><option value="VIDE">Vide</option><option value="DECHET">Déchet</option></select></div></div><div className="grid grid-cols-2 gap-3 mt-2"><div><label className="text-xs">Lieu</label><select value={b.lieu} onChange={e => setEditingLot({ ...editingLot, bobines: editingLot.bobines.map((x: any, idx: number) => idx === i ? { ...x, lieu: e.target.value } : x) })} className="w-full px-2 py-1 border rounded text-sm"><option value="STOCK_PRINCIPAL">Stock</option><option value="USINE">Usine</option><option value="DECHET">Déchet</option></select></div><div><label className="text-xs">N° Cmd Fab</label><input value={b.num_commande_fabrication || ''} onChange={e => setEditingLot({ ...editingLot, bobines: editingLot.bobines.map((x: any, idx: number) => idx === i ? { ...x, num_commande_fabrication: e.target.value } : x) })} className="w-full px-2 py-1 border rounded text-sm" /></div></div></div>))}</div>
        </div>
        <div className="flex gap-3"><button onClick={() => { setShowEditLot(false); setEditingLot(null) }} className="flex-1 bg-gray-300 py-3 rounded-md">Annuler</button><button onClick={async () => { try { const res = await fetch(`/api/lots/${editingLot.id}/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingLot) }); if (res.ok) { alert('✅ Lot mis à jour'); setShowEditLot(false); setEditingLot(null); chargerBobines(); chargerLots() } else alert((await res.json()).error) } catch (e) { alert('❌') } }} className="flex-1 bg-green-600 text-white py-3 rounded-md">✓ Sauvegarder</button></div>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">⚠️ Modifier le code du lot renomme toutes les bobines. Supprimer une bobine efface son historique.</div>
      </div></div>
    )
  }

  // --- PAGE HOME ---
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex justify-between items-center">
            <div><p className="text-xs text-gray-600">Connecté en tant que</p><p className="font-bold text-blue-900">{currentUser}</p></div>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">🚪 Déconnexion</button>
          </div>
          <h1 className="text-4xl font-bold text-center text-blue-900 mb-12">📦 Gestion Stock Bobines</h1>
          <div className="grid grid-cols-2 gap-6">
            {(isAdmin || isSuper) && (<button onClick={() => setCurrentPage('etat')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">📊 État</button>)}
            {isSuper && (<button onClick={() => setCurrentPage('autre')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-12 rounded-xl text-2xl shadow-lg transition transform hover:scale-105">🔐 Autre</button>)}
            {!isSuper && !isAdmin && (<div className="col-span-2 text-center text-gray-500 py-12"><p className="text-lg">Bienvenue {currentUser}</p><p className="text-sm mt-2">Contactez un administrateur pour accéder aux fonctionnalités.</p></div>)}
          </div>
        </div>
      </div>
    )
  }

  // --- PAGE AUTRE ---
  if (currentPage === 'autre') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex justify-between items-center">
            <div><h1 className="text-2xl font-bold">🔐 Administration</h1><p className="text-sm text-gray-600">Super Admin : {currentUser}</p></div>
            <button onClick={() => { setCurrentPage('home'); setAutreSection('actions') }} className="bg-gray-600 text-white px-4 py-2 rounded-lg">← Accueil</button>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">⚡ Actions rapides</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setCurrentPage('arrivage')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl text-lg shadow">➕ Nouvel Arrivage</button>
              <button onClick={() => setCurrentPage('usine')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 rounded-xl text-lg shadow">➡️ Vers Usine</button>
              <button onClick={() => setCurrentPage('retour_usine')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-xl text-lg shadow">🔙 Retour Usine</button>
              <button onClick={() => setCurrentPage('retour')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl text-lg shadow">🗑️ Retour</button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b overflow-x-auto">
              {['actions', 'items', 'lots', 'users', 'history', 'backup', 'reset'].map(s => (
                <button key={s} onClick={() => { setAutreSection(s as AutreSection); if (s === 'lots') chargerLots(); if (s === 'users') chargerUsers(); if (s === 'history') chargerHistory() }}
                  className={`px-6 py-4 font-semibold whitespace-nowrap ${autreSection === s ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {{ actions: '⚡ Actions', items: '📝 Items', lots: '📦 Lots', users: '👥 Utilisateurs', history: '📊 Historique', backup: '💾 Backup', reset: '⚠️ Reset' }[s]}
                </button>
              ))}
            </div>
            <div className="p-6">
              {autreSection === 'items' && <ItemsManager onItemsChange={chargerItems} />}
              {autreSection === 'lots' && (
                <div>
                  {lots.length === 0 ? <p className="text-center py-8 text-gray-500">Cliquez sur l'onglet pour charger</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Fournisseur</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Nb</th><th className="px-3 py-2 text-center">Action</th></tr>
                        </thead>
                        <tbody>
                          {lots.map(l => (
                            <tr key={l.id} className="border-b hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono font-semibold">{l.nom}</td>
                              <td className="px-3 py-2">{l.code_fournisseur}</td>
                              <td className="px-3 py-2">{new Date(l.date_reception).toLocaleDateString('fr-FR')}</td>
                              <td className="px-3 py-2 text-right">{l.nb_bobines}</td>
                              <td className="px-3 py-2 text-center"><button onClick={() => handleEditLot(l.id)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs">✏️ Éditer</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {autreSection === 'users' && (
                <div>
                  {users.length === 0 && <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4"><p className="text-sm text-yellow-800 mb-2">Aucun utilisateur. Créez les défauts :</p><button onClick={async () => { try { await fetch('/api/users/init', { method: 'POST' }); chargerUsers(); alert('✅ Créés') } catch (e) { alert('❌') } }} className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm">🔄 Créer défauts</button></div>}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <h3 className="font-semibold mb-3">➕ Ajouter</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <input placeholder="Login" value={newUser.login} onChange={e => setNewUser({ ...newUser, login: e.target.value })} className="px-3 py-2 border rounded" />
                      <input placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="px-3 py-2 border rounded" />
                      <div className="flex items-center gap-2"><input type="checkbox" checked={newUser.isSuper} onChange={e => setNewUser({ ...newUser, isSuper: e.target.checked })} className="w-4 h-4" /><label className="text-sm">Super</label></div>
                      <div className="flex items-center gap-2"><input type="checkbox" checked={newUser.isAdmin} onChange={e => setNewUser({ ...newUser, isAdmin: e.target.checked })} className="w-4 h-4" /><label className="text-sm">Admin</label></div>
                    </div>
                    <button onClick={async () => { try { const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) }); if (res.ok) { setNewUser({ login: '', password: '', isSuper: false, isAdmin: false }); chargerUsers() } else alert((await res.json()).error) } catch (e) { alert('❌') } }} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md text-sm">✓ Ajouter</button>
                  </div>
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="border rounded-md p-3 bg-gray-50">
                        {editingUser?.id === u.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <input type="text" value={editingUser.login} onChange={e => setEditingUser({ ...editingUser, login: e.target.value })} className="px-3 py-2 border rounded-md" />
                              <input type="text" value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} className="px-3 py-2 border rounded-md" placeholder="Nouveau mot de passe" />
                              <div className="flex items-center gap-2"><input type="checkbox" checked={editingUser.isSuper} onChange={e => setEditingUser({ ...editingUser, isSuper: e.target.checked })} className="w-4 h-4" /><label className="text-sm">Super</label></div>
                              <div className="flex items-center gap-2"><input type="checkbox" checked={editingUser.isAdmin} onChange={e => setEditingUser({ ...editingUser, isAdmin: e.target.checked })} className="w-4 h-4" /><label className="text-sm">Admin</label></div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleUpdateUser} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">✓ Sauvegarder</button>
                              <button onClick={() => setEditingUser(null)} className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm">✕ Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold">{u.login}</span>
                              <span className="ml-3 text-xs text-gray-500">{u.password}</span>
                              {u.isSuper && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Super</span>}
                              {u.isAdmin && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Admin</span>}
                              {!u.actif && <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Désactivé</span>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingUser(u)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">✏️</button>
                              <button onClick={async () => { if (confirm('Supprimer ?')) { await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' }); chargerUsers() } }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">🗑️</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {autreSection === 'history' && (
                <div>{history.length === 0 ? <p className="text-center py-8 text-gray-500">Aucune connexion</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">User</th><th className="px-3 py-2 text-left">IP</th><th className="px-3 py-2 text-left">Appareil</th></tr></thead>
                      <tbody>{history.map(l => (<tr key={l.id} className="border-b hover:bg-gray-50"><td className="px-3 py-2 text-xs">{new Date(l.date_connexion).toLocaleString('fr-FR')}</td><td className="px-3 py-2 font-semibold">{l.utilisateur}</td><td className="px-3 py-2 text-xs text-gray-600">{l.ip_address || '-'}</td><td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">{l.appareil}</td></tr>))}</tbody>
                    </table>
                  </div>
                )}</div>
              )}
              {autreSection === 'backup' && (
                <div className="space-y-4">
                  <button onClick={handleExportBase} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-semibold">📥 Exporter toute la base (CSV)</button>
                  <p className="text-xs text-gray-500">1 fichier CSV contenant : réceptions, bobines, mouvements, items</p>
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h3 className="text-sm font-semibold mb-3">📤 Importer</h3>
                    <input type="file" accept=".csv" onChange={e => setBackupFile(e.target.files?.[0] || null)} className="flex-1 text-sm" />
                    {backupFile && <p className="text-xs text-green-700 mt-2">✅ {backupFile.name}</p>}
                    <button onClick={handleImportBase} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">📤 Restaurer</button>
                    <p className="text-xs text-red-600 mt-2">⚠️ Écrase les données actuelles.</p>
                  </div>
                  <div className="bg-blue-50 border rounded-md p-4">
                    <h3 className="text-sm font-semibold mb-2">📊 Exports partiels</h3>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => exporterCSV('stock')} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm">💾 Stock</button>
                      <button onClick={() => exporterCSV('mouvements')} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">📥 Mouvements</button>
                      <input type="text" value={commandeFilter} onChange={e => setCommandeFilter(e.target.value)} className="px-3 py-2 border rounded-md" placeholder="N° commande" />
                      <button onClick={() => exporterCSV('mouvements')} className="bg-blue-600 text-white px-4 py-2 rounded-md">Exporter</button>
                    </div>
                  </div>
                  <div className="bg-purple-50 border rounded-md p-4">
                    <h3 className="text-sm font-semibold mb-2">📉 Consommation</h3>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={moisConso} onChange={e => setMoisConso(parseInt(e.target.value) || 1)} min="1" max="120" className="w-20 px-3 py-2 border rounded-md" />
                      <span>mois</span>
                      <button onClick={() => exporterCSV('consommation')} className="bg-orange-600 text-white px-4 py-2 rounded-md">📈 Exporter</button>
                    </div>
                  </div>
                </div>
              )}
              {autreSection === 'reset' && (
                <div className="bg-red-50 border border-red-300 rounded-md p-6">
                  <p className="text-sm text-red-800 mb-4">Supprime TOUTES les données (réceptions, bobines, mouvements, items). Les utilisateurs et l'historique sont conservés.</p>
                  <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-md">⚠️ Réinitialiser</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- PAGES FONCTIONNELLES ---
  if (currentPage === 'arrivage') return (
    <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-blue-900">➕ Arrivage - Étape {wizardStep}/3</h1><button onClick={() => { setCurrentPage('autre'); setAutreSection('actions'); setWizardStep(1) }} className="text-red-600">✕</button></div>
      {wizardStep === 1 && (<form onSubmit={handleEtape1} className="space-y-4"><div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium mb-1">Code Fournisseur</label><input name="code_fournisseur" maxLength={4} required className="w-full px-4 py-2 border rounded-md uppercase" placeholder="MUGA" /></div><div><label className="block text-sm font-medium mb-1">N° Commande</label><input name="num_commande" maxLength={2} required className="w-full px-4 py-2 border rounded-md" placeholder="05" /></div><div><label className="block text-sm font-medium mb-1">N° Type Produit</label><input name="num_type_produit" maxLength={2} required className="w-full px-4 py-2 border rounded-md" placeholder="12" /></div></div><button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">Suivant →</button></form>)}
      {wizardStep === 2 && (<form onSubmit={handleEtape2} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Type</label><select name="type_materiel" className="w-full px-4 py-2 border rounded-md"><option value="Fil">Fil</option><option value="Feuillard">Feuillard</option></select></div><div><label className="block text-sm font-medium mb-1">Matière</label><select name="matiere" required className="w-full px-4 py-2 border rounded-md"><option value="">-- Choisir --</option>{itemsMatiere.map(i => (<option key={i.id} value={i.nom}>{i.nom}</option>))}</select></div><div><label className="block text-sm font-medium mb-1">Dureté</label><select name="durete" required className="w-full px-4 py-2 border rounded-md"><option value="">-- Choisir --</option>{itemsDurete.map(i => (<option key={i.id} value={i.nom}>{i.nom}</option>))}</select></div><div><label className="block text-sm font-medium mb-1">Revêtement</label><select name="revetement" required className="w-full px-4 py-2 border rounded-md"><option value="">-- Choisir --</option>{itemsRev.map(i => (<option key={i.id} value={i.nom}>{i.nom}</option>))}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Diamètre (mm)</label><input name="diametre_fil" type="number" step="0.01" className="w-full px-4 py-2 border rounded-md" placeholder="1.20" /></div><div><label className="block text-sm font-medium mb-1">Date</label><input name="date_reception" type="date" required className="w-full px-4 py-2 border rounded-md" /></div></div><div><label className="block text-sm font-medium mb-1">Nb bobines</label><input name="nombre_bobines" type="number" min="1" max="99" defaultValue="1" required className="w-full px-4 py-2 border rounded-md" /></div><div className="flex gap-2"><button type="button" onClick={() => setWizardStep(1)} className="flex-1 bg-gray-300 py-2 rounded-md">← Retour</button><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md">Suivant →</button></div></form>)}
      {wizardStep === 3 && (<div className="space-y-4"><div className="max-h-96 overflow-y-auto space-y-2">{receptionData.poids_bobines.map((p, i) => (<div key={i} className="flex items-center gap-4"><label className="w-32 text-sm font-medium">Bobine {String(i + 1).padStart(2, '0')}</label><input type="number" step="0.01" value={p || ''} onChange={e => handlePoidsChange(i, e.target.value)} className="flex-1 px-4 py-2 border rounded-md" placeholder="kg" /></div>))}</div><div className="bg-green-50 border border-green-200 rounded-md p-4"><p className="text-lg font-semibold text-green-800">Total : {poidsTotal.toFixed(2)} kg</p></div><div className="flex gap-2"><button onClick={() => setWizardStep(2)} className="flex-1 bg-gray-300 py-2 rounded-md">← Retour</button><button onClick={handleValiderReception} className="flex-1 bg-green-600 text-white py-2 rounded-md">✓ Valider</button></div></div>)}
    </div></div>
  )

  if (currentPage === 'usine') {
    const stock = bobines.filter(b => b.lieu === 'STOCK_PRINCIPAL'); const diams = Array.from(new Set(stock.filter(b => b.reception.type_materiel === 'Fil' && b.reception.diametre_fil).map(b => parseFloat(b.reception.diametre_fil!)))).sort((a, b) => a - b);
    const filt = stock.filter(b => { if (filtreDiametreUsine && b.reception.diametre_fil?.toString() !== filtreDiametreUsine) return false; if (rechercheNomUsine) { const s = rechercheNomUsine.toUpperCase(); if (!b.code_bobine.includes(s) && !b.reception.matiere.includes(s) && !b.reception.durete.includes(s)) return false } return true })
    const pFilt = filt.reduce((a, b) => a + parseFloat(b.poids_actuel.toString()), 0); const pTot = stock.reduce((a, b) => a + parseFloat(b.poids_actuel.toString()), 0)
    return (<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8"><div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-purple-900">➡️ Vers Usine</h1><button onClick={() => { setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null); setFiltreDiametreUsine(''); setRechercheNomUsine('') }} className="text-red-600">✕</button></div>{!selectedBobine ? (<div className="space-y-4"><button onClick={startScanner} className="w-full bg-blue-600 text-white py-3 rounded-md">📷 Scanner</button><input value={rechercheNomUsine} onChange={e => setRechercheNomUsine(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="🔍 Rechercher..." /><div className="bg-blue-50 border border-blue-200 rounded-md p-3"><label className="block text-sm font-medium mb-2">Filtrer par diamètre</label><div className="flex flex-wrap gap-2"><button onClick={() => setFiltreDiametreUsine('')} className={`px-3 py-1 rounded-md text-sm ${!filtreDiametreUsine ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Tous</button>{diams.map(d => (<button key={d} onClick={() => setFiltreDiametreUsine(d.toString())} className={`px-3 py-1 rounded-md text-sm ${filtreDiametreUsine === d.toString() ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Ø {d} mm</button>))}</div></div><div className="grid grid-cols-2 gap-3"><div className="bg-green-50 border rounded-md p-3 text-center"><p className="text-xs text-gray-600">Poids filtré</p><p className="text-xl font-bold text-green-800">{pFilt.toFixed(2)} kg</p><p className="text-xs text-gray-500">{filt.length} bobine(s)</p></div><div className="bg-gray-50 border rounded-md p-3 text-center"><p className="text-xs text-gray-600">Total stock</p><p className="text-xl font-bold text-gray-800">{pTot.toFixed(2)} kg</p><p className="text-xs text-gray-500">{stock.length} bobine(s)</p></div></div><div className="max-h-96 overflow-y-auto space-y-2">{filt.length === 0 ? <p className="text-center py-4 text-gray-500">Aucune</p> : filt.map(b => { const dim = b.reception.type_materiel === 'Fil' ? `Ø${b.reception.diametre_fil}` : `${b.reception.largeur_feuillard}x${b.reception.longueur_feuillard}`; return (<div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-purple-50 cursor-pointer flex justify-between"><div><div className="font-mono font-semibold">{b.code_bobine}</div><div className="text-sm text-gray-600">{dim} - {b.reception.matiere}</div></div><div className="font-bold text-green-800">{b.poids_actuel} kg</div></div>) })}</div></div>) : (<div className="space-y-4"><div className="bg-purple-50 border rounded-md p-4"><p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p><p className="text-sm">{selectedBobine.poids_actuel} kg</p></div><input value={numCommandeFabrication} onChange={e => setNumCommandeFabrication(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="N° commande fabrication" /><div className="flex gap-2"><button onClick={() => setSelectedBobine(null)} className="flex-1 bg-gray-300 py-2 rounded-md">← Retour</button><button onClick={handleVersUsine} className="flex-1 bg-green-600 text-white py-2 rounded-md">✓ Valider</button></div></div>)}</div></div>)
  }

  if (currentPage === 'retour_usine') {
    const usine = bobines.filter(b => b.lieu === 'USINE')
    return (<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8"><div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-indigo-900">🔙 Retour Usine</h1><button onClick={() => { setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null) }} className="text-red-600">✕</button></div>{!selectedBobine ? (<div className="space-y-4"><button onClick={startScanner} className="w-full bg-blue-600 text-white py-3 rounded-md">📷 Scanner</button><div className="max-h-96 overflow-y-auto space-y-2">{usine.map(b => (<div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-indigo-50 cursor-pointer"><div className="font-mono font-semibold">{b.code_bobine}</div><div className="text-sm text-gray-600">{b.num_commande_fabrication} - {b.poids_actuel} kg</div></div>))}</div></div>) : (<div className="space-y-4"><div className="bg-indigo-50 border rounded-md p-4"><p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p><p className="text-sm">Cmd: {selectedBobine.num_commande_fabrication}</p></div><input type="number" step="0.01" value={poidsRestant} onChange={e => setPoidsRestant(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="0 = terminée" /><p className="text-xs text-gray-500">0 kg = bobine terminée · Poids identique = retour sans consommation</p><button onClick={handleRetourUsine} className="w-full bg-green-600 text-white py-2 rounded-md">✓ Valider</button></div>)}</div></div>)
  }

  if (currentPage === 'retour') {
    const stock = bobines.filter(b => b.lieu === 'STOCK_PRINCIPAL')
    return (<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8"><div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-red-900">🗑️ Mise au rebut</h1><button onClick={() => { setCurrentPage('autre'); setAutreSection('actions'); setSelectedBobine(null) }} className="text-red-600">✕</button></div>{!selectedBobine ? (<div className="space-y-4"><button onClick={startScanner} className="w-full bg-blue-600 text-white py-3 rounded-md">📷 Scanner</button><div className="max-h-96 overflow-y-auto space-y-2">{stock.map(b => (<div key={b.id} onClick={() => setSelectedBobine(b)} className="p-3 border rounded-md hover:bg-red-50 cursor-pointer"><div className="font-mono font-semibold">{b.code_bobine}</div><div className="text-sm text-gray-600">{b.reception.matiere} - {b.poids_actuel} kg</div></div>))}</div></div>) : (<div className="space-y-4"><div className="bg-red-50 border rounded-md p-4"><p className="font-mono font-semibold text-lg">{selectedBobine.code_bobine}</p><p className="text-sm">{selectedBobine.poids_actuel} kg</p></div><button onClick={handleRetourDechet} className="w-full bg-red-600 text-white py-2 rounded-md">✓ Mettre au rebut</button></div>)}</div></div>)
  }

  if (currentPage === 'etat') {
    return (<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8"><div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold text-green-900">📊 État du stock</h1><button onClick={() => setCurrentPage('home')} className="text-red-600">✕</button></div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-blue-50 border rounded-md p-4 flex-1">
          <label className="block text-sm font-medium mb-2">Filtrer par diamètre</label>
          <div className="flex flex-wrap gap-2"><button onClick={() => setDiametreFilter('')} className={`px-4 py-2 rounded-md text-sm ${!diametreFilter ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Tous</button>{diametresDisponibles.map(d => (<button key={d} onClick={() => setDiametreFilter(d.toString())} className={`px-4 py-2 rounded-md text-sm ${diametreFilter === d.toString() ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Ø {d} mm</button>))}</div>
        </div>
        <div className="bg-purple-50 border rounded-md p-4 flex-1">
          <label className="block text-sm font-medium mb-2">Filtrer par lot</label>
          <select value={lotFilter} onChange={e => setLotFilter(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            <option value="all">Tous les lots</option>
            {Object.values(lotsDisponibles).map((l: any) => (<option key={l.id} value={l.id}>{l.nom} ({l.nb_bobines} bobines)</option>))}
          </select>
        </div>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 flex justify-between items-center">
        <span className="font-semibold text-green-900">📦 Total affiché :</span>
        <span className="text-green-800 font-bold text-lg">{totalPoidsEtat.toFixed(2)} kg <span className="text-sm font-normal text-green-700">({totalNbEtat} bobines)</span></span>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Dimension</th><th className="px-3 py-2 text-left">Dureté</th><th className="px-3 py-2 text-left">Revêtement</th><th className="px-3 py-2 text-right">Nb bobines</th><th className="px-3 py-2 text-right">Poids total</th></tr></thead><tbody>{etatFiltre.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-gray-500">Aucune donnée</td></tr> : etatFiltre.map((i, idx) => (<tr key={idx} className="border-b hover:bg-gray-50"><td className="px-3 py-2 font-semibold">{i.dimension}</td><td className="px-3 py-2">{i.durete}</td><td className="px-3 py-2">{i.revetement}</td><td className="px-3 py-2 text-right">{i.nb}</td><td className="px-3 py-2 text-right font-bold text-green-800">{i.poids.toFixed(2)} kg</td></tr>))}</tbody></table></div>
    </div></div>)
  }

  return null
}
