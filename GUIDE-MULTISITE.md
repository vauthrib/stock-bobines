# Déployer le même code sur plusieurs sites (RGM · SRGA · ARIV)

**Principe retenu** : une seule base de code, trois déploiements totalement isolés.
Les données ne se croisent jamais puisque chaque site possède **sa propre base Neon**,
**son propre projet Vercel** et **son propre dépôt GitHub**. Le code est identique partout :
seules trois variables d'environnement changent.

| | RGM (existant) | SRGA | ARIV |
|---|---|---|---|
| Dépôt GitHub | `vauthrib/stock-bobines` | à créer | à créer |
| Projet Vercel | `stock-bobines` | à créer | à créer |
| Base Neon | existante | à créer | à créer |
| `NEXT_PUBLIC_SITE` | `RGM` | `SRGA` | `ARIV` |
| Couleur de fond | vert | rose | bleu |

## Variables d'environnement (une valeur par site)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | chaîne de connexion de la base **du site** (Neon, `postgresql://…?sslmode=require`) |
| `NEXT_PUBLIC_SITE` | `RGM`, `SRGA` ou `ARIV` : nom, badge et couleur de fond |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site, utilisée par les QR codes des étiquettes |

> `NEXT_PUBLIC_*` est lue **au moment de la compilation** : après les avoir créées ou modifiées,
> il faut **redéployer** le projet pour que le site change de couleur ou d'adresse.

## 1. Créer la base de données

1. [console.neon.tech](https://console.neon.tech) → **New Project** (par ex. `stock-bobines-srga`).
2. Copier la chaîne de connexion proposée (`postgresql://…`).
3. Dans ce dossier, écrire cette chaîne **seule, sur une ligne**, dans un fichier local `.env.srga`
   (les fichiers `.env*` sont déjà ignorés par git : rien ne sera publié).
4. Créer les tables et le schéma dans la nouvelle base :

```bash
DATABASE_URL="$(tr -d '\r\n' < .env.srga)" npx prisma db push
```

## 2. Créer le projet Vercel

**Méthode A — tableau de bord (garde le déploiement automatique à chaque `git push`)**

1. [vercel.com/new](https://vercel.com/new) → importer le dépôt du site → Framework **Next.js** (réglages par défaut, `vercel.json` s'en occupe).
2. **Settings → Environment Variables**, pour l'environnement *Production* (et *Preview* si souhaité) :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne Neon du site |
   | `NEXT_PUBLIC_SITE` | `SRGA` |
   | `NEXT_PUBLIC_SITE_URL` | `https://stock-bobines-srga.vercel.app` (à ajuster après le premier déploiement) |
3. Déployer.

**Méthode B — ligne de commande** (la valeur du secret n'est jamais affichée à l'écran) :

```bash
vercel link                      # associer ce dossier au projet du site
vercel env add DATABASE_URL production < .env.srga
vercel env add NEXT_PUBLIC_SITE production          # saisir SRGA
vercel env add NEXT_PUBLIC_SITE_URL production      # saisir l'adresse du site
vercel deploy --prod
```

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

## Points d'attention

- Ne jamais coller une `DATABASE_URL` dans un message, un ticket ou un fichier versionné.
- Les étiquettes QR pointent vers `NEXT_PUBLIC_SITE_URL` : poser la variable **avant** d'imprimer.
- Une correction de code profite aux trois sites : la pousser vers les trois remotes (`scripts/pousser-partout.sh`).
- Sauvegardes : `Administration → Backup` exporte le CSV **de la base du site courant**.
