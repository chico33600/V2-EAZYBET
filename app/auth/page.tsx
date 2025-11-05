'use client';

import { useState } from 'react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique backend à venir
    console.log('Form submitted', { mode, email, password, username });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B0000] to-[#000000] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">EasyBet</h1>
          <p className="text-white/70 text-sm">Pariez et gagnez facilement</p>
        </div>

        <div className="bg-[#1C2128]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-[#30363D]">
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#C1322B] text-white shadow-lg'
                  : 'bg-[#30363D] text-white/60 hover:text-white'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-[#C1322B] text-white shadow-lg'
                  : 'bg-[#30363D] text-white/60 hover:text-white'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="username" className="block text-white font-bold mb-2 text-sm">
                  Pseudo
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre pseudo"
                  required={mode === 'signup'}
                  className="w-full px-4 py-3 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#C1322B] focus:ring-2 focus:ring-[#C1322B]/20 transition-all"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-white font-bold mb-2 text-sm">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full px-4 py-3 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#C1322B] focus:ring-2 focus:ring-[#C1322B]/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-white font-bold mb-2 text-sm">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#C1322B] focus:ring-2 focus:ring-[#C1322B]/20 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#C1322B] hover:bg-[#000000] text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              {mode === 'login' ? "Pas encore de compte ?" : 'Déjà inscrit ?'}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[#C1322B] hover:text-[#F5C144] font-bold transition-colors underline"
              >
                {mode === 'login' ? "S'inscrire" : 'Se connecter'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
