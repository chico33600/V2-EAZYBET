# 📋 Instructions de Déploiement EazyBet sur Supabase

## 🎯 Objectif
Restaurer toutes les fonctionnalités de l'application EazyBet sur votre base Supabase `vxcsqmydrmcicdruojos.supabase.co`

---

## ✅ ÉTAPE 1: Déployer les Fonctions SQL sur Supabase

### 1.1 Ouvrir Supabase Dashboard
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet `vxcsqmydrmcicdruojos`
3. Dans le menu gauche, cliquez sur **SQL Editor**

### 1.2 Exécuter le Script de Déploiement
1. Ouvrez le fichier `DEPLOY_TO_SUPABASE.sql` (situé à la racine du projet)
2. Copiez **tout le contenu** du fichier
3. Collez-le dans le SQL Editor de Supabase
4. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)
5. Attendez que l'exécution soit terminée (environ 5-10 secondes)
6. Vérifiez qu'il n'y a **aucune erreur** dans la console

### 1.3 Vérifier que les Fonctions sont Créées
Dans le SQL Editor, exécutez cette requête pour vérifier :

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_leaderboard',
  'get_user_rank',
  'get_friends_leaderboard',
  'increment_leaderboard_score',
  'sync_leaderboard_score',
  'reward_referral'
);
```

**Résultat attendu** : Vous devez voir 6 fonctions listées.

---

## ✅ ÉTAPE 2: Tester les Fonctions SQL

### 2.1 Tester le Leaderboard Global
```sql
SELECT * FROM get_leaderboard(10, 0);
```

**Résultat attendu** : Liste des 10 premiers joueurs avec leur rang, username, avatar_url, et score.

### 2.2 Tester le Rang d'un Utilisateur
Remplacez `YOUR_USER_ID` par un vrai UUID d'utilisateur de votre table `profiles` :

```sql
SELECT * FROM get_user_rank('YOUR_USER_ID'::uuid);
```

**Résultat attendu** : Les détails de l'utilisateur avec son rang dans le classement.

### 2.3 Vérifier les Triggers
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_reward_referral';
```

**Résultat attendu** : Un trigger nommé `trigger_reward_referral` sur la table `referrals`.

---

## ✅ ÉTAPE 3: Vérifier les RLS Policies

Dans le SQL Editor, exécutez :

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Résultat attendu** : Vous devez voir les policies pour toutes vos tables (profiles, matches, bets, etc.).

---

## ✅ ÉTAPE 4: Rebuild et Test de l'Application

### 4.1 Nettoyer et Rebuild
Dans le terminal Bolt, exécutez :

```bash
rm -rf .next
npm run build
```

### 4.2 Démarrer le Serveur
```bash
npm start
```

Le serveur devrait démarrer sur `http://localhost:5000`

### 4.3 Tester les Fonctionnalités

#### Test 1: Page d'Accueil (Matchs)
1. Ouvrez `http://localhost:5000` dans votre navigateur
2. Connectez-vous avec un compte existant
3. **Vérifiez** : Les matchs s'affichent depuis la table `matches`

#### Test 2: Classement
1. Allez sur `/classement`
2. **Vérifiez** : Le classement affiche tous les joueurs triés par `leaderboard_score`
3. **Vérifiez** : Même les joueurs avec 0 diamant sont affichés

#### Test 3: Profil
1. Allez sur `/profil`
2. **Vérifiez** : Vos diamants et tokens s'affichent correctement
3. **Vérifiez** : Vos succès (achievements) sont listés

#### Test 4: Système de Parrainage
1. Créez un nouveau compte (ou utilisez un compte test)
2. Lors de l'inscription, utilisez un lien de parrainage : `/auth?ref=USER_ID_DU_PARRAIN`
3. **Vérifiez** : Les deux utilisateurs (parrain et filleul) reçoivent **10 💎**
4. **Vérifiez** : Une amitié bidirectionnelle est créée automatiquement
5. Dans le SQL Editor, vérifiez :

```sql
SELECT * FROM referrals WHERE rewarded = true;
SELECT * FROM friends WHERE user_id = 'USER_ID_DU_PARRAIN' OR user_id = 'USER_ID_DU_FILLEUL';
```

---

## ✅ ÉTAPE 5: Publier sur Bolt Cloud

Une fois que tout fonctionne localement :

### 5.1 Vérifier les Variables d'Environnement
Dans Bolt Cloud, allez dans **Settings → Environment Variables** et assurez-vous que ces variables sont définies :

```
NEXT_PUBLIC_SUPABASE_URL=https://vxcsqmydrmcicdruojos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Y3NxbXlkcm1jaWNkcnVvam9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTI4MjQsImV4cCI6MjA3ODA4ODgyNH0.ch3CoL6jtMjTplpbNUZRSEfavut2yIH8z5hDO8TCfaI
ODDS_API_KEY=ca99219a56903c64ec1834c6983bee5e
CLOUDINARY_URL=cloudinary://522744459329385:DdoNQUY67Ea1qrwypolo11NmgwQ@ddo7omht1
```

### 5.2 Publier
1. Cliquez sur le bouton **"Publish"** en haut à droite
2. Attendez que le déploiement soit terminé
3. Testez toutes les fonctionnalités sur l'URL de production

---

## 🔍 Dépannage

### Problème: Le classement n'affiche aucun joueur
**Solution** : Synchronisez les scores manuellement dans le SQL Editor :

```sql
UPDATE profiles
SET leaderboard_score = diamonds;
```

### Problème: Le parrainage ne donne pas les 10 diamants
**Solution** : Vérifiez que le trigger existe :

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_reward_referral';
```

Si le trigger n'existe pas, réexécutez la section "TRIGGER DE PARRAINAGE" du fichier `DEPLOY_TO_SUPABASE.sql`.

### Problème: Les matchs ne s'affichent pas
**Solution** : Vérifiez que vous avez des matchs dans la base :

```sql
SELECT COUNT(*) FROM matches;
```

Si la table est vide, ajoutez des matchs de démonstration via l'API `/api/matches/add-demo` (accessible uniquement en tant qu'admin).

### Problème: Erreur "function does not exist"
**Solution** : Réexécutez complètement le fichier `DEPLOY_TO_SUPABASE.sql` dans le SQL Editor.

---

## ✅ Checklist Finale

- [ ] Toutes les 6 fonctions SQL sont créées dans Supabase
- [ ] Le trigger `trigger_reward_referral` existe sur la table `referrals`
- [ ] Les RLS policies sont actives sur toutes les tables
- [ ] Le classement affiche tous les joueurs (même ceux avec 0 diamant)
- [ ] Le parrainage donne 10 💎 aux deux utilisateurs
- [ ] Les matchs s'affichent sur la page d'accueil
- [ ] L'application fonctionne en local (`npm start`)
- [ ] L'application est publiée sur Bolt Cloud
- [ ] Toutes les fonctionnalités sont testées en production

---

## 🎉 Félicitations !

Si tous les tests passent, votre application EazyBet est maintenant **100% fonctionnelle** avec Supabase !

### Support
Si vous rencontrez des problèmes, vérifiez :
1. Les logs dans la console du navigateur (F12)
2. Les logs dans le terminal Bolt (là où tourne `npm start`)
3. Les logs dans Supabase Dashboard → Database → Logs
