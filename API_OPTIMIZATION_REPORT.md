# Rapport d'optimisation des appels API TheOddsAPI

## Objectif
Réduire drastiquement les appels à TheOddsAPI tout en maintenant la réactivité et l'expérience utilisateur.

## Changements effectués

### 1. Centralisation dans sync-matches
**Tous les appels à TheOddsAPI sont désormais centralisés dans `sync-matches`**

- ✅ `resolve-bets` : N'appelle JAMAIS TheOddsAPI (vérifié)
- ✅ Frontend : N'appelle JAMAIS TheOddsAPI (vérifié)
- ✅ Seul `sync-matches` communique avec l'API externe

### 2. Optimisation des appels /odds (nouveaux matchs)

#### Avant
- **11 appels API toutes les minutes** (une par compétition)
- = **660 appels/heure** pour récupérer les matchs à venir

#### Après
- **11 appels API toutes les 30 minutes** seulement
- = **22 appels/heure** pour récupérer les matchs à venir
- **Réduction : -97% des appels /odds**

#### Implémentation
```typescript
// Vérification du dernier fetch dans system_config
const lastFetchTime = await getLastMatchesFetch();
const INTERVAL = 30 * 60 * 1000; // 30 minutes

if (now - lastFetchTime < INTERVAL) {
  console.log('⏭️ Skipping new matches fetch');
  // Ne PAS appeler l'API
} else {
  // Fetch tous les championnats
  for (const competition of COMPETITIONS) {
    await fetchOdds(competition);
  }
  // Mettre à jour le timestamp
  await updateLastMatchesFetch();
}
```

### 3. Appels /scores (résultats) - Déjà optimisés

Les appels pour récupérer les scores restent **conditionnels et intelligents** :

```typescript
// 1. Charger uniquement les matchs finished sans result
const matchesNeedingScores = await supabase
  .from('matches')
  .select('*')
  .eq('status', 'finished')
  .is('result', null);

// 2. Si aucun match → SKIP complètement
if (matchesNeedingScores.length === 0) {
  return; // Aucun appel API
}

// 3. Identifier les ligues concernées
const leagues = [...new Set(matches.map(m => m.competition))];

// 4. UN SEUL appel par ligue (pas par match)
for (const league of leagues) {
  const scores = await fetchScores(league);
  // Mettre à jour tous les matchs de cette ligue
}
```

**Résultat** : Appels /scores uniquement quand nécessaire, groupés par ligue.

### 4. Statuts des matchs basés sur le temps

Les statuts `upcoming`, `live`, `finished` sont calculés **en fonction du temps** :

```typescript
// Mise à jour automatique toutes les minutes (sans appel API)
await supabase
  .from('matches')
  .update({ status: 'live' })
  .eq('status', 'upcoming')
  .lte('match_date', now);

await supabase
  .from('matches')
  .update({ status: 'finished' })
  .in('status', ['upcoming', 'live'])
  .lt('match_date', twoHoursAgo);
```

**Aucun appel API** nécessaire pour les changements de statut.

## Architecture finale

### Flux de données

```
┌─────────────────────────────────────────────────────────┐
│                    CRON (toutes les 1 min)               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. sync-matches                                          │
│     ├─ Mise à jour statuts (temps) ✅ PAS d'API         │
│     ├─ Nouveaux matchs /odds ⚠️  Toutes les 30 min      │
│     └─ Scores /scores ✅ Seulement si nécessaire        │
│                                                           │
│  2. resolve-bets                                          │
│     └─ Distribution gains ✅ 100% base de données       │
│                                                           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES                        │
│  matches | bets | combo_bets | profiles                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                             │
│  Lit UNIQUEMENT la base ✅ Jamais d'appel TheOddsAPI    │
│  Auto-refresh toutes les 20s (cache invalidation)        │
└─────────────────────────────────────────────────────────┘
```

## Résultats

### Avant l'optimisation
- Appels /odds : **~660/heure** (11 compétitions × 60 minutes)
- Appels /scores : **Variables** selon les matchs
- Total estimé : **~700-800 appels/heure**

### Après l'optimisation
- Appels /odds : **~22/heure** (11 compétitions × 2 fois par heure)
- Appels /scores : **Inchangé** (déjà optimal, uniquement si nécessaire)
- Total estimé : **~50-100 appels/heure**

### Réduction globale : -85% à -90% des appels API

## Réactivité maintenue

### Temps de résolution d'un match
1. **Match terminé** → statut `finished` (immédiat, basé sur le temps)
2. **Récupération score** → < 1 minute (prochain cron sync-matches)
3. **Distribution gains** → < 1 minute (prochain cron resolve-bets)
4. **Affichage frontend** → < 20 secondes (prochain auto-refresh)

**Total : < 2 minutes dans le pire cas, généralement < 1 minute**

## Règles préservées

✅ Aucune modification de la logique métier
✅ Calcul des gains identique
✅ Bonus diamants identiques
✅ Classement inchangé
✅ UX identique (transitions d'onglets, animations)
✅ Paris simples et combinés fonctionnent exactement pareil

## Fichiers modifiés

1. **supabase/functions/sync-matches/index.ts**
   - Ajout du throttling pour les appels /odds (30 min)
   - Utilisation de `system_config` pour tracker le dernier fetch
   - Les appels /scores restent conditionnels (déjà optimisés)

2. **Aucun autre fichier modifié**
   - resolve-bets était déjà optimal
   - Le frontend n'appelait déjà pas l'API
   - Les migrations sont inchangées

## Configuration requise

La table `system_config` existe déjà avec la structure :
```sql
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

La clé `last_matches_fetch` sera automatiquement créée/mise à jour par sync-matches lors de la première exécution.

## Notes importantes

1. **Ajustement du throttling** : L'intervalle de 30 minutes peut être ajusté dans le code (variable `FETCH_INTERVAL_MS`)

2. **Force sync** : Un admin peut forcer une synchronisation immédiate via le panel admin

3. **Monitoring** : Les logs indiquent clairement quand les appels sont skippés :
   ```
   ⏭️ [SYNC] Skipping new matches fetch (last fetch: 15 min ago, threshold: 30 min)
   ```

4. **Compatibilité** : Aucun changement de schema, compatible avec toutes les données existantes
