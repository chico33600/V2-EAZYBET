# Guide de Débogage - Synchronisation The Odds API

## Statut de la Correction

La synchronisation avec The Odds API a été complètement réactivée et améliorée avec des logs détaillés.

## Tests à Effectuer

### 1. Test de Connexion API

Allez sur la page `/admin` et cliquez sur le bouton **"Test API"**.

Cela va tester la connexion à The Odds API et vous montrer :
- Le statut HTTP de la réponse
- Le nombre de matchs disponibles
- Les détails de la réponse dans la console

### 2. Synchronisation Manuelle

Sur la page `/admin`, cliquez sur le bouton **"Sync API"**.

Cela va :
1. Se connecter à The Odds API
2. Récupérer les matchs de 8 compétitions différentes
3. Insérer/mettre à jour les matchs dans Supabase
4. Afficher les statistiques de synchronisation

### 3. Vérification des Matchs

Retournez sur la page d'accueil (Home) et vérifiez l'onglet **"À venir"**.

Les matchs devraient maintenant apparaître, groupés par compétition.

## Logs à Vérifier

Ouvrez la console du navigateur (F12) et recherchez :

### Lors du Test API
```
[Admin] Test API Response: { success: true, status: 200, itemCount: X }
```

### Lors de la Synchronisation
```
🔄 [SYNC] Starting match synchronization...
✅ [SYNC] API key found: ca99219a...
🏆 [SYNC] Fetching Ligue 1...
📡 [SYNC] API URL: https://api.the-odds-api.com/v4/sports/...
📊 [SYNC] Ligue 1 response status: 200
✅ [SYNC] Ligue 1: X matches found
⚽ [SYNC] Processing: Team A vs Team B
✅ [SYNC] Inserted: Team A vs Team B
🎉 [SYNC] ========== SYNC COMPLETE ==========
```

## Compétitions Synchronisées

Le système synchronise automatiquement les matchs de ces compétitions :
- 🇫🇷 Ligue 1
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
- 🇪🇸 La Liga
- 🇮🇹 Serie A
- 🇩🇪 Bundesliga
- ⭐ Champions League
- 🏆 Europa League
- 🥉 Europa Conference League

## Filtres Appliqués

Les matchs sont filtrés selon ces critères :
- Date de début : entre maintenant et dans 7 jours
- Statut : uniquement les matchs "upcoming"
- Mode : uniquement les matchs "real" (pas fictifs)

## En Cas de Problème

### Aucun match n'apparaît

1. Vérifiez que la clé API est valide :
   - Ouvrez `.env`
   - Vérifiez `ODDS_API_KEY=ca99219a56903c64ec1834c6983bee5e`

2. Testez la connexion API avec le bouton "Test API"

3. Vérifiez les logs dans la console

4. Vérifiez que vous avez le rôle admin :
   - Ouvrez la console
   - Cherchez `[AdminPage] User role: admin`

### Messages d'Erreur Possibles

**"ODDS_API_KEY not configured"**
- La clé API n'est pas définie dans `.env`

**"Status 401 Unauthorized"**
- La clé API est invalide ou expirée

**"Status 429 Too Many Requests"**
- Limite de requêtes API atteinte (500 requêtes/mois avec le plan gratuit)

**"0 matches found"**
- Aucun match disponible dans la période de 7 jours
- Vérifiez avec le bouton "Test API" pour voir la réponse brute

## API Odds Information

- Documentation : https://the-odds-api.com/
- Plan Gratuit : 500 requêtes/mois
- Chaque synchronisation compte pour 8 requêtes (1 par compétition)

## Événements Temps Réel

La page Home écoute l'événement `matches-synced` et recharge automatiquement les matchs après chaque synchronisation depuis le panel admin.
