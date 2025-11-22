#!/bin/bash

echo "🔧 EazyBet - Script de réparation du cache"
echo "=========================================="
echo ""

# Arrêter le serveur de développement si en cours
echo "1. Arrêt du serveur (si actif)..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Supprimer le cache Next.js
echo "2. Suppression du cache Next.js..."
rm -rf .next
rm -rf node_modules/.cache
echo "   ✓ Cache supprimé"

# Supprimer le cache npm
echo "3. Nettoyage du cache npm..."
npm cache clean --force 2>/dev/null || true
echo "   ✓ Cache npm nettoyé"

# Recréer le dossier .next
echo "4. Reconstruction du build..."
npm run build > /dev/null 2>&1
echo "   ✓ Build reconstruit"

echo ""
echo "✅ Réparation terminée !"
echo ""
echo "Prochaines étapes :"
echo "1. Videz le cache de votre navigateur (Ctrl+Shift+R ou Cmd+Shift+R)"
echo "2. Ou utilisez le mode navigation privée"
echo "3. Redémarrez le serveur : npm run dev"
echo ""
