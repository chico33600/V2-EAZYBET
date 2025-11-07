# 🚀 EazyBet - Déploiement Supabase Complet

## ✅ État Actuel du Projet

### Configuration
- ✅ Base de données : `vxcsqmydrmcicdruojos.supabase.co`
- ✅ Client Supabase configuré dans `lib/supabase-client.ts`
- ✅ Toutes les API routes utilisent Supabase
- ✅ Authentification via Supabase Auth
- ✅ Build réussi (28 pages, 24 API routes)

### Tables Existantes
Toutes ces tables existent dans votre base Supabase :
- ✅ `profiles` (utilisateurs)
- ✅ `matches` (matchs)
- ✅ `bets` (paris simples)
- ✅ `combo_bets` (paris combinés)
- ✅ `combo_bet_selections` (sélections des combos)
- ✅ `referrals` (parrainages)
- ✅ `friends` (amis)
- ✅ `achievements` (succès)
- ✅ `user_achievements` (succès des utilisateurs)
- ✅ `tap_earnings` (gains par tap)
- ✅ `team_images_cache` (cache des images)

---

## 🎯 Action Requise : Déployer les Fonctions SQL

### ⚠️ IMPORTANT
Les **fonctions SQL** et **triggers** doivent être déployés manuellement sur Supabase pour que l'application fonctionne à 100%.

### 📝 Marche à Suivre

#### 1️⃣ Ouvrir Supabase Dashboard
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **vxcsqmydrmcicdruojos**
3. Cliquez sur **SQL Editor** dans le menu gauche

#### 2️⃣ Exécuter le Script SQL
1. Ouvrez le fichier **`DEPLOY_TO_SUPABASE.sql`** (à la racine du projet)
2. **Copiez tout le contenu** (Ctrl+A puis Ctrl+C)
3. **Collez** dans le SQL Editor de Supabase
4. Cliquez sur **"Run"** (ou Ctrl+Enter)
5. Attendez que l'exécution se termine (5-10 secondes)
6. **Vérifiez qu'il n'y a aucune erreur**

#### 3️⃣ Vérifier le Déploiement
Dans le SQL Editor, exécutez cette requête :

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_leaderboard',
  'get_user_rank',
  'get_friends_leaderboard',
  'reward_referral'
);
```

**Résultat attendu** : 4 fonctions minimum listées.

---

## 📚 Documentation Disponible

Le projet contient 3 documents importants :

### 1. `DEPLOY_TO_SUPABASE.sql`
**Script SQL consolidé** contenant :
- Toutes les fonctions SQL (leaderboard, parrainage, etc.)
- Tous les triggers nécessaires
- Toutes les RLS policies de sécurité
- Les indexes pour la performance

**À exécuter dans Supabase SQL Editor**

### 2. `INSTRUCTIONS_DEPLOYMENT.md`
**Guide détaillé étape par étape** avec :
- Instructions complètes de déploiement
- Tests à effectuer pour chaque fonctionnalité
- Section de dépannage pour les problèmes courants
- Checklist finale

### 3. `README_DEPLOYMENT.md` (ce fichier)
**Vue d'ensemble** du déploiement et de l'état actuel

---

## 🧪 Fonctionnalités à Tester

Une fois le script SQL déployé, testez ces fonctionnalités :

### ✅ Page d'Accueil (`/`)
- [ ] Les matchs s'affichent depuis la base Supabase
- [ ] Les onglets "À venir", "En cours", "Terminés" fonctionnent
- [ ] Vous pouvez placer des paris

### ✅ Classement (`/classement`)
- [ ] Le leaderboard affiche tous les joueurs
- [ ] Les joueurs sont triés par `leaderboard_score`
- [ ] Même les joueurs avec 0 diamant apparaissent
- [ ] Votre rang s'affiche correctement

### ✅ Profil (`/profil`)
- [ ] Vos diamants et tokens s'affichent
- [ ] Vos statistiques de paris sont correctes
- [ ] Vos succès (achievements) sont listés
- [ ] Le lien de parrainage est généré

### ✅ Système de Parrainage
- [ ] Un nouveau compte créé via `/auth?ref=USER_ID` reçoit 10 💎
- [ ] Le parrain reçoit aussi 10 💎
- [ ] Une amitié bidirectionnelle est créée automatiquement
- [ ] Le classement se met à jour instantanément

---

## 🔧 Variables d'Environnement

### Fichier `.env` (Local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://vxcsqmydrmcicdruojos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ODDS_API_KEY=ca99219a56903c64ec1834c6983bee5e
CLOUDINARY_URL=cloudinary://522744459329385:DdoNQUY67Ea1qrwypolo11NmgwQ@ddo7omht1
```

