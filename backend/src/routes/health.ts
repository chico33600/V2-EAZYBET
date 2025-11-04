import { Router, Request, Response } from 'express';
import { supabaseAnon } from '../supabase';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get('/health/supabase', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAnon.from('_health_check').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ 
        ok: false, 
        message: 'Supabase connection failed',
        error: error.message 
      });
    }
    
    res.json({ 
      ok: true, 
      message: 'Supabase connected successfully' 
    });
  } catch (err) {
    res.status(500).json({ 
      ok: false, 
      message: 'Supabase connection failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;
