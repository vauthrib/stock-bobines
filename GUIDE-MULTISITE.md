# Déployer le même code sur plusieurs sites (RGM · SRGA · ARIV)

**Principe retenu** : une seule base de code, trois déploiements totalement isolés.
Les données ne se croisent jamais puisque chaque site possède **sa propre base Neon**,
**son propre projet Vercel** et **son propre dépôt GitHub**. Le code est identique partout :
seules trois variables d'environnement changent.

| | RGM (existant) | SRGA | ARIV |
|---|---|---|---|
| Dépôt GitHub | `vauthrib/stock-bobines` | `vauthrib/stock-bobines-srga` | `vauthrib/stock-bobines-ariv` |
| Projet Vercel | `stock-bobines` | `stock-bobines-srga` | `stock-bobines-ariv` |
| Adresse publique | `https://stock-bobines.vercel.app` | `https://stock-bobines-srga.vercel.app` | `https://stock-bobines-ariv.vercel.app` |
| Base Neon | `ep-restless-tooth-asxt7eaw` | `ep-mute-shape-b5at7hhg` | `ep-solitary-dust-b4vaihs7` |
| `NEXT_PUBLIC_SITE` | absent (= `RGM`) | `SRGA` | `ARIV` |
| Couleur de fond | vert | rose | bleu |

## État au 11/10/2026

- Les trois sites sont **en ligne en production** (RGM en V1.46, SRGA et ARIV en V1.46)
  et servent chacun **sa propre base** : `GET /api/site` renvoie `conflit: false` avec l'hôte
  `neon.tech` attendu (trois hôtes distincts) et le bon marqueur de site.
- Les projets Vercel `stock-bobines-srga` et `stock-bobines-ariv` ont leurs variables
  `DATABASE_URL`, `NEXT_PUBLIC_SITE` et `NEXT_PUBLIC_SITE_URL` sur l'environnement *Production*
  uniquement : un déploiement *Preview* de ces projets n'a pas de base tant que `DATABASE_URL`
  n'y est pas ajoutée (`vercel env add DATABASE_URL preview`).
- Les comptes Neon sont regroupés sous le compte **vauthrib3@gmail.com**.
- Les deux nouveaux sites ont démarré avec les **quatre comptes par défaut** (`POST /api/users/init`) :
  changer les mots de passe et supprimer les comptes inutiles depuis **Administration → Utilisateurs**.
- Le fichier `.vercelignore` garantit que `.env*`, `backups/`, `.vercel/`, `.git/` et `node_modules/`
  ne sont **jamais téléversés** vers Vercel (vérifié avec `vercel deploy --dry`).
- Reste à faire : passer les **trois dépôts GitHub en privé** (§ 0 bis) ; les deux nouveaux projets
  Vercel sont déployés en ligne de commande, l'**auto-déploiement à chaque `git push`** demande de
  connecter le dépôt au projet (**Project → Settings → Git → Connect Git Repository**).

## Variables d'environnement (une valeur par site)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | chaîne de connexion de la base **du site** (Neon, `postgresql://…?sslmode=require`) |
| `NEXT_PUBLIC_SITE` | `RGM`, `SRGA` ou `ARIV` : nom, badge et couleur de fond |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site, utilisée par les QR codes des étiquettes |

> `NEXT_PUBLIC_*` est lue **au moment de la compilation** : après les avoir créées ou modifiées,
> il faut **redéployer** le projet pour que le site change de couleur ou d'adresse.

## 0. Protéger les données de RGM (avant tout)

- **Sauvegarde** : `Administration → Backup` (ou `GET /api/backup/all`) exporte toute la base du site
  courant en CSV — à refaire avant chaque manipulation sensible. Une sauvegarde de RGM du 11/10/2026
  est conservée dans `backups/` (dossier ignoré par git).
- **Ne jamais réutiliser la `DATABASE_URL` de RGM** dans un autre projet Vercel.
- **Ne pas créer les nouvelles bases comme des *branches* du projet Neon de RGM** : une branche
  recopierait les données de RGM dans le nouveau site. Créer des **projets** Neon distincts.
- Le projet Vercel de RGM (`stock-bobines`) ne doit garder que sa `DATABASE_URL` actuelle :
  `NEXT_PUBLIC_SITE` absent équivaut à `RGM` (vert), donc **rien à modifier**.
- **Garde-fou automatique** : au premier démarrage, chaque base enregistre son site propriétaire
  (RGM, SRGA ou ARIV). Si une application est configurée pour un autre site que celui de la base,
  un bandeau rouge s'affiche et **toute écriture est refusée** (arrivage, mouvement, item,
  utilisateur, réinitialisation, import) : impossible de mélanger les données par erreur.

## 0 bis. Passer les dépôts GitHub en privé

Pour **chaque** dépôt (`stock-bobines`, `stock-bobines-srga`, `stock-bobines-ariv`) :
**Settings → General → Danger Zone → Change repository visibility → Make private**.

Après le passage en privé, vérifier que Vercel déploie toujours : **Project → Settings → Git**.
Si le dépôt n'apparaît plus, autoriser les dépôts privés : **Vercel → Account Settings →
Integrations → GitHub → Configure → Repository access**. Les `git push` continuent de fonctionner
(identifiants déjà enregistrés sur ce poste).

