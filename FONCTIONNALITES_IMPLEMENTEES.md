# Fonctionnalités Implémentées - EazyBet

## Résumé

Le backend de EazyBet a été entièrement reconstruit avec Next.js 14 et Supabase. Toutes les fonctionnalités sont maintenant opérationnelles et automatiques.

## 1. Tap-to-Earn (Ajout automatique de tokens)

### Route API
`POST /api/user/add-tokens`

### Fonctionnement
- Ajoute des tokens directement dans la base de données
- Validation : montant entre 1 et 100 tokens
- Mise à jour atomique pour éviter les conflits
- Authentification requise

### Test
```bash
curl -X POST http://localhost:5000/api/user/add-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 50}'
```

### Réponse attendue
```json
{
  "success": true,
  "message": "Successfully added 50 tokens",
  "tokens": 1050,
  "diamonds": 0,
  "added": 50
}
```

## 2. Import de Matchs Réels

### Route API
`GET /api/matches/publish`

### Fonctionnement
- Importe 7 matchs pour chaque compétition
- 8 compétitions supportées :
  - Ligue 1
  - Premier League
  - Bundesliga
  - Serie A
  - La Liga
  - Champions League
  - Europa League
  - Conference League
- Évite les doublons via `external_api_id`
- Cotes en temps réel de The Odds API

### Configuration requise
Ajoutez votre clé API dans `.env` :
```
ODDS_API_KEY=votre_cle_api
```

Obtenir une clé : https://the-odds-api.com/

### Test
```bash
curl http://localhost:5000/api/matches/publish
```

### Réponse attendue
```json
{
  "success": true,
  "summary": {
    "total_imported": 56,
    "total_skipped": 0,
    "total_errors": 0
  },
  "results": [...]
}
```

## 3. Système de Pari

### Route API
`POST /api/bets/place`

### Fonctionnalités
- Paris simples et combos
- Deux devises : tokens ou diamonds
- Calcul automatique des gains potentiels
- Vérification du solde
- Rollback automatique en cas d'erreur

### Test
```bash
curl -X POST http://localhost:5000/api/bets/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "match_id": "uuid-du-match",
    "amount": 100,
    "choice": "A",
    "currency": "tokens"
  }'
```

## 4. Résolution Automatique des Matchs

### Edge Function
`supabase/functions/auto-resolve-matches`

### Fonctionnement
- Détecte les matchs terminés
- Calcule les résultats
- Distribue les gains automatiquement
- Met à jour le classement

### Déploiement
La fonction est déployée automatiquement sur Supabase.

### Test manuel
```bash
curl http://localhost:5000/api/matches/auto-resolve
```

## 5. Classement (Leaderboard)

### Route API
`GET /api/leaderboard`

### Fonctionnement
- Top 100 joueurs
- Calcul basé sur `leaderboard_score`
- Mise à jour automatique après chaque pari gagné

### Test
```bash
curl http://localhost:5000/api/leaderboard
```

## 6. Système de Parrainage

### Route API
`POST /api/referrals`

### Fonctionnalités
- Lien de parrainage : `?ref=USER_ID`
- 100 diamonds pour le parrain
- Création automatique de l'amitié
- Trigger automatique lors de l'inscription

### Test
1. Créer un utilisateur avec `?ref=USER_ID`
2. Vérifier que le parrain a reçu 100 diamonds
3. Vérifier que l'amitié a été créée

## 7. Système d'Amis

### Route API
`GET /api/friends`

### Fonctionnalités
- Liste des amis
- Ajout automatique via parrainage
- Affichage des statistiques

## 8. Tutorial Tracking

### Fonctionnalités
- Suivi de l'état du tutorial
- Affichage une seule fois par utilisateur
- Mise à jour via `/api/user/complete-tutorial`

## Architecture Backend

### Clients Supabase
- **Browser** (`lib/supabase/browser.ts`) : Client-side avec auth persistante
- **Server** (`lib/supabase/server.ts`) : Server-side pour les API routes
- **Admin** (`lib/supabase/admin.ts`) : Service role pour opérations admin

### Base de Données
9 tables avec RLS activé :
- `profiles` : Profils utilisateurs
- `matches` : Matchs (fictifs et réels)
- `bets` : Paris simples
- `combo_bets` : Paris combinés
- `combo_bet_selections` : Sélections des combos
- `friends` : Relations d'amitié
- `referrals` : Parrainages
- `tap_earnings` : Historique des gains tap
- `team_images_cache` : Cache des images d'équipes

### Sécurité
- Row Level Security (RLS) sur toutes les tables
- Authentification JWT
- Validation des entrées
- Opérations atomiques

## Tests Complets

### 1. Démarrer le serveur
```bash
npm run dev
```

### 2. Exécuter le script de test
```bash
./scripts/test-features.sh
```

### 3. Tester manuellement

#### Tap-to-Earn
1. Se connecter à l'application
2. Cliquer sur le bouton Tap-to-Earn
3. Vérifier que les tokens augmentent

#### Import de matchs
1. Configurer `ODDS_API_KEY` dans `.env`
2. Appeler `/api/matches/publish`
3. Vérifier dans l'UI que les matchs apparaissent

#### Paris
1. Sélectionner un match
2. Placer un pari
3. Vérifier que le solde diminue
4. Vérifier que le pari apparaît dans "Mes Paris"

## Dépannage

### Tokens non ajoutés
- Vérifier l'authentification (token JWT valide)
- Vérifier les logs : `[ADD-TOKENS]`
- Vérifier le solde dans la base de données

### Matchs non importés
- Vérifier `ODDS_API_KEY` dans `.env`
- Vérifier les logs : `[ODDS-API]`
- Vérifier les quotas API sur The Odds API

### Erreur de build
```bash
rm -rf .next
npm run build
```

## Documentation Complète

- **Architecture Backend** : `BACKEND_ARCHITECTURE.md`
- **Système de Paris** : `BETTING_SYSTEM.md`
- **API Documentation** : `API_DOCUMENTATION.md`
- **Déploiement** : `README_DEPLOYMENT.md`
- **Troubleshooting** : `TROUBLESHOOTING.md`

## Statut

✅ Base de données complètement reconstruite
✅ Clients Supabase modulaires
✅ Tap-to-Earn fonctionnel
✅ Import de matchs réels
✅ Système de paris complet
✅ Résolution automatique
✅ Classement
✅ Système de parrainage
✅ Système d'amis
✅ Tutorial tracking
✅ Build réussi

Toutes les fonctionnalités sont maintenant opérationnelles et testées.
