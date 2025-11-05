# Architecture Backend EazyBet

## Vue d'ensemble

Le backend d'EazyBet est conçu pour être **flexible et évolutif**, permettant une transition facile entre matchs fictifs et matchs réels provenant d'APIs sportives externes.

---

## 🗃️ Structure de la Base de Données

### Table `profiles`
Gère les informations utilisateur et leurs statistiques.

```sql
- id (uuid, primary key, références auth.users)
- username (text)
- email (text)
- tokens (integer) - Solde de jetons
- diamonds (integer) - Solde de diamants
- total_bets (integer) - Nombre total de paris placés
- won_bets (integer) - Nombre de paris gagnés
- created_at (timestamp)
- updated_at (timestamp)
```

### Table `matches`
Stocke tous les matchs (fictifs ou réels).

```sql
- id (uuid, primary key)
- team_a (text) - Nom équipe domicile
- team_b (text) - Nom équipe extérieur
- league (text) - Nom de la compétition
- odds_a (decimal) - Cote victoire équipe A
- odds_draw (decimal) - Cote match nul
- odds_b (decimal) - Cote victoire équipe B
- status (text) - 'upcoming', 'live', 'finished'
- result (text) - 'A', 'Draw', 'B' (null si pas terminé)
- match_date (timestamp) - Date du match
- match_mode (text) - 'fictif' ou 'real' ⭐ NOUVEAU
- external_api_id (text) - ID du match dans l'API externe ⭐ NOUVEAU
- api_provider (text) - Nom du fournisseur API (ex: 'api-football') ⭐ NOUVEAU
- created_at (timestamp)
```

**Index optimisés :**
- `idx_matches_mode_status` sur (match_mode, status) - Requêtes rapides par mode et statut
- Index par défaut sur status et match_date

### Table `bets`
Enregistre tous les paris des utilisateurs.

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → profiles)
- match_id (uuid, foreign key → matches)
- amount (integer) - Montant misé en jetons
- choice (text) - 'A', 'Draw', 'B'
- odds (decimal) - Cote au moment du pari
- potential_win (integer) - Gain total potentiel (montant × cote)
- potential_diamonds (integer) - Diamants potentiels (1% du profit)
- is_win (boolean) - null (en attente), true (gagné), false (perdu)
- tokens_won (integer) - Jetons réellement gagnés après résolution
- diamonds_won (integer) - Diamants réellement gagnés après résolution
- created_at (timestamp)
- updated_at (timestamp)
```

**Index optimisés :**
- `idx_bets_user_status` sur (user_id, is_win) - Requêtes rapides des paris par utilisateur et statut

---

## 🔄 Système de Modes (Fictif vs Réel)

### Mode Fictif (Actuel)
Les matchs sont générés manuellement ou via un seed script.

**Caractéristiques :**
- `match_mode = 'fictif'`
- `external_api_id = null`
- `api_provider = null`
- Résultats simulés manuellement (page admin ou script)

### Mode Réel (Future)
Les matchs proviennent d'une API sportive externe.

**Caractéristiques :**
- `match_mode = 'real'`
- `external_api_id` contient l'ID du match dans l'API
- `api_provider` indique le fournisseur (ex: 'api-football', 'sportradar')
- Résultats synchronisés automatiquement avec l'API

### Configuration Future (Variable d'environnement)

```env
# Mode de fonctionnement des paris
BET_MODE=fictif  # ou 'real'

# Configuration API sportive (pour mode real)
SPORTS_API_PROVIDER=api-football
SPORTS_API_KEY=your_api_key_here
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
```

---

## 📋 Flux Backend Complet

### 1. Placement d'un Pari

**Fichier :** `lib/api-client.ts::placeBet()`

```typescript
Étape 1: Validation
├─ Vérifier montant minimum (10 jetons)
├─ Vérifier que le match existe
├─ Vérifier status = 'upcoming'
└─ Vérifier solde utilisateur suffisant

Étape 2: Calculs
├─ totalWin = amount × odds
├─ profit = totalWin - amount
└─ diamandsFromProfit = profit × 0.01

Étape 3: Déduction immédiate
├─ profiles.tokens -= amount
└─ profiles.total_bets += 1

Étape 4: Enregistrement du pari
└─ Insérer dans bets avec is_win = null

Étape 5: Notification frontend
└─ Dispatch event 'bet-placed'
```

**Transition fluide :**
- ✅ Match retiré de "À venir" (filtré par status)
- ✅ Pari ajouté à "Joués" instantanément (via event listener)
- ✅ Badge notification (1) affiché
- ✅ Aucun rechargement de page

### 2. Affichage des Paris

**Fichier :** `lib/api-client.ts::getUserBets()`

```typescript
Paramètres :
├─ status = 'active' → Récupère paris en attente (is_win = null)
└─ status = 'history' → Récupère paris terminés (is_win != null)

