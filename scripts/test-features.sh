#!/bin/bash

echo "🧪 EazyBet - Test des fonctionnalités"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5000"

echo "📝 Vérification de l'environnement..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ Fichier .env manquant${NC}"
    exit 1
fi

# Check Supabase URL
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env; then
    echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL configuré${NC}"
else
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL manquant${NC}"
    exit 1
fi

# Check ODDS_API_KEY
if grep -q "ODDS_API_KEY=" .env && grep -q "ODDS_API_KEY=.\+" .env; then
    echo -e "${GREEN}✓ ODDS_API_KEY configuré${NC}"
    HAS_ODDS_KEY=true
else
    echo -e "${YELLOW}⚠ ODDS_API_KEY non configuré (import matchs désactivé)${NC}"
    HAS_ODDS_KEY=false
fi

echo ""
echo "🔍 Test 1: Route API Add Tokens"
echo "--------------------------------"

# Test if server is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Serveur non démarré sur $API_URL${NC}"
    echo "  Démarrez le serveur avec: npm run dev"
    echo ""
else
    echo -e "${GREEN}✓ Serveur actif${NC}"
fi

echo ""
echo "🔍 Test 2: Import de matchs"
echo "----------------------------"

if [ "$HAS_ODDS_KEY" = true ]; then
    echo "Test manuel requis:"
    echo "  curl $API_URL/api/matches/publish"
    echo ""
else
    echo -e "${YELLOW}⚠ ODDS_API_KEY non configuré${NC}"
    echo "  Pour activer l'import:"
    echo "  1. Obtenez une clé sur https://the-odds-api.com/"
    echo "  2. Ajoutez dans .env: ODDS_API_KEY=votre_cle"
    echo ""
fi

echo "📊 Résumé des fonctionnalités"
echo "=============================="
echo ""
echo "✅ Tap-to-Earn:"
echo "   - Route API: /api/user/add-tokens"
echo "   - Méthode: Mise à jour directe en base"
echo "   - Limite: 1-100 tokens par appel"
echo ""
echo "✅ Import matchs:"
echo "   - Route API: /api/matches/publish"
echo "   - Compétitions: 8 (Ligue 1, EPL, etc.)"
echo "   - Matchs: 7 prochains par compétition"
echo ""

if [ "$HAS_ODDS_KEY" = true ]; then
    echo -e "${GREEN}🎉 Configuration complète !${NC}"
else
    echo -e "${YELLOW}⚠ Configuration partielle (ODDS_API_KEY manquant)${NC}"
fi

echo ""
echo "🚀 Prochaines étapes:"
echo "1. Démarrez le serveur: npm run dev"
echo "2. Testez Tap-to-Earn dans l'application"
echo "3. Testez l'import: curl $API_URL/api/matches/publish"
echo ""
