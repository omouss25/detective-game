# Bureau des Affaires Non Résolues — Setup

## Variables d'environnement

Créez un fichier `.env.local` à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-...
```

## Supabase Setup

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez dans l'ordre :
   - `supabase/schema.sql` — crée les tables et politiques RLS
   - `supabase/seed.sql` — insère les 3 affaires de base

## Démarrage local

```bash
npm install
npm run dev
```

## Déploiement Vercel

1. Connectez votre repo GitHub à Vercel
2. Ajoutez les 3 variables d'environnement dans les settings Vercel
3. Déployez

## Architecture

```
app/
├── (auth)/          # Pages connexion/inscription (non protégées)
├── (game)/          # Pages jeu (protégées par middleware)
│   ├── affaires/    # Liste des affaires
│   │   └── [slug]/  # Détail affaire, enquête, résolution
│   └── profil/      # Profil joueur
├── api/
│   ├── investigate/ # Stream SSE vers Claude
│   └── accuse/      # Résolution finale
└── page.tsx         # Landing page
```

## Modèle IA

Utilise `claude-sonnet-4-20250514` pour :
- **Narrateur** : Chaque message d'enquête (streaming SSE)
- **Résolution** : Validation de l'accusation finale

Le `system_prompt` de chaque affaire contient toute la vérité et les instructions
de jeu de rôle pour les suspects.