### Bolt Cloud (Production)
Dans **Settings → Environment Variables**, ajoutez les mêmes variables.

---

## 🚀 Commandes Utiles

### Développement Local
```bash
# Nettoyer et rebuild
rm -rf .next
npm run build

# Démarrer le serveur
npm start
```

Le serveur démarre sur http://localhost:5000

### Tests Manuels
```bash
# Tester l'API leaderboard
curl http://localhost:5000/api/leaderboard?limit=10

# Tester l'API matches
curl http://localhost:5000/api/matches?status=upcoming
```

---

## 📊 Architecture Technique

### Frontend
- **Framework** : Next.js 13.5.1
- **UI** : shadcn/ui + Tailwind CSS
- **État** : Zustand + React Context
- **Auth** : Supabase Auth (email/password)

### Backend
- **BDD** : PostgreSQL (Supabase)
- **API** : Next.js API Routes
- **Auth** : Supabase Auth
- **Storage** : Cloudinary (images)

### Sécurité
- **RLS** : Activé sur toutes les tables
- **Policies** : Lecture publique pour leaderboard, écriture restreinte
- **Auth** : JWT tokens via Supabase
- **Validation** : Côté client et serveur

---

## 🆘 Support & Dépannage

### Problème : Le classement est vide
**Cause** : Les scores du leaderboard ne sont pas synchronisés avec les diamants

**Solution** :
```sql
UPDATE profiles SET leaderboard_score = diamonds;
```

### Problème : Le parrainage ne fonctionne pas
**Cause** : Le trigger n'est pas créé

**Solution** : Réexécutez la section "TRIGGER DE PARRAINAGE" du fichier `DEPLOY_TO_SUPABASE.sql`

### Problème : "function get_leaderboard does not exist"
**Cause** : Les fonctions SQL n'ont pas été déployées

**Solution** : Exécutez le fichier `DEPLOY_TO_SUPABASE.sql` complet dans Supabase SQL Editor

### Problème : Les matchs ne s'affichent pas
**Cause** : La table `matches` est vide

**Solution** : En tant qu'admin, utilisez l'API `/api/matches/add-demo` pour ajouter des matchs de test

---

## ✅ Checklist de Déploiement

- [ ] 1. Le script `DEPLOY_TO_SUPABASE.sql` a été exécuté dans Supabase SQL Editor
- [ ] 2. Aucune erreur n'est apparue lors de l'exécution
- [ ] 3. Les 6 fonctions SQL existent (vérifiées via requête)
- [ ] 4. Le trigger `trigger_reward_referral` existe
- [ ] 5. Les RLS policies sont actives sur toutes les tables
- [ ] 6. L'application build sans erreur (`npm run build`)
- [ ] 7. Le serveur démarre correctement (`npm start`)
- [ ] 8. Le classement affiche tous les joueurs
- [ ] 9. Les matchs s'affichent sur la page d'accueil
- [ ] 10. Le parrainage donne 10 💎 aux deux utilisateurs
- [ ] 11. L'application est publiée sur Bolt Cloud
- [ ] 12. Tous les tests passent en production

---

## 🎉 Prochaines Étapes

Une fois le déploiement terminé :

1. **Tester toutes les fonctionnalités** en local
2. **Publier sur Bolt Cloud** avec le bouton "Publish"
3. **Tester en production** sur l'URL Bolt
4. **Ajouter des matchs réels** via l'API `/api/matches/sync-real`
5. **Inviter des utilisateurs** avec votre lien de parrainage

---

## 📞 Contact

Pour toute question ou problème, consultez :
- `INSTRUCTIONS_DEPLOYMENT.md` pour le guide détaillé
- Les logs Supabase : Dashboard → Database → Logs
- Les logs de l'application : Console du navigateur (F12)

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-11-07
**Base Supabase** : vxcsqmydrmcicdruojos.supabase.co
