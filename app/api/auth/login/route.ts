import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return createErrorResponse('E-mail et mot de passe requis', 400);
    }

    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return createErrorResponse('Identifiants incorrects', 401);
      }
      if (error.message.includes('Email not confirmed')) {
        return createErrorResponse('E-mail non confirmé', 401);
      }
      if (error.message.includes('User not found')) {
        return createErrorResponse('Compte introuvable', 401);
      }
      return createErrorResponse('Identifiants incorrects', 401);
    }

    if (!data.user || !data.session) {
      return createErrorResponse('Échec de la connexion', 500);
    }

    // Check if email is confirmed
    if (!data.user.email_confirmed_at) {
      return createErrorResponse('⚠️ Confirme ton adresse email avant de pouvoir te connecter. Vérifie ta boîte mail.', 403);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    return createSuccessResponse({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username,
        tokens: profile?.tokens,
        diamonds: profile?.diamonds,
        has_seen_tutorial: profile?.has_seen_tutorial || false,
      },
      session: data.session,
      access_token: data.session.access_token,
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