## 1. Créer la base de données *(fait pour SRGA et ARIV)*

1. [console.neon.tech](https://console.neon.tech) → **New Project** (par ex. `stock-bobines-srga`) —
   **pas** une branche du projet de RGM.
2. Copier la chaîne de connexion proposée (`postgresql://…`).
3. Dans ce dossier, écrire cette chaîne **seule, sur une ligne**, dans un fichier local `.env.srga`
   (les fichiers `.env*` sont déjà ignorés par git : rien ne sera publié).
4. Créer les tables et le schéma dans la nouvelle base :

```bash
DATABASE_URL="$(tr -d '\r\n' < .env.srga)" npx prisma db push
```

## 2. Créer le projet Vercel *(fait pour SRGA et ARIV)*

**Méthode A — tableau de bord (garde le déploiement automatique à chaque `git push`)**

1. [vercel.com/new](https://vercel.com/new) → importer le dépôt du site → Framework **Next.js** (réglages par défaut, `vercel.json` s'en occupe).
2. **Settings → Environment Variables**, pour l'environnement *Production* (et *Preview* si souhaité) :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne Neon du site |
   | `NEXT_PUBLIC_SITE` | `SRGA` |
   | `NEXT_PUBLIC_SITE_URL` | `https://stock-bobines-srga.vercel.app` (à ajuster après le premier déploiement) |
3. Déployer.

**Méthode B — ligne de commande** (la valeur du secret n'est jamais affichée à l'écran).
C'est la méthode utilisée pour SRGA et ARIV ; `--project` évite de toucher au projet de RGM,
et `--no-sensitive` garde `NEXT_PUBLIC_*` lisible (elles sont publiques de toute façon) :

```bash
# lecture de la chaîne sans l'afficher : la valeur ne passe jamais par le terminal
lire_url() { grep -E '^DATABASE_URL=' "$1" | head -1 | sed -E 's/^DATABASE_URL=//' | tr -d '\r'; }

S=stock-bobines-srga
vercel env add DATABASE_URL        production --project "$S" --value "$(lire_url .env.srga)" --sensitive -y
vercel env add NEXT_PUBLIC_SITE    production --project "$S" --value SRGA --no-sensitive -y
vercel env add NEXT_PUBLIC_SITE_URL production --project "$S" --value "https://$S.vercel.app" --no-sensitive -y

vercel deploy --prod --project "$S" --yes    # ne déploie que ce projet
```

> Toujours mettre `-y` **et** brancher l'entrée standard (`< /dev/null`) : sans cela la commande
> attend une saisie et semble se bloquer.

## 3. Créer les comptes du site

Chaque base a **ses propres utilisateurs**. Au premier démarrage, un appel à
`POST /api/users/init` crée quatre comptes par défaut (dont un Super Admin).
Pour un nouveau site, préférer la création de ses propres comptes depuis
**Administration → Utilisateurs**, puis vérifier qu'aucun compte de démonstration ne reste actif.

Penser aussi à saisir, par site, son catalogue d'**items** (matières, duretés, revêtements),
ses fournisseurs et ses lots : rien n'est partagé entre les sites.

## 4. Créer le dépôt GitHub et y pousser le code

1. Sur GitHub, créer un dépôt **vide** (par ex. `stock-bobines-srga`, sans README).
2. Le rattacher ici et pousser :

```bash
git remote add srga https://github.com/vauthrib/stock-bobines-srga.git
bash scripts/pousser-partout.sh          # envoie la branche main à tous les remotes
```

Répéter pour `ariv`. Le script envoie **le même code** à tous les remotes configurés :
une seule source de vérité, trois dépôts.

## 5. Vérifier un nouveau site

- L'écran de connexion doit porter le **badge du site** et sa couleur : RGM vert, SRGA rose, ARIV bleu.
- `GET /api/bobines` doit renvoyer uniquement les données de ce site (bases distinctes).
- Sur place : se connecter, saisir un arrivage test, vérifier l'**État du stock** et l'**Analyse des mouvements**.

Contrôles rapides, sans dépendance ni installation :

```bash
# identité du site, site propriétaire de la base, adresse de la base et compteurs
git config --get remote.origin.url   # rappel du dépôt courant
curl -s https://stock-bobines-srga.vercel.app/api/site

# schéma, compteurs et poids d'une base, depuis un fichier .env
node scripts/verif-base.mjs --env .env.srga
node scripts/verif-base.mjs --env .env       # RGM : témoin
```

Réponse attendue pour un site correctement rattaché : `"conflit": false`, `base.code` égal au
site, et un hôte `neon.tech` **différent** de celui des autres sites. En cas de `conflit: true`,
un bandeau rouge s'affiche dans l'application et les écritures sont refusées (HTTP 409) :
c'est le garde-fou, il ne faut **pas** le contourner, mais corriger `DATABASE_URL`
ou `NEXT_PUBLIC_SITE`.

## Points d'attention

- Ne jamais coller une `DATABASE_URL` dans un message, un ticket ou un fichier versionné.
- Les étiquettes QR pointent vers `NEXT_PUBLIC_SITE_URL` : poser la variable **avant** d'imprimer.
- Une correction de code profite aux trois sites : la pousser vers les trois remotes (`scripts/pousser-partout.sh`).
- Sauvegardes : `Administration → Backup` exporte le CSV **de la base du site courant**.
