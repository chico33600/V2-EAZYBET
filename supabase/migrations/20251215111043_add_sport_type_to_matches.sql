/*
  # Ajouter le type de sport aux matchs
  
  1. Changements
    - Ajoute une colonne `sport_type` à la table `matches`
    - Valeurs possibles: 'soccer', 'nba', 'nfl', 'mma'
    - Par défaut: 'soccer' (football)
  
  2. Fonctionnement
    - Permet de catégoriser les matchs par sport
    - Facilite le filtrage par type de sport
    - Support multi-sports pour l'application
*/

-- Ajouter la colonne sport_type
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS sport_type text DEFAULT 'soccer' 
CHECK (sport_type IN ('soccer', 'nba', 'nfl', 'mma'));

-- Mettre à jour tous les matchs existants pour être du football
UPDATE matches 
SET sport_type = 'soccer' 
WHERE sport_type IS NULL;

-- Ajouter un index pour optimiser les requêtes par sport
CREATE INDEX IF NOT EXISTS idx_matches_sport_type ON matches(sport_type);

-- Ajouter un index composite pour sport_type + status (pour les requêtes fréquentes)
CREATE INDEX IF NOT EXISTS idx_matches_sport_status ON matches(sport_type, status);

COMMENT ON COLUMN matches.sport_type IS 'Type de sport: soccer (football), nba (basket), nfl (football américain), mma';
