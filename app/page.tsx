'use client'

import { useState, useEffect } from 'react'

type Bobine = {
  id: number
  code_bobine: string
  poids_initial: string
  poids_actuel: string
  statut: string
  reception: {
    code_fournisseur: string
    matiere: string
    type_materiel: string
    diametre_fil: string | null
    largeur_feuillard: string | null
    longueur_feuillard: string | null
    durete: string
    revetement: string
  }
}

export default function Home() {
  const [bobines, setBobines] = useState<Bobine[]>([])
  const [msgReception, setMsgReception] = useState('')
  const [msgMouvement, setMsgMouvement] = useState('')
  const [typeMat, setTypeMat] = useState('Fil')
  const [typeMouvement, setTypeMouvement] = useState('SORTIE_USINE')
  const [moisConso, setMoisConso] = useState(3)

  // Charger les bobines au démarrage
  useEffect(() => {
    chargerBobines()
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

  // Gestion de la réception
  const handleSubmitReception = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    const data = {
      code_fournisseur: formData.get('code_fournisseur'),
      num_commande: formData.get('num_commande'),
      num_type_produit: formData.get('num_type_produit'),
      type_materiel: formData.get('type_materiel'),
      diametre_fil: formData.get('diametre_fil'),
      longueur_feuillard: formData.get('longueur_feuillard'),
      largeur_feuillard: formData.get('largeur_feuillard'),
      matiere: formData.get('matiere'),
      durete: formData.get('durete'),
      revetement: formData.get('revetement'),
      date_reception: formData.get('date_reception'),
      nombre_bobines: parseInt(formData.get('nombre_bobines') as string),
      poids_par_bobine: formData.get('poids_par_bobine')
    }

    try {
      const res = await fetch('/api/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (res.ok) {
        setMsgReception(`✅ ${result.message}`)
        form.reset()
        chargerBobines()
      } else {
        setMsgReception(`❌ ${result.error}`)
      }
    } catch (error) {
      setMsgReception('❌ Erreur de connexion')
    }
    
    setTimeout(() => setMsgReception(''), 5000)
  }

  // Gestion des mouvements
  const handleSubmitMouvement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    const data = {
      code_bobine: formData.get('code_bobine'),
      type_mouvement: formData.get('type_mouvement'),
      poids_mouvement: formData.get('poids_mouvement'),
      n_commande_client: formData.get('n_commande_client'),
      client: formData.get('client'),
      texte_libre: formData.get('texte_libre')
    }

    try {
      const res = await fetch('/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (res.ok) {
        setMsgMouvement(`✅ ${result.message} - Restant: ${result.poids_restant} kg (${result.statut})`)
        form.reset()
        chargerBobines()
      } else {
        setMsgMouvement(`❌ ${result.error}`)
      }
    } catch (error) {
      setMsgMouvement('❌ Erreur de connexion')
    }
    
    setTimeout(() => setMsgMouvement(''), 5000)
  }

  // Export CSV
  const exporterCSV = async (type: 'stock' | 'consommation') => {
    const url = type === 'stock' 
      ? '/api/export/stock'
      : `/api/export/consommation?mois=${moisConso}`
    
    window.open(url, '_blank')
  }

  const getStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      EN_STOCK: 'bg-green-100 text-green-800',
      PARTIELLE: 'bg-orange-100 text-orange-800',
      VIDE: 'bg-gray-100 text-gray-800',
      DECHET: 'bg-red-100 text-red-800'
    }
    return colors[statut] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-6">📦 Gestion Stock Bobines</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* FORMULAIRE RÉCEPTION */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-4 border-b-2 border-blue-500 pb-2">
              ➕ Nouvelle Réception
            </h2>
            <form onSubmit={handleSubmitReception} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code Fournisseur</label>
                  <input name="code_fournisseur" maxLength={4} required placeholder="MUGA"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">N° Commande</label>
                  <input name="num_commande" maxLength={2} required placeholder="05"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">N° Type Produit</label>
                  <input name="num_type_produit" maxLength={2} required placeholder="12"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type de matériel</label>
                <select name="type_materiel" value={typeMat} onChange={(e) => setTypeMat(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="Fil">Fil</option>
                  <option value="Feuillard">Feuillard</option>
                </select>
              </div>

              {typeMat === 'Fil' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Diamètre fil (mm)</label>
                  <input name="diametre_fil" type="number" step="0.01" placeholder="1.20"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Largeur (mm)</label>
                    <input name="largeur_feuillard" type="number" step="0.01" placeholder="20"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Longueur (mm)</label>
                    <input name="longueur_feuillard" type="number" step="0.01" placeholder="1000"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Matière</label>
                  <select name="matiere" required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="Acier">Acier</option>
                    <option value="Inox">Inox</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Cuivre">Cuivre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dureté</label>
                  <select name="durete" required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="Doux">Fil Doux</option>
                    <option value="SL">Fil Ressort SL</option>
                    <option value="SM">Fil Ressort SM</option>
                    <option value="SH">Fil Ressort SH</option>
                    <option value="TH">Fil Ressort TH</option>
                    <option value="InoxNS">Inox NS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Revêtement</label>
                <select name="revetement" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="Noir">Noir</option>
                  <option value="Galva">Galva</option>
                  <option value="Galfan">Galfan</option>
                  <option value="Cuivré">Cuivré</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date de réception</label>
                <input name="date_reception" type="date" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nb bobines (max 99)</label>
                  <input name="nombre_bobines" type="number" min="1" max="99" defaultValue="1" required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Poids/bobine (kg)</label>
                  <input name="poids_par_bobine" type="number" step="0.01" required placeholder="25.5"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition">
                Enregistrer la réception
              </button>

              {msgReception && (
                <div className={`p-2 rounded text-sm ${msgReception.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {msgReception}
                </div>
              )}
            </form>
          </div>

          {/* FORMULAIRE MOUVEMENT */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-4 border-b-2 border-blue-500 pb-2">
              🔄 Mouvement de stock
            </h2>
            <form onSubmit={handleSubmitMouvement} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code Bobine</label>
                <input name="code_bobine" required placeholder="MUGA0512-03"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type de mouvement</label>
                <select name="type_mouvement" value={typeMouvement} onChange={(e) => setTypeMouvement(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="SORTIE_USINE">Sortie vers Usine</option>
                  <option value="RETOUR_USINE">Retour d'Usine</option>
                  <option value="SORTIE_DECHET">Sortie vers Déchet</option>
                </select>
              </div>

              {typeMouvement === 'SORTIE_USINE' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">N° Commande Client</label>
                    <input name="n_commande_client" placeholder="CMD-2026-001"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <input name="client" placeholder="Nom du client"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Poids du mouvement (kg)</label>
                <input name="poids_mouvement" type="number" step="0.01" required placeholder="5.5"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Note (optionnel)</label>
                <textarea name="texte_libre" rows={2} placeholder="Commentaire..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>

              <button type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition">
                Enregistrer le mouvement
              </button>

              {msgMouvement && (
                <div className={`p-2 rounded text-sm ${msgMouvement.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {msgMouvement}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* LISTE DES BOBINES */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-800 border-b-2 border-blue-500 pb-2">
              📋 Stock actuel ({bobines.length} bobines)
            </h2>
            <button onClick={chargerBobines}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium">
              🔄 Rafraîchir
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Matière</th>
                  <th className="px-3 py-2 text-left">Dimension</th>
                  <th className="px-3 py-2 text-left">Dureté</th>
                  <th className="px-3 py-2 text-right">Poids initial</th>
                  <th className="px-3 py-2 text-right">Poids actuel</th>
                  <th className="px-3 py-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {bobines.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-gray-500">Aucune bobine en stock</td></tr>
                ) : (
                  bobines.map(b => {
                    const dim = b.reception.type_materiel === 'Fil'
                      ? `Ø${b.reception.diametre_fil}`
                      : `${b.reception.largeur_feuillard}x${b.reception.longueur_feuillard}`
                    return (
                      <tr key={b.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold">{b.code_bobine}</td>
                        <td className="px-3 py-2">{b.reception.matiere}</td>
                        <td className="px-3 py-2">{dim}</td>
                        <td className="px-3 py-2">{b.reception.durete}</td>
                        <td className="px-3 py-2 text-right">{b.poids_initial} kg</td>
                        <td className="px-3 py-2 text-right font-semibold">{b.poids_actuel} kg</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatutBadge(b.statut)}`}>
                            {b.statut}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXPORTS CSV */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">📊 Exports CSV</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <button onClick={() => exporterCSV('stock')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-md transition">
              💾 Exporter stock actuel
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Consommation sur</label>
              <input type="number" value={moisConso} onChange={(e) => setMoisConso(parseInt(e.target.value) || 1)}
                min="1" max="120"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm" />
              <span className="text-sm">mois</span>
              <button onClick={() => exporterCSV('consommation')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2 rounded-md transition">
                📈 Exporter consommation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}