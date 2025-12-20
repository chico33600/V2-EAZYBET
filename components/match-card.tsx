'use client';

import { Match } from '@/lib/mock-data';
import { useBetStore, BetType } from '@/lib/store';
import { TEAM_BACKGROUNDS } from '@/lib/team-backgrounds';
import { MatchCountdown } from './match-countdown';

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const isFinished = match.status === 'finished' || match.status === 'played';
  const { selections, toggleSelection } = useBetStore();

  const handleOddsClick = (betType: BetType, odds: number) => {
    console.log('[MatchCard] Odds clicked:', { matchId: match.id, betType, odds, currentSelections: selections.length });
    toggleSelection({ match, betType, odds });
    console.log('[MatchCard] After toggle:', { selectionsCount: selections.length });
  };

  const isSelected = (betType: BetType) => {
    const selected = selections.some(s => s.match.id === match.id && s.betType === betType);
    return selected;
  };

  const normalizeTeamName = (name: string) => {
    if (!name) return "";
    const normalized = name.trim().toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // 🇫🇷 Ligue 1
    if (normalized.includes("marseille")) return "Olympique de Marseille";
    if (normalized.includes("lyon")) return "Olympique Lyonnais";
    if (normalized.includes("lille")) return "LOSC Lille";
    if (normalized.includes("nice")) return "OGC Nice";
    if (normalized.includes("nantes")) return "FC Nantes";
    if (normalized.includes("rennes")) return "Stade Rennais";
    if (normalized.includes("monaco")) return "AS Monaco";
    if (normalized.includes("strasbourg")) return "RC Strasbourg";
    if (normalized.includes("toulouse")) return "Toulouse FC";
    if (normalized.includes("lens")) return "RC Lens";
    if (normalized.includes("paris") && normalized.includes("fc")) return "Paris FC";
    if (normalized.includes("paris") || normalized.includes("psg")) return "Paris Saint-Germain";

    // 🇪🇸 Liga
    if (normalized.includes("barcelone") || normalized.includes("barcelona")) return "FC Barcelone";
    if (normalized.includes("atletico") && normalized.includes("madrid")) return "Atletico Madrid";
    if (normalized.includes("atletico") && normalized.includes("bilbao")) return "Atletico Bilbao";
    if (normalized.includes("madrid") && normalized.includes("real")) return "Real Madrid";
    if (normalized.includes("bilbao")) return "Atletico Bilbao";
    if (normalized.includes("betis")) return "Real Betis";
    if (normalized.includes("sociedad")) return "Real Sociedad";
    if (normalized.includes("seville") || normalized.includes("sevilla")) return "FC Seville";
    if (normalized.includes("celta")) return "Celta Vigo";
    if (normalized.includes("alaves")) return "Deportivo Alaves";
    if (normalized.includes("espanyol")) return "Espanyol Barcelone";
    if (normalized.includes("getafe")) return "Getafe";
    if (normalized.includes("girona")) return "Girona";
    if (normalized.includes("valence") || normalized.includes("valencia")) return "Valencia";
    if (normalized.includes("villarreal")) return "Villarreal";

    // 🇬🇧 Premier League
    if (normalized.includes("arsenal")) return "Arsenal";
    if (normalized.includes("aston")) return "Aston Villa";
    if (normalized.includes("bournemouth")) return "Bournemouth";
    if (normalized.includes("chelsea")) return "Chelsea";
    if (normalized.includes("palace")) return "Crystal Palace";
    if (normalized.includes("everton")) return "Everton";
    if (normalized.includes("liverpool")) return "Liverpool";
    if (normalized.includes("city") && normalized.includes("manchester")) return "Manchester City";
    if (normalized.includes("united") && normalized.includes("manchester")) return "Manchester United";
    if (normalized.includes("newcastle")) return "Newcastle";
    if (normalized.includes("sunderland")) return "Sunderland";
    if (normalized.includes("tottenham") || normalized.includes("spurs")) return "Tottenham";
    if (normalized.includes("west") && normalized.includes("ham")) return "West Ham";

    // 🇮🇹 Serie A
    if (normalized.includes("milan") && normalized.includes("inter")) return "Inter Milan";
    if (normalized.includes("milan")) return "AC Milan";
    if (normalized.includes("juventus") || normalized.includes("juve")) return "Juventus";
    if (normalized.includes("roma") && !normalized.includes("lazio")) return "AS Roma";
    if (normalized.includes("lazio")) return "Lazio Rome";
    if (normalized.includes("napoli") || normalized.includes("naples")) return "Napoli";
    if (normalized.includes("atalanta")) return "Atalanta";
    if (normalized.includes("bologne") || normalized.includes("bologna")) return "Bologne";
    if (normalized.includes("sassuolo")) return "Sassuolo";
    if (normalized.includes("torino") || normalized.includes("turin")) return "Torino";
    if (normalized.includes("udinese") || normalized.includes("udine")) return "Udinese";
    if (normalized.includes("parme") || normalized.includes("parma")) return "Parme";
    if (normalized.includes("fiorentina")) return "Fiorentina";
    if (normalized.includes("genoa")) return "Genoa";
    if (normalized.includes("como")) return "Como";

    // 🇩🇪 Bundesliga
    if (normalized.includes("leverkusen")) return "Bayer Leverkusen";
    if (normalized.includes("bayern")) return "Bayern Munich";
    if (normalized.includes("cologne") || normalized.includes("koln")) return "FC Cologne";
    if (normalized.includes("fribourg") || normalized.includes("freiburg")) return "Fribourg";
    if (normalized.includes("hoffenheim")) return "Hoffenheim";
    if (normalized.includes("mayence") || normalized.includes("mainz")) return "Mayence";
    if (normalized.includes("leipzig")) return "RB Leipzig";
    if (normalized.includes("stuttgart")) return "Stuttgart";
    if (normalized.includes("union") && normalized.includes("berlin")) return "Union Berlin";
    if (normalized.includes("wolfsburg")) return "VfL Wolfsburg";
    if (normalized.includes("dortmund")) return "Borussia Dortmund";
    if (normalized.includes("monchengladbach") || normalized.includes("gladbach")) return "Borussia Monchengladbach";

    // 🌍 European Clubs
    if (normalized.includes("sporting")) return "Sporting CP";
    if (normalized.includes("shakhtar") || normalized.includes("donetsk")) return "Shakhtar Donetsk";
    if (normalized.includes("salzburg")) return "RB Salzbourg";
    if (normalized.includes("rayo")) return "Rayo Vallecano";
    if (normalized.includes("rangers")) return "Rangers";
    if (normalized.includes("psv")) return "PSV Eindhoven";
    if (normalized.includes("galatasaray")) return "Galatasaray";
    if (normalized.includes("feyenoord") || normalized.includes("feyenord")) return "Feyenoord";
    if (normalized.includes("fener") || normalized.includes("bahce")) return "Fenerbahçe";
    if (normalized.includes("porto")) return "FC Porto";
    if (normalized.includes("brugge") || normalized.includes("bruge")) return "Club Brugge";
    if (normalized.includes("braga")) return "SC Braga";
    if (normalized.includes("benfica")) return "Benfica";
    if (normalized.includes("ajax")) return "Ajax";

    // 🏀 NBA
    if (normalized.includes("76ers") || normalized.includes("philadelphia")) return "Philadelphia 76ers";
    if (normalized.includes("celtics") || normalized.includes("boston")) return "Boston Celtics";
    if (normalized.includes("jazz") || normalized.includes("utah")) return "Utah Jazz";
    if (normalized.includes("mavericks") || normalized.includes("dallas")) return "Dallas Mavericks";
    if (normalized.includes("nuggets") || normalized.includes("denver")) return "Denver Nuggets";
    if (normalized.includes("rockets") || normalized.includes("houston")) return "Houston Rockets";
    if (normalized.includes("clippers") && normalized.includes("angeles")) return "Los Angeles Clippers";
    if (normalized.includes("lakers") && normalized.includes("angeles")) return "Los Angeles Lakers";
    if (normalized.includes("grizzlies") || normalized.includes("memphis")) return "Memphis Grizzlies";
    if (normalized.includes("suns") || normalized.includes("phoenix")) return "Phoenix Suns";
    if (normalized.includes("wizards") || normalized.includes("washington")) return "Washington Wizards";
    if (normalized.includes("spurs") || normalized.includes("san antonio")) return "San Antonio Spurs";
    if (normalized.includes("blazers") || normalized.includes("portland")) return "Portland Trail Blazers";
    if (normalized.includes("raptors") || normalized.includes("toronto")) return "Toronto Raptors";
    if (normalized.includes("kings") || normalized.includes("sacramento")) return "Sacramento Kings";
    if (normalized.includes("timberwolves") || normalized.includes("minnesota")) return "Minnesota Timberwolves";
    if (normalized.includes("magic") || normalized.includes("orlando")) return "Orlando Magic";
    if (normalized.includes("thunder") || normalized.includes("oklahoma")) return "Oklahoma City Thunder";
    if (normalized.includes("pelicans") || normalized.includes("new orleans")) return "New Orleans Pelicans";
    if (normalized.includes("knicks") || normalized.includes("new york")) return "New York Knicks";
    if (normalized.includes("bucks") || normalized.includes("milwaukee")) return "Milwaukee Bucks";
    if (normalized.includes("heat") || normalized.includes("miami")) return "Miami Heat";
    if (normalized.includes("bulls") || normalized.includes("chicago")) return "Chicago Bulls";
    if (normalized.includes("pacers") || normalized.includes("indiana")) return "Indiana Pacers";
    if (normalized.includes("warriors") || normalized.includes("golden state")) return "Golden State Warriors";
    if (normalized.includes("cavaliers") || normalized.includes("cleveland")) return "Cleveland Cavaliers";
    if (normalized.includes("hornets") || normalized.includes("charlotte")) return "Charlotte Hornets";
    if (normalized.includes("pistons") || normalized.includes("detroit")) return "Detroit Pistons";

    // 🌍 CAN (Africa Cup of Nations)
    if (normalized.includes("morocco") || normalized.includes("maroc")) return "Morocco";
    if (normalized.includes("comoros") || normalized.includes("comores")) return "Comoros";
    if (normalized.includes("mali")) return "Mali";
    if (normalized.includes("senegal")) return "Senegal";
    if (normalized.includes("south africa") || normalized.includes("afrique du sud")) return "South Africa";
    if (normalized.includes("egypt") || normalized.includes("egypte")) return "Egypt";
    if (normalized.includes("dr congo") || normalized.includes("congo")) return "DR Congo";
    if (normalized.includes("tunisia") || normalized.includes("tunisie")) return "Tunisia";
    if (normalized.includes("nigeria")) return "Nigeria";
    if (normalized.includes("angola")) return "Angola";
    if (normalized.includes("gabon")) return "Gabon";
    if (normalized.includes("algeria") || normalized.includes("algerie")) return "Algeria";
    if (normalized.includes("ivory coast") || normalized.includes("cote d'ivoire") || normalized.includes("cote divoire")) return "Ivory Coast";
    if (normalized.includes("cameroon") || normalized.includes("cameroun")) return "Cameroon";

    return name;
  };

  const homeTeamNormalized = normalizeTeamName(match.homeTeam);
  const awayTeamNormalized = normalizeTeamName(match.awayTeam);

  const homeBackground = TEAM_BACKGROUNDS[homeTeamNormalized];
  const awayBackground = TEAM_BACKGROUNDS[awayTeamNormalized];

  const backgroundImage =
    homeBackground ||
    awayBackground ||
    'https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg';

  const cardStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.8)), url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden card-shadow border border-[#30363D] h-[360px] transition-transform duration-300 hover:scale-[1.02]"
      style={cardStyle}
    >

      <div className="absolute top-3 left-3 bg-[#C1322B]/90 backdrop-blur-sm px-3 py-1 rounded-full z-10">
        <p className="text-white text-xs font-semibold">{match.league}</p>
      </div>

      {!isFinished && (
        <div className="absolute top-3 right-3 z-10">
          <MatchCountdown datetime={match.datetime} />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between p-4 z-10 pointer-events-none">
        <div></div>

        <div className="pointer-events-auto">
          <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 mb-3 inline-block">
            <p className="text-white text-xs font-medium">{match.datetime}</p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="flex flex-col items-center gap-2 mb-1">
                <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <span className="text-white font-bold text-lg">
                    {match.homeTeam.substring(0, 3).toUpperCase()}
                  </span>
                </div>
                <p className="text-white font-bold text-base leading-tight">{match.homeTeam}</p>
              </div>
              {isFinished && (
                <p className="text-[#F5C144] font-bold text-3xl mt-1">{match.homeScore}</p>
              )}
            </div>

            <div className="px-3">
              {isFinished ? (
                <p className="text-white/50 font-bold text-2xl">-</p>
              ) : (
                <p className="text-white/50 text-sm">VS</p>
              )}
            </div>

            <div className="text-center flex-1">
              <div className="flex flex-col items-center gap-2 mb-1">
                <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <span className="text-white font-bold text-lg">
                    {match.awayTeam.substring(0, 3).toUpperCase()}
                  </span>
                </div>
                <p className="text-white font-bold text-base leading-tight">{match.awayTeam}</p>
              </div>
              {isFinished && (
                <p className="text-[#F5C144] font-bold text-3xl mt-1">{match.awayScore}</p>
              )}
            </div>
          </div>

          {!isFinished && (
            <div className="grid grid-cols-3 gap-2 relative z-20">
              <button
                onClick={() => handleOddsClick('home', match.homeOdds)}
                className={`rounded-2xl py-3 px-2 transition-all duration-200 ease-in-out active:scale-95 hover:scale-105 backdrop-blur-md shadow-lg relative ${
                  isSelected('home')
                    ? 'bg-[#C1322B] text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isSelected('home') ? 'text-white/90' : 'text-white/70'}`}>
                  1
                </p>
                <p className="font-bold text-xl text-white">
                  {match.homeOdds.toFixed(2)}
                </p>
              </button>

              <button
                onClick={() => handleOddsClick('draw', match.drawOdds)}
                className={`rounded-2xl py-3 px-2 transition-all duration-200 ease-in-out active:scale-95 hover:scale-105 backdrop-blur-md shadow-lg relative ${
                  isSelected('draw')
                    ? 'bg-[#C1322B] text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isSelected('draw') ? 'text-white/90' : 'text-white/70'}`}>
                  N
                </p>
                <p className="font-bold text-xl text-white">
                  {match.drawOdds.toFixed(2)}
                </p>
              </button>

              <button
                onClick={() => handleOddsClick('away', match.awayOdds)}
                className={`rounded-2xl py-3 px-2 transition-all duration-200 ease-in-out active:scale-95 hover:scale-105 backdrop-blur-md shadow-lg relative ${
                  isSelected('away')
                    ? 'bg-[#C1322B] text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isSelected('away') ? 'text-white/90' : 'text-white/70'}`}>
                  2
                </p>
                <p className="font-bold text-xl text-white">
                  {match.awayOdds.toFixed(2)}
                </p>
              </button>
            </div>
          )}

          {isFinished && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl py-3 px-4 text-center border border-white/20">
              <p className="text-white/70 text-sm">Match terminé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