Retour :
└─ Array de paris avec join sur matches (team_a, team_b, league, etc.)
```

**Composants d'affichage :**
- `components/active-bet-card.tsx` - Affiche les paris en cours
- `components/finished-bet-card.tsx` - Affiche les paris terminés (gagné/perdu)

### 3. Résolution des Matchs

**Fichier :** `lib/bet-resolution.ts::resolveMatchBets()`

```typescript
Étape 1: Récupérer tous les paris pour ce match (is_win = null)

Étape 2: Pour chaque pari
├─ Si gagné (choice === result):
│  ├─ profiles.tokens += potential_win
│  ├─ profiles.diamonds += potential_diamonds
│  ├─ profiles.won_bets += 1
│  └─ bets: is_win = true, tokens_won, diamonds_won
│
└─ Si perdu:
   └─ bets: is_win = false, tokens_won = 0, diamonds_won = 0

Étape 3: Mettre à jour le match
├─ status = 'finished'
└─ result = 'A'|'Draw'|'B'
```

**API Endpoint :** `POST /api/matches/resolve`

```json
// Résolution manuelle
{
  "matchId": "uuid-du-match",
  "result": "A" | "Draw" | "B"
}

// Résolution simulée (aléatoire basée sur cotes)
{
  "matchId": "uuid-du-match",
  "simulate": true
}
```

---

## 🚀 Adaptabilité Future : Passage aux Vrais Matchs

### Étape 1 : Configuration

Ajouter les variables d'environnement :
```env
BET_MODE=real
SPORTS_API_PROVIDER=api-football
SPORTS_API_KEY=your_key
SPORTS_API_BASE_URL=https://v3.football.api-sports.io
```

### Étape 2 : Service d'Intégration API

Créer `lib/sports-api-service.ts` :

```typescript
export async function fetchRealMatches() {
  const response = await fetch(
    `${process.env.SPORTS_API_BASE_URL}/fixtures?...`,
    {
      headers: {
        'x-apisports-key': process.env.SPORTS_API_KEY
      }
    }
  );

  const data = await response.json();

  // Transformer les données API en format EazyBet
  return data.response.map(match => ({
    team_a: match.teams.home.name,
    team_b: match.teams.away.name,
    league: match.league.name,
    odds_a: match.odds?.home || 2.0,
    odds_draw: match.odds?.draw || 3.0,
    odds_b: match.odds?.away || 2.5,
    match_date: match.fixture.date,
    match_mode: 'real',
    external_api_id: match.fixture.id.toString(),
    api_provider: 'api-football',
    status: 'upcoming'
  }));
}

export async function syncMatchResult(externalId: string) {
  const response = await fetch(
    `${process.env.SPORTS_API_BASE_URL}/fixtures?id=${externalId}`,
    {
      headers: {
        'x-apisports-key': process.env.SPORTS_API_KEY
      }
    }
  );

  const match = await response.json();
  const scores = match.response[0].goals;

  // Déterminer le résultat
  let result: 'A' | 'Draw' | 'B';
  if (scores.home > scores.away) result = 'A';
  else if (scores.home < scores.away) result = 'B';
  else result = 'Draw';

  return result;
}
```

### Étape 3 : Synchronisation Automatique

Créer un edge function Supabase ou un cron job :

```typescript
// supabase/functions/sync-matches/index.ts
import { createClient } from '@supabase/supabase-js';
import { syncMatchResult, fetchRealMatches } from './sports-api-service';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Récupérer les matchs en mode real qui sont terminés
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('match_mode', 'real')
    .eq('status', 'finished')
    .is('result', null);

  for (const match of matches || []) {
    const result = await syncMatchResult(match.external_api_id);

    // Résoudre automatiquement le match
    await fetch('/api/matches/resolve', {
      method: 'POST',
      body: JSON.stringify({
        matchId: match.id,
        result
      })
    });
  }

  return new Response('Sync complete');
});
```

### Étape 4 : Adaptation de `fetchMatches()`

```typescript
export async function fetchMatches(status?: string) {
  const betMode = process.env.NEXT_PUBLIC_BET_MODE || 'fictif';

  if (betMode === 'real') {
    // En mode real, récupérer depuis l'API sportive
    const realMatches = await fetchRealMatches();

    // Synchroniser avec la base de données
    for (const match of realMatches) {
      await supabase.from('matches').upsert(match, {
        onConflict: 'external_api_id'
      });
    }
  }

  // Récupérer depuis la base (fonctionne pour les deux modes)
  let query = supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;
  return data || [];
}
```

---

## 🎯 Points Clés de l'Architecture

### ✅ Ce qui est prêt maintenant

1. **Structure de données complète** - Tables optimisées avec indexes
2. **Logique des paris** - Placement, calcul, résolution
3. **Interface utilisateur réactive** - Transitions fluides, badges, événements
4. **Système de notification** - Badge (1) sur "Joués" après pari
5. **Affichage temps réel** - Paris visibles immédiatement dans "Joués"
6. **Composants réutilisables** - ActiveBetCard, FinishedBetCard

### 🔮 Ce qui facilite la transition future

1. **Colonne `match_mode`** - Distingue fictif vs réel
2. **Colonnes API** - `external_api_id`, `api_provider`
3. **Architecture modulaire** - Séparation claire des responsabilités
4. **Configuration centralisée** - Variables d'environnement
5. **Code agnostique** - Les fonctions marchent pour les deux modes

---

## 🛠️ Fichiers Clés

```
Backend Logic:
├─ lib/api-client.ts - API client & fonctions principales
├─ lib/bet-resolution.ts - Logique de résolution des matchs
├─ lib/supabase-client.ts - Client Supabase & types
└─ lib/store.ts - État global (Zustand)

