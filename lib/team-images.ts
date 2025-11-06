interface TeamData {
  strTeamBadge?: string;
  strTeamBanner?: string;
  strStadiumThumb?: string;
  strTeamJersey?: string;
}

interface TeamImages {
  badge: string | null;
  banner: string | null;
  stadium: string | null;
}

const teamCache = new Map<string, TeamImages>();

export async function fetchTeamImages(teamName: string): Promise<TeamImages> {
  const cacheKey = teamName.toLowerCase().trim();

  if (teamCache.has(cacheKey)) {
    return teamCache.get(cacheKey)!;
  }

  try {
    const encodedTeamName = encodeURIComponent(teamName);
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodedTeamName}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch team data');
    }

    const data = await response.json();

    if (!data.teams || data.teams.length === 0) {
      const fallback: TeamImages = {
        badge: null,
        banner: null,
        stadium: null,
      };
      teamCache.set(cacheKey, fallback);
      return fallback;
    }

    const team: TeamData = data.teams[0];

    const images: TeamImages = {
      badge: team.strTeamBadge || null,
      banner: team.strTeamBanner || null,
      stadium: team.strStadiumThumb || null,
    };

    teamCache.set(cacheKey, images);
    return images;
  } catch (error) {
    console.error(`Error fetching team images for ${teamName}:`, error);
    const fallback: TeamImages = {
      badge: null,
      banner: null,
      stadium: null,
    };
    teamCache.set(cacheKey, fallback);
    return fallback;
  }
}

export function clearTeamCache() {
  teamCache.clear();
}
