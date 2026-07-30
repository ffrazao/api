import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Guard flag to prevent React StrictMode double execution
  const hasExchangedCode = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      if (!hasExchangedCode.current) {
        setError('Código de autorização ou estado OIDC não fornecido pelo Keycloak.');
      }
      return;
    }

    // Atomic guard: execute exchange exactly once per mount/session
    if (hasExchangedCode.current) {
      return;
    }
    hasExchangedCode.current = true;

    // Immediately clean sensitive code/state parameters from address bar to prevent re-submission on F5/Reload
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    authService
      .handleCallback(code, state)
      .then(() => {
        navigate('/app/dashboard', { replace: true });
      })
      .catch((err) => {
        console.error('[Callback Keycloak Error]', err);
        setError(err.message || 'Falha ao autenticar junto ao Keycloak.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
        {!error ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-brand-deep text-brand-medium flex items-center justify-center mx-auto shadow-lg shadow-brand-deep/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Autenticando via Keycloak SSO
              </h2>
              <p className="text-xs text-slate-400">
                Validando token OIDC e configurando seu contexto de acesso...
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Falha na Autenticação</h2>
              <p className="text-xs text-rose-300 bg-rose-950/50 p-3 rounded-lg border border-rose-900 text-left line-clamp-3">
                {error}
              </p>
            </div>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a Página Inicial
            </button>
          </>
        )}
      </div>
    </div>
  );
};
