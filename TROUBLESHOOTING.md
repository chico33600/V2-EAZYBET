# 🔧 Guide de Dépannage - EazyBet

## Erreur "ChunkLoadError: Loading chunk app/layout failed"

### Cause
Cette erreur se produit lorsque :
1. Le cache du navigateur contient d'anciennes versions des chunks
2. Le serveur de développement a été redémarré
3. Une nouvelle version a été déployée

### Solutions

#### Solution 1 : Vider le cache du navigateur (Recommandé)

**Chrome/Brave:**
1. Ouvrez DevTools (F12)
2. Clic droit sur le bouton Refresh
3. Sélectionnez "Empty Cache and Hard Reload"

**Firefox:**
1. Ouvrez DevTools (F12)
2. Onglet Network
3. Cliquez sur l'icône de poubelle pour vider le cache
4. Refresh (Ctrl+Shift+R)

**Safari:**
1. Menu Develop > Empty Caches
2. Refresh (Cmd+Shift+R)

#### Solution 2 : Mode Incognito/Privé
Ouvrez l'application en mode navigation privée pour tester sans cache.

#### Solution 3 : Redémarrer le serveur de développement

```bash
# Arrêter le serveur (Ctrl+C)
# Supprimer le cache Next.js
rm -rf .next

# Redémarrer
npm run dev
```

#### Solution 4 : Forcer le rechargement
```bash
# Dans le navigateur, ouvrez la console (F12)
# Tapez cette commande:
window.location.reload(true)

# Ou utilisez le raccourci clavier
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

## Autres problèmes courants

### "Missing Supabase environment variables"
**Solution:** Vérifiez que `.env` contient :
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### "Profile not found" après inscription
**Solution:** Le trigger `handle_new_user()` crée automatiquement le profil. 
Vérifiez que la migration est appliquée.

### Matchs ne s'affichent pas
**Solution:** 
1. Vérifiez que des matchs existent dans la table `matches`
2. Vérifiez le filtre de statut (upcoming/live/finished)
3. Consultez la console du navigateur pour les erreurs

### Tap-to-Earn ne met pas à jour le solde
**Solution:**
1. Vérifiez que l'utilisateur est authentifié
2. Ouvrez DevTools > Network pour voir si l'appel API `/api/user/add-tokens` réussit
3. Vérifiez les logs de la console

### Import de matchs ne fonctionne pas
**Solution:**
1. Vérifiez que `ODDS_API_KEY` est configurée dans `.env`
2. Testez manuellement : `curl https://votre-app.com/api/matches/publish`
3. Vérifiez les logs du serveur

## Commandes utiles

```bash
# Vérifier le statut de la base de données
npm run db:status

# Reconstruire complètement
rm -rf .next node_modules
npm install
npm run build

# Vérifier les types TypeScript
npm run typecheck

# Voir les logs en temps réel
npm run dev | grep -E "ERROR|WARN"
```

## Support

Si le problème persiste :
1. Vérifiez les logs du serveur
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que toutes les migrations Supabase sont appliquées
4. Redémarrez le serveur de développement

## Logs utiles

Les logs importants à vérifier :
- `[AUTH]` - Authentification
- `[ODDS-API]` - Import de matchs
- `[AUTO-RESOLVE]` - Résolution automatique
- `[ADD-TOKENS]` - Tap-to-Earn
- `[PUBLISH-MATCHES]` - Publication de matchs