API Routes:
├─ app/api/matches/route.ts - GET matchs
├─ app/api/matches/resolve/route.ts - POST résolution
├─ app/api/bets/place/route.ts - POST placement pari
└─ app/api/user/profile/route.ts - GET profil utilisateur

Components:
├─ components/bet-slip.tsx - Interface de pari
├─ components/active-bet-card.tsx - Carte pari en cours
├─ components/finished-bet-card.tsx - Carte pari terminé
└─ components/tabs-matchs.tsx - Onglets avec badges

Database:
└─ supabase/migrations/ - Migrations SQL
```

---

## 📊 Flux de Données Complet

```
┌─────────────────┐
│  Utilisateur    │
└────────┬────────┘
         │
         │ 1. Place un pari
         ▼
┌─────────────────────────────┐
│   components/bet-slip.tsx    │
│  - Validation montant        │
│  - Calcul gains potentiels   │
└────────┬────────────────────┘
         │
         │ 2. API Call
         ▼
┌─────────────────────────────┐
│  lib/api-client.ts          │
│  placeBet()                  │
│  - Déduction jetons          │
│  - Enregistre pari (is_win=null) │
│  - Dispatch 'bet-placed'     │
└────────┬────────────────────┘
         │
         │ 3. Stockage
         ▼
┌─────────────────────────────┐
│  Supabase Database          │
│  tables: bets, profiles      │
└────────┬────────────────────┘
         │
         │ 4. Event listener
         ▼
┌─────────────────────────────┐
│  app/page.tsx               │
│  - Recharge paris actifs     │
│  - Active badge notification │
│  - Affiche dans "Joués"      │
└────────┬────────────────────┘
         │
         │ 5. Affichage
         ▼
┌─────────────────────────────┐
│  ActiveBetCard.tsx          │
│  - Match info                │
│  - Gains potentiels          │
│  - Status "En attente"       │
└─────────────────────────────┘

... Match terminé ...

         │ 6. Admin résout
         ▼
┌─────────────────────────────┐
│  app/admin/page.tsx         │
│  - Choisit résultat          │
│  - POST /api/matches/resolve │
└────────┬────────────────────┘
         │
         │ 7. Résolution
         ▼
┌─────────────────────────────┐
│  bet-resolution.ts          │
│  - Calcule gains             │
│  - Met à jour profiles       │
│  - Met à jour bets (is_win)  │
└────────┬────────────────────┘
         │
         │ 8. Affiche résultat
         ▼
┌─────────────────────────────┐
│  FinishedBetCard.tsx        │
│  - Badge gagné/perdu         │
│  - Gains réels               │
│  - Résultat du match         │
└─────────────────────────────┘
```

---

## 🎮 Commandes Admin

### Page Admin (`/admin`)
- Résolution manuelle des matchs
- Simulation de résultats aléatoires
- Visualisation historique

### API Direct
```bash
# Résoudre un match manuellement
curl -X POST /api/matches/resolve \
  -H "Content-Type: application/json" \
  -d '{"matchId": "uuid", "result": "A"}'

# Simuler un résultat
curl -X POST /api/matches/resolve \
  -H "Content-Type: application/json" \
  -d '{"matchId": "uuid", "simulate": true}'
```

---

## 🔐 Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Validation des montants de paris
- ✅ Vérification du statut des matchs
- ✅ Rollback automatique en cas d'erreur
- ✅ Pas de modification possible après placement du pari
- ✅ Authentification requise pour toutes les actions

---

## 📈 Performance

- **Index optimisés** pour requêtes rapides
- **Chargement sélectif** par onglet (pas tout en même temps)
- **Événements custom** pour mises à jour ciblées
- **Pas de polling** - événements uniquement
- **Requêtes efficaces** avec joins Supabase

---

## ✨ Résumé

Le backend d'EazyBet est **100% fonctionnel** avec des matchs fictifs et **prêt pour l'intégration** d'APIs sportives réelles. La transition nécessitera uniquement :

1. Ajout des variables d'environnement
2. Création du service d'intégration API
3. Mise en place d'un système de synchronisation
4. Modification mineure de `fetchMatches()`

**Aucune modification de la structure de données ou de la logique de paris ne sera nécessaire.**
