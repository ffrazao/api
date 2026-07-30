import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Sun,
  Moon,
  Activity,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { authService } from '../../services/authService';
import { Logo } from '../../components/custom/layout/Logo';
import {
  ProjectTaskIcon,
  CollaborationNetworkIcon,
  ProgressEffortIcon,
  MilestoneDeliveryIcon,
} from '../../components/custom/ui/DomainIcons';

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
}

export const Home: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const [isPingLoading, setIsPingLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleLogin = () => {
    authService.login();
  };

  const handlePingBackend = async () => {
    setIsPingLoading(true);
    setToast({ show: false, type: 'success', title: '', message: '' });

    try {
      const response = await fetch('http://localhost:8081/api/v1/public/ping');
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'Conexão com Backend (8081) Sucesso!',
          message: `HTTP ${response.status} OK - Endpoint público respondendo normalmente.`,
          payload: data || { status: 'UP', endpoint: '/api/v1/public/ping' },
        });
      } else {
        setToast({
          show: true,
          type: 'error',
          title: `Erro HTTP ${response.status}`,
          message: `O backend respondeu com erro ao chamar http://localhost:8081/api/v1/public/ping.`,
          payload: data,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na conexão de rede';
      setToast({
        show: true,
        type: 'error',
        title: 'Falha de Conectividade',
        message: `Não foi possível conectar a http://localhost:8081/api/v1/public/ping. (${errorMsg})`,
      });
    } finally {
      setIsPingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-offwhite dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Floating Notification */}
      {toast.show && (
        <div className="fixed top-24 right-4 z-50 max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-medium/10 text-brand-medium">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {toast.message}
              </p>

              {toast.payload && (
                <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-32">
                  {JSON.stringify(toast.payload, null, 2)}
                </pre>
              )}
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Public Navbar */}
      <header className="sticky top-0 z-50 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <Logo size={38} showText={true} textClassName="text-slate-900 dark:text-white" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#funcionalidades" className="hover:text-brand-medium transition-colors">
              Funcionalidades
            </a>
            <a href="#autenticacao" className="hover:text-brand-medium transition-colors">
              Autenticação SSO
            </a>
            <a href="#arquitetura" className="hover:text-brand-medium transition-colors">
              Arquitetura
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Alternar Tema"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>

            <button
              onClick={handleLogin}
              title="Acesse o sistema"
              className="px-4 py-2.5 rounded-xl bg-brand-deep hover:bg-blue-900 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-deep/25 hover:shadow-lg transition-all flex items-center gap-2 group cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-brand-vibrant" />
              Login
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Required Button 1: Teste do Backend */}
            <button
              onClick={handlePingBackend}
              disabled={isPingLoading}
              className="px-4 py-2.5 rounded-xl border border-brand-medium/50 text-brand-medium hover:bg-brand-medium/10 dark:hover:bg-brand-medium/20 font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              title="Testar requisição HTTP GET para http://localhost:8081/api/v1/public/ping"
            >
              {isPingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              Teste do Backend
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-b from-white via-surface-offwhite to-surface-offwhite dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-brand-deep/10 via-brand-medium/20 to-brand-vibrant/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-medium/10 border border-brand-medium/20 text-brand-deep dark:text-brand-medium text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="w-4 h-4 text-brand-vibrant" />
            <span>Plataforma Institucional de Governança e Produtividade</span>
          </div>

          {/* Slogan */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
            Gestão colaborativa de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-deep via-brand-medium to-brand-vibrant">tempo e trabalho</span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Orquestre projetos, alocações de equipes e horas trabalhadas sob o modelo de{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">faceta única por atuação</strong>. Governança simplificada com integração OAuth2/OIDC via Keycloak.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              title="Acesse o sistema"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-medium hover:bg-blue-600 text-white font-bold text-base shadow-xl shadow-brand-medium/30 transition-all flex items-center justify-center gap-3 group cursor-pointer"
            >
              Login
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handlePingBackend}
              disabled={isPingLoading}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-brand-medium/40 text-brand-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Activity className="w-5 h-5 text-brand-medium" />
              Teste do Backend
            </button>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-16 pt-10 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-deep dark:text-brand-medium">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Faceta Única por Sessão</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-vibrant">#10B981</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Indicadores de Sucesso</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-deep dark:text-brand-medium">8081 API</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Backend Docker Active</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-200">React 18+</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Vite + Tailwind Architecture</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="funcionalidades" className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
              Ambiente amigável para organização de tempo e trabalho
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Sem burocracias ou folha de ponto tradicionais. Uma plataforma inclusiva e transparente pensada para órgãos públicos, empresas, cidadãos e projetos colaborativos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-surface-offwhite dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-xl hover:border-brand-medium/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-deep/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ProjectTaskIcon size={28} color="#1E3A8A" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Projetos & Tarefas
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
                  Organização clara do esforço em blocos e tarefas estruturadas, sem sobrecarga burocrática.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-deep dark:text-brand-medium">
                <CheckCircle2 className="w-4 h-4 text-brand-vibrant" />
                Trabalho Organizado
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-surface-offwhite dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-xl hover:border-brand-medium/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-medium/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CollaborationNetworkIcon size={28} color="#3B82F6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Rede de Colaboração
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
                  Pessoas conectadas sob uma faceta única por vez (Organização e Papel Ativo), promovendo transparência.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-medium">
                <CheckCircle2 className="w-4 h-4 text-brand-vibrant" />
                Inclusivo & Humano
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-surface-offwhite dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-xl hover:border-brand-medium/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ProgressEffortIcon size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Etapas & Progresso
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
                  Acompanhamento de progresso visual por fases e entregas, focando no resultado acumulado do esforço.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-vibrant">
                <CheckCircle2 className="w-4 h-4 text-brand-vibrant" />
                Linhas de Etapas
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 hover:shadow-xl transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-vibrant/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MilestoneDeliveryIcon size={28} color="#10B981" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  Marcos & Entregas
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  Entregas finalizadas com validação rápida e destaque de conquistas individuais e em equipe.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-vibrant">
                <CheckCircle2 className="w-4 h-4 text-brand-vibrant" />
                Sucesso em #10B981
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left */}
            <div className="flex items-center gap-3">
              <Logo size={28} showText={false} />
              <span className="text-sm font-semibold text-white">
                Tempo de Projetos &copy; 2026
              </span>
            </div>

            {/* Middle */}
            <p className="text-xs text-slate-500 text-center">
              Plataforma para Gestão Colaborativa de Tempo e Trabalho. Todos os direitos reservados.
            </p>

            {/* Right */}
            <div className="flex items-center gap-4 text-xs">
              <button
                onClick={handleLogin}
                title="Acesse o sistema"
                className="text-brand-medium hover:underline font-semibold cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
