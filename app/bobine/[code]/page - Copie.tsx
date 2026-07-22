'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

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
    type_materiel: string
    diametre_fil: string | null
    largeur_feuillard: string | null
    longueur_feuillard: string | null
    matiere: string
    durete: string
    revetement: string
    date_reception: string
  }
  mouvements: any[]
}

export default function BobinePage() {
  const params = useParams()
  const code = params.code as string

  const [bobine, setBobine] = useState<Bobine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [showAction, setShowAction] = useState<'usine' | 'stock' | 'rebut' | 'rebut_partiel' | null>(null)
  const [numCommande, setNumCommande] = useState('')
  const [poidsRestant, setPoidsRestant] = useState('')
  const [commentaireRebut, setCommentaireRebut] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Vérifier si authentifié aujourd'hui
    const authData = localStorage.getItem('bobine_auth')
    if (authData) {
      const { user, date } = JSON.parse(authData)
      const today = new Date().toDateString()
      if (date === today) {
        setIsAuthenticated(true)
        setCurrentUser(user)
        chargerBobine()
        return
      } else {
        // Supprimer l'ancienne auth si ce n'est pas aujourd'hui
        localStorage.removeItem('bobine_auth')
      }
    }
    setLoading(false)
  }, [code])

  const chargerBobine = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/bobine/${code}`)
      if (!res.ok) throw new Error('Bobine introuvable')
      const data = await res.json()
      setBobine(data)
    } catch (err) {
      setError('Bobine introuvable ou erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async () => {
    if (!login.trim() || !password.trim()) {
      setAuthError('Veuillez remplir tous les champs')
      return
    }

    try {
      const userAgent = navigator.userAgent || 'Navigateur inconnu'
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          login, 
          password,
          appareil: userAgent
        })
      })

      const data = await res.json()

      if (data.valid) {
        const today = new Date().toDateString()
        localStorage.setItem('bobine_auth', JSON.stringify({ 
          user: data.user, 
          date: today,
          isSuper: data.isSuper
        }))
        setIsAuthenticated(true)
        setCurrentUser(data.user)
        chargerBobine()
      } else {
        setAuthError(data.error || 'Erreur de connexion')
      }
    } catch (err) {
      setAuthError('Erreur de connexion au serveur')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('bobine_auth')
    setIsAuthenticated(false)
    setCurrentUser('')
    setLogin('')
    setPassword('')
    setBobine(null)
  }

  const handleVersUsine = async () => {
    if (!numCommande.trim()) {
      alert('Veuillez saisir le N° de commande')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: bobine?.code_bobine,
          type_mouvement: 'TRANSFERT_VERS_USINE',
          poids_mouvement: 0,
          num_commande_fabrication: numCommande
        })
      })

      if (res.ok) {
        alert('✅ Bobine transférée vers l\'usine')
        setShowAction(null)
        setNumCommande('')
        chargerBobine()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (err) {
      alert('❌ Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVersStock = async () => {
    const poids = parseFloat(poidsRestant)
    const poidsInitial = parseFloat(bobine?.poids_initial || '0')

    if (isNaN(poids) || poids <= 0) {
      alert('Veuillez saisir un poids valide')
      return
    }

    if (poids >= poidsInitial) {
      alert(`❌ Le poids doit être inférieur au poids initial (${poidsInitial} kg)`)
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: bobine?.code_bobine,
          type_mouvement: 'RETOUR_USINE',
          poids_mouvement: poids,
          lieu_destination: 'STOCK_PRINCIPAL'
        })
      })

      if (res.ok) {
        alert('✅ Bobine retournée au stock principal')
        setShowAction(null)
        setPoidsRestant('')
        chargerBobine()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (err) {
      alert('❌ Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVersRebut = async () => {
    if (!commentaireRebut.trim()) {
      alert('Veuillez décrire le problème')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: bobine?.code_bobine,
          type_mouvement: 'SORTIE_DECHET',
          poids_mouvement: parseFloat(bobine?.poids_actuel || '0'),
          texte_libre: commentaireRebut
        })
      })

      if (res.ok) {
        alert('✅ Bobine mise au rebut')
        setShowAction(null)
        setCommentaireRebut('')
        chargerBobine()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (err) {
      alert('❌ Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRebutPartiel = async () => {
    const poids = parseFloat(poidsRestant)
    
    if (isNaN(poids) || poids <= 0) {
      alert('Veuillez saisir un poids valide')
      return
    }

    if (!commentaireRebut.trim()) {
      alert('Veuillez décrire le problème')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_bobine: bobine?.code_bobine,
          type_mouvement: 'SORTIE_DECHET',
          poids_mouvement: poids,
          texte_libre: commentaireRebut
        })
      })

      if (res.ok) {
        alert('✅ Rebut partiel enregistré')
        setShowAction(null)
        setPoidsRestant('')
        setCommentaireRebut('')
        chargerBobine()
      } else {
        const error = await res.json()
        alert(`❌ ${error.error}`)
      }
    } catch (err) {
      alert('❌ Erreur de connexion')
    } finally {
      setActionLoading(false)
    }
  }

  // Page de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">Connexion requise</h1>
            <p className="text-sm text-gray-600">Entrez vos identifiants pour continuer</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
              <input 
                type="text" 
                value={login} 
                onChange={(e) => setLogin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" 
                placeholder="Votre login"
                autoFocus 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" 
                placeholder="Votre mot de passe"
              />
            </div>

            {authError && (
              <p className="text-red-600 text-sm text-center">{authError}</p>
            )}

            <button 
              onClick={handleAuth} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Se connecter
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Bobine : {code}</p>
            <p className="mt-1">Connexion autorisée de 7h30 à 18h00</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl text-gray-700">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !bobine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-gray-700 mb-4">{error || 'Bobine introuvable'}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">Réessayer</button>
        </div>
      </div>
    )
  }

  const r = bobine.reception
  const dimension = r.type_materiel === 'Fil' ? `Ø${r.diametre_fil} mm` : `${r.largeur_feuillard} x ${r.longueur_feuillard} mm`

  const getStatutColor = (statut: string) => {
    const colors: Record<string, string> = { EN_STOCK: 'bg-green-100 text-green-800', PARTIELLE: 'bg-orange-100 text-orange-800', VIDE: 'bg-gray-100 text-gray-800', DECHET: 'bg-red-100 text-red-800' }
    return colors[statut] || 'bg-gray-100 text-gray-800'
  }

  const getLieuColor = (lieu: string) => {
    const colors: Record<string, string> = { STOCK_PRINCIPAL: 'bg-blue-100 text-blue-800', USINE: 'bg-purple-100 text-purple-800', DECHET: 'bg-red-100 text-red-800' }
    return colors[lieu] || 'bg-gray-100 text-gray-800'
  }

  const estEnUsine = bobine.lieu === 'USINE'
  const estAuStock = bobine.lieu === 'STOCK_PRINCIPAL'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header avec info utilisateur */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Connecté en tant que</p>
            <p className="font-bold text-blue-900">{currentUser}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
            Déconnexion
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-2">{bobine.code_bobine}</h1>
              <p className="text-sm text-gray-600">{r.code_fournisseur} - Cmd {r.num_commande}</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatutColor(bobine.statut)}`}>{bobine.statut}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ml-2 ${getLieuColor(bobine.lieu)}`}>{bobine.lieu === 'STOCK_PRINCIPAL' ? 'Stock Principal' : bobine.lieu === 'USINE' ? 'Usine' : 'Déchet'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Dimension</p>
              <p className="text-2xl font-bold text-blue-800">{dimension}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Poids actuel</p>
              <p className="text-2xl font-bold text-green-800">{bobine.poids_actuel} kg</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Matière</span><span className="font-semibold">{r.matiere}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Dureté</span><span className="font-semibold">{r.durete}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Revêtement</span><span className="font-semibold">{r.revetement}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Poids initial</span><span className="font-semibold">{bobine.poids_initial} kg</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Date réception</span><span className="font-semibold">{new Date(r.date_reception).toLocaleDateString('fr-FR')}</span></div>
            {bobine.num_commande_fabrication && (<div className="flex justify-between py-2 border-b"><span className="text-gray-600">Commande fabrication</span><span className="font-semibold">{bobine.num_commande_fabrication}</span></div>)}
          </div>
        </div>

        {!showAction && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions disponibles</h2>
            
            {estAuStock && (
              <div className="space-y-3">
                <button onClick={() => setShowAction('usine')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-lg transition text-lg">➡️ Vers Usine</button>
                <button onClick={() => setShowAction('rebut')} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition text-lg">🗑️ Vers Rebut (total)</button>
              </div>
            )}

            {estEnUsine && (
              <div className="space-y-3">
                <button onClick={() => setShowAction('stock')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition text-lg">📦 Vers Stock (avec poids)</button>
                <button onClick={() => setShowAction('rebut')} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition text-lg">🗑️ Vers Rebut (total)</button>
                <button onClick={() => setShowAction('rebut_partiel')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-lg transition text-lg">⚠️ Rebut Partiel (avec poids)</button>
              </div>
            )}

            {!estAuStock && !estEnUsine && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">Cette bobine est au rebut</p>
                <p className="text-sm mt-2">Aucune action disponible</p>
              </div>
            )}
          </div>
        )}

        {showAction === 'usine' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-purple-900 mb-4">➡️ Transférer vers l'usine</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">N° de commande / fabrication</label>
                <input type="text" value={numCommande} onChange={(e) => setNumCommande(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="CMD-2026-001" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAction(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg">Annuler</button>
                <button onClick={handleVersUsine} disabled={actionLoading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{actionLoading ? '...' : 'Valider'}</button>
              </div>
            </div>
          </div>
        )}

        {showAction === 'stock' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-blue-900 mb-4">📦 Retour au stock principal</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">Poids initial : <strong>{bobine.poids_initial} kg</strong></p>
                <p className="text-gray-700">Poids actuel : <strong>{bobine.poids_actuel} kg</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poids restant de la bobine (kg)</label>
                <input type="number" step="0.01" value={poidsRestant} onChange={(e) => setPoidsRestant(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" placeholder="15.5" autoFocus />
                <p className="text-xs text-gray-500 mt-1">Doit être inférieur à {bobine.poids_initial} kg</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAction(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg">Annuler</button>
                <button onClick={handleVersStock} disabled={actionLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{actionLoading ? '...' : 'Valider'}</button>
              </div>
            </div>
          </div>
        )}

        {showAction === 'rebut' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-red-900 mb-4">🗑️ Mettre au rebut (total)</h2>
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">Poids actuel : <strong>{bobine.poids_actuel} kg</strong></p>
                <p className="text-xs text-gray-600 mt-1">La bobine sera entièrement déclarée comme déchet</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description du problème</label>
                <textarea value={commentaireRebut} onChange={(e) => setCommentaireRebut(e.target.value)} rows={4} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none" placeholder="Décrivez le problème (cassure, contamination, etc.)" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAction(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg">Annuler</button>
                <button onClick={handleVersRebut} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{actionLoading ? '...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}

        {showAction === 'rebut_partiel' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-orange-900 mb-4">⚠️ Rebut Partiel</h2>
            <div className="space-y-4">
              <div className="bg-orange-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">Poids initial : <strong>{bobine.poids_initial} kg</strong></p>
                <p className="text-gray-700">Poids actuel : <strong>{bobine.poids_actuel} kg</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poids à mettre au rebut (kg)</label>
                <input type="number" step="0.01" value={poidsRestant} onChange={(e) => setPoidsRestant(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="5.5" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description du problème</label>
                <textarea value={commentaireRebut} onChange={(e) => setCommentaireRebut(e.target.value)} rows={4} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none" placeholder="Décrivez le problème" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAction(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg">Annuler</button>
                <button onClick={handleRebutPartiel} disabled={actionLoading} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">{actionLoading ? '...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}

        {bobine.mouvements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Historique récent</h2>
            <div className="space-y-2">
              {bobine.mouvements.slice(0, 5).map((mvt, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold">
                      {mvt.type_mouvement === 'TRANSFERT_VERS_USINE' && '➡️ Vers Usine'}
                      {mvt.type_mouvement === 'RETOUR_USINE' && '🔙 Retour Usine'}
                      {mvt.type_mouvement === 'SORTIE_DECHET' && '🗑️ Rebut'}
                      {mvt.type_mouvement === 'ENTREE_FOURNISSEUR' && '📥 Entrée'}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(mvt.date_mouvement).toLocaleDateString('fr-FR')} à {new Date(mvt.date_mouvement).toLocaleTimeString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    {mvt.poids_mouvement > 0 && (<p className="text-sm font-semibold">{mvt.poids_mouvement} kg</p>)}
                    {mvt.n_commande_client && (<p className="text-xs text-gray-600">{mvt.n_commande_client}</p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}