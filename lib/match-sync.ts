import { supabase } from './supabase-client';

let syncInterval: NodeJS.Timeout | null = null;
let lastSyncTime: Date | null = null;

export interface SyncStats {
  competitions: number;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  stats?: SyncStats;
  error?: string;
}

async function addDemoMatchesIfNeeded(): Promise<boolean> {
  try {
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return false;
    }

    console.log('⚠️ Aucun match trouvé, ajout de matchs de démo...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('No session token for demo matches');
      return false;
    }

    const response = await fetch('/api/matches/add-demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      console.log('✅ Matchs de démo ajoutés automatiquement');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error adding demo matches:', error);
    return false;
  }
}

export async function syncMatches(): Promise<SyncResponse> {
  try {
    console.log('🌀 Synchronisation Odds API...');

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/matches/sync-odds-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify({ force: false }),
    });

    if (!response.ok) {
      console.error('⚠️ Erreur lors de la synchronisation:', response.statusText);

      const demoAdded = await addDemoMatchesIfNeeded();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matches-synced', { detail: { demo: demoAdded } }));
      }

      return {
        success: demoAdded,
        error: response.statusText,
        stats: {
          competitions: 0,
          synced: demoAdded ? 5 : 0,
          updated: 0,
          skipped: 0,
          errors: demoAdded ? 0 : 1,
        },
      };
    }

    const data = await response.json();

    if (data.total !== undefined) {
      lastSyncTime = new Date();
      console.log(`✅ Matchs synchronisés: ${data.inserted} nouveaux, ${data.updated} mis à jour`);

      if (data.inserted === 0 && data.updated === 0) {
        console.log('⚠️ Aucun match trouvé');
        await addDemoMatchesIfNeeded();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matches-synced', {
          detail: {
            synced: data.inserted,
            updated: data.updated,
            total: data.total,
          }
        }));
      }

      return {
        success: true,
        message: data.message,
        stats: {
          competitions: 8,
          synced: data.inserted,
          updated: data.updated,
          skipped: 0,
          errors: 0,
        },
      };
    } else {
      console.error('⚠️ Format de réponse invalide');
      return {
        success: false,
        error: 'Invalid response format',
        stats: {
          competitions: 0,
          synced: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
        },
      };
    }
  } catch (error) {
    console.error('⚠️ Erreur lors de la synchronisation:', error);

    const demoAdded = await addDemoMatchesIfNeeded();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('matches-synced', { detail: { demo: demoAdded } }));
    }

    return {
      success: demoAdded,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        competitions: 0,
        synced: demoAdded ? 5 : 0,
        updated: 0,
        skipped: 0,
        errors: demoAdded ? 0 : 1,
      },
    };
  }
}

export function startAutoSync(intervalMs: number = 60 * 60 * 1000) {
  if (syncInterval) {
    console.log('Auto-sync already running');
    return;
  }

  console.log(`Starting auto-sync every ${intervalMs / 1000 / 60} minutes`);

  syncMatches();

  syncInterval = setInterval(() => {
    syncMatches();
  }, intervalMs);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Auto-sync stopped');
  }
}

export function getLastSyncTime(): Date | null {
  return lastSyncTime;
}

export function isAutoSyncRunning(): boolean {
  return syncInterval !== null;
}
