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

  // Authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [authError, setAuthError] = useState('')

  // Actions
  const [showAction, setShowAction] = useState<'usine' | 'stock' | 'rebut' | null>(null)
  const [numCommande, setNumCommande] = useState('')
  const [poidsRestant, setPoidsRestant] = useState('')
  const [commentaireRebut, setCommentaireRebut] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Vérifier si déjà authentifié
    const auth = localStorage.getItem('bobine_access_granted')
    if (auth === 'true') {
      setIsAuthenticated(true)
      chargerBobine()
    } else {
      setLoading(false)
    }
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
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode })
      })

      const data = await res.json()

      if (data.valid) {
        localStorage.setItem('bobine_access_granted', 'true')
        setIsAuthenticated(true)
        chargerBobine()
      } else {
        setAuthError('Code incorrect')
      }
    } catch (err) {
      setAuthError('Erreur de connexion')
    }
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

  // Page d'authentification
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">Accès sécurisé</h1>
            <p className="text-sm text-gray-600">Entrez le code d'accès pour continuer</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-lg focus:border-blue-500 focus:outline-none"
              placeholder="Code d'accès"
              maxLength={10}
              autoFocus
            />

            {authError && (
              <p className="text-red-600 text-sm text-center">{authError}</p>
            )}

            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Valider
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            Bobine : {code}
          </div>
        </div>
      </div>
    )
  }

  // Chargement
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

  // Erreur
  if (error || !bobine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-gray-700 mb-4">{error || 'Bobine introuvable'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const r = bobine.reception
  const dimension = r.type_materiel === 'Fil'
    ? `Ø${r.diametre_fil} mm`
    : `${r.largeur_feuillard} x ${r.longueur_feuillard} mm`

  const getStatutColor = (statut: string) => {
    const colors: Record<string, string> = {
      EN_STOCK: 'bg-green-100 text-green-800',
      PARTIELLE: 'bg-orange-100 text-orange-800',
      VIDE: 'bg-gray-100 text-gray-800',
      DECHET: 'bg-red-100 text-red-800'
    }
    return colors[statut] || 'bg-gray-100 text-gray-800'
  }

  const getLieuColor = (lieu: string) => {
    const colors: Record<string, string> = {
      STOCK_PRINCIPAL: 'bg-blue-100 text-blue-800',
      USINE: 'bg-purple-100 text-purple-800',
      DECHET: 'bg-red-100 text-red-800'
    }
    return colors[lieu] || 'bg-gray-100 text-gray-800'
  }

  // Page principale avec infos et actions
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-2">{bobine.code_bobine}</h1>
              <p className="text-sm text-gray-600">{r.code_fournisseur} - Cmd {r.num_commande}</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatutColor(bobine.statut)}`}>
                {bobine.statut}
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ml-2 ${getLieuColor(bobine.lieu)}`}>
                {bobine.lieu === 'STOCK_PRINCIPAL' ? 'Stock Principal' : bobine.lieu === 'USINE' ? 'Usine' : 'Déchet'}
              </div>
            </div>
          </div>

          {/* Infos principales */}
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

          {/* Détails */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Matière</span>
              <span className="font-semibold">{r.matiere}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Dureté</span>
              <span className="font-semibold">{r.durete}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Revêtement</span>
              <span className="font-semibold">{r.revetement}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Poids initial</span>
              <span className="font-semibold">{bobine.poids_initial} kg</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Date réception</span>
              <span className="font-semibold">{new Date(r.date_reception).toLocaleDateString('fr-FR')}</span>
            </div>
            {bobine.num_commande_fabrication && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Commande fabrication</span>
                <span className="font-semibold">{bobine.num_commande_fabrication}</span>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        {!showAction && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowAction('usine')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-lg transition text-lg"
              >
                ➡️ Vers Usine
              </button>
              <button
                onClick={() => setShowAction('stock')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition text-lg"
              >
                📦 Vers Stock
              </button>
              <button
                onClick={() => setShowAction('rebut')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition text-lg"
              >
                🗑️ Vers Rebut
              </button>
            </div>
          </div>
        )}

        {/* Formulaire Vers Usine */}
        {showAction === 'usine' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-purple-900 mb-4">➡️ Transférer vers l'usine</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° de commande / fabrication
                </label>
                <input
                  type="text"
                  value={numCommande}
                  onChange={(e) => setNumCommande(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="CMD-2026-001"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAction(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleVersUsine}
                  disabled={actionLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {actionLoading ? '...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire Vers Stock */}
        {showAction === 'stock' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-blue-900 mb-4">📦 Retour au stock principal</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  Poids initial : <strong>{bobine.poids_initial} kg</strong>
                </p>
                <p className="text-gray-700">
                  Poids actuel : <strong>{bobine.poids_actuel} kg</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids restant de la bobine (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={poidsRestant}
                  onChange={(e) => setPoidsRestant(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="15.5"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Doit être inférieur à {bobine.poids_initial} kg
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAction(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleVersStock}
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {actionLoading ? '...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire Vers Rebut */}
        {showAction === 'rebut' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-red-900 mb-4">🗑️ Mettre au rebut</h2>
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">
                  Poids actuel : <strong>{bobine.poids_actuel} kg</strong>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  La bobine sera entièrement déclarée comme déchet
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description du problème
                </label>
                <textarea
                  value={commentaireRebut}
                  onChange={(e) => setCommentaireRebut(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                  placeholder="Décrivez le problème (cassure, contamination, etc.)"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAction(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleVersRebut}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {actionLoading ? '...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historique des mouvements */}
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
                    <p className="text-xs text-gray-500">
                      {new Date(mvt.date_mouvement).toLocaleDateString('fr-FR')} à {new Date(mvt.date_mouvement).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    {mvt.poids_mouvement > 0 && (
                      <p className="text-sm font-semibold">{mvt.poids_mouvement} kg</p>
                    )}
                    {mvt.n_commande_client && (
                      <p className="text-xs text-gray-600">{mvt.n_commande_client}</p>
                    )}
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