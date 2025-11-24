# Odds API Integration - EazyBet

## ✅ Features Implemented

### 1. Real-Time Wallet Update (Tap-to-Earn)
When a user earns tokens via Tap-to-Earn, the wallet updates instantly without page reload.

**How it works:**
- User taps and earns tokens
- API call updates Supabase database
- `updateProfile()` in AuthContext immediately updates the React state
- Header displays new token count with smooth animation
- Floating "+X" indicator shows earned tokens

**Files modified:**
- `components/tap-to-earn-modal.tsx` - Already implements instant wallet refresh
- `components/header-coins.tsx` - Already listens to profile changes
- `lib/auth-context.tsx` - Provides `updateProfile()` function

### 2. Odds API Integration for Major Leagues

**Leagues Synced:**
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League (England)
- 🇪🇸 La Liga (Spain)
- 🇮🇹 Serie A (Italy)
- 🇩🇪 Bundesliga (Germany)
- 🇫🇷 Ligue 1 (France)
- ⭐ UEFA Champions League
- 🏆 UEFA Europa League
- 🥉 UEFA Europa Conference League

**API Route:** `/api/matches/sync-odds-api`

**Methods:**
- `POST` - Sync matches from Odds API to Supabase
- `GET` - Get cached match data

**Request Body (POST):**
```json
{
  "force": false  // true to bypass cache
}
```

**Response:**
```json
{
  "message": "Matches synced successfully",
  "total": 120,
  "inserted": 45,
  "updated": 75,
  "cached": false
}
```

**Features:**
- ✅ 10-minute cache to avoid API quota limits
- ✅ Idempotent: No duplicate matches (uses `external_id`)
- ✅ Updates odds if match already exists
- ✅ Stores in Supabase `matches` table
- ✅ Error handling for missing API key
- ✅ Logs all operations to `system_logs`

### 3. Database Schema Updates

**New field added to `matches` table:**
- `external_id` (text, unique) - Tracks matches from external APIs
- Prevents duplicate imports
- Nullable for internally created matches

**Migration:** `003_add_external_id_to_matches.sql`

### 4. Automatic Match Sync

**Edge Function:** `sync-odds-api`
- Deployed to Supabase
- Can be triggered manually or via cron
- Syncs all major leagues automatically
- Updates existing matches with latest odds

**URL:** `https://<project-ref>.supabase.co/functions/v1/sync-odds-api`

**Schedule Recommendation:** Every 6 hours

### 5. Frontend Display

**Home Page (`app/page.tsx`):**
- ✅ Displays all matches grouped by competition
- ✅ Competition headers with emojis
- ✅ Automatic grouping (Premier League, La Liga, etc.)
- ✅ Real-time updates when matches sync
- ✅ Supports existing match card design

**Competition Emojis:**
```typescript
{
  'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'La Liga': '🇪🇸',
  'Serie A': '🇮🇹',
  'Bundesliga': '🇩🇪',
  'Ligue 1': '🇫🇷',
  'UEFA Champions League': '⭐',
  'UEFA Europa League': '🏆',
  'UEFA Europa Conference League': '🥉',
}
```

### 6. Performance Optimizations

**Caching:**
- API responses cached for 10 minutes
- Reduces Odds API calls (quota-limited)
- Cache stored in memory (process-level)

**Auto-Sync:**
- Runs every hour by default
- Can be configured via `startAutoSync(intervalMs)`
- Dispatches `matches-synced` event for UI updates

### 7. Security

✅ **API Key Protection:**
- Stored in environment variable `ODDS_API_KEY`
- Never exposed to client
- Only accessible in API routes and Edge Functions

✅ **Error Handling:**
- Graceful degradation if Odds API fails
- Falls back to demo matches if needed
- Clear error messages for missing configuration

---

## 📋 Setup Instructions

### 1. Configure Odds API Key

Get your free API key from: https://the-odds-api.com/

Add to `.env`:
```env
ODDS_API_KEY=your_odds_api_key_here
```

### 2. Test the Integration

**Manual Sync:**
```bash
curl -X POST http://localhost:3000/api/matches/sync-odds-api \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Check Cached Data:**
```bash
curl http://localhost:3000/api/matches/sync-odds-api
```

### 3. Set Up Cron Job (Optional)

Configure a cron job to call the Edge Function:

```bash
# Every 6 hours
0 */6 * * * curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-odds-api
```

Or use Supabase's built-in cron (pg_cron):
```sql
SELECT cron.schedule(
  'sync-odds-api',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://<project-ref>.supabase.co/functions/v1/sync-odds-api',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

## 🔧 API Usage

### Sync Matches (Force Refresh)

```typescript
const response = await fetch('/api/matches/sync-odds-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ force: true }),
});

const data = await response.json();
console.log(`Synced ${data.total} matches`);
```

### Get Available Matches

```typescript
import { fetchAvailableMatches } from '@/lib/api-client';

const matches = await fetchAvailableMatches();
// Returns matches grouped by competition
```

### Listen for Sync Events

```typescript
window.addEventListener('matches-synced', (event: CustomEvent) => {
  console.log('Matches updated:', event.detail);
  // Refresh UI
});
```

---

## 📊 Data Flow

```
┌─────────────────┐
│   Odds API      │  (External)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Edge Function  │  (Supabase)
│  sync-odds-api  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   API Route     │  (Next.js)
│ /sync-odds-api  │
└────────┬────────┘
         │
         ↓ (INSERT/UPDATE)
┌─────────────────┐
│   Supabase DB   │
│  matches table  │
└────────┬────────┘
         │
         ↓ (SELECT)
┌─────────────────┐
│  Frontend UI    │
│   Home Page     │
└─────────────────┘
```

---

## 🎯 Key Files

### API Routes
- `app/api/matches/sync-odds-api/route.ts` - Sync endpoint
- `app/api/matches/upcoming/route.ts` - Get upcoming matches
- `app/api/matches/results/route.ts` - Get finished matches

### Edge Functions
- `supabase/functions/sync-odds-api/index.ts` - Auto-sync function

### Frontend
- `app/page.tsx` - Home page with match display
- `lib/api-client.ts` - API helper functions
- `lib/match-sync.ts` - Auto-sync logic

### Database
- `supabase/migrations/003_add_external_id_to_matches.sql`

---

## 🚀 Next Steps

1. **Add more leagues** - Edit `LEAGUES_CONFIG` in the API route
2. **Customize cache duration** - Modify `CACHE_DURATION` constant
3. **Add live scores** - Use Odds API's live scores endpoint
4. **Team logos** - Map team names to logo URLs
5. **Match statistics** - Fetch and display additional match data

---

## 🐛 Troubleshooting

### No matches appearing?

1. Check if `ODDS_API_KEY` is set in `.env`
2. Manually trigger sync: `POST /api/matches/sync-odds-api`
3. Check browser console for errors
4. Verify database connection

### Odds not updating?

- Cache may be active (10 min)
- Force refresh: `{ "force": true }`
- Check Edge Function logs

### API quota exceeded?

- Reduce sync frequency
- Increase cache duration
- Consider paid Odds API plan

---

## 📝 Notes

- Free Odds API tier: 500 requests/month
- Each sync = 8 requests (one per league)
- Recommended: Sync every 6 hours = 120 requests/month
- Cache dramatically reduces API calls

---

**Status:** ✅ Fully operational and production-ready!
