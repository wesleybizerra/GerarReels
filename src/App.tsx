import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Sparkles, 
  LayoutDashboard, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Plus, 
  History, 
  ShieldCheck, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Download,
  Play
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { THEMES, LANGUAGES, PLANS, cn } from './constants';
import { generateReelScript, generateSceneImage, generateSceneAudio } from './services/geminiService';
import ReelPlayer from './components/ReelPlayer';

export default function App() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-indigo-500/30">
      {/* Sidebar / Navigation */}
      <nav className="fixed top-0 left-0 bottom-0 w-64 bg-[#0f0f12] border-r border-white/5 hidden lg:flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">ReelsGen <span className="text-indigo-500">AI</span></span>
        </div>

        <div className="space-y-2 flex-1">
          <NavItem active={activeTab === 'generate'} onClick={() => setActiveTab('generate')} icon={<Plus size={20} />} label="Gerar Reel" />
          <NavItem active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<History size={20} />} label="Minha Galeria" />
          <NavItem active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={<CreditCard size={20} />} label="Planos" />
          {user.email === 'wesleybizerra@hotmail.com' && (
            <NavItem active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldCheck size={20} />} label="Admin" />
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{user.plan}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0f0f12]/80 backdrop-blur-md border-bottom border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <Video className="text-indigo-500" size={24} />
          <span className="font-bold">ReelsGen AI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-[#0a0a0c] z-40 lg:hidden pt-24 px-6"
          >
            <div className="space-y-4">
              <NavItem active={activeTab === 'generate'} onClick={() => { setActiveTab('generate'); setIsMobileMenuOpen(false); }} icon={<Plus size={20} />} label="Gerar Reel" />
              <NavItem active={activeTab === 'gallery'} onClick={() => { setActiveTab('gallery'); setIsMobileMenuOpen(false); }} icon={<History size={20} />} label="Minha Galeria" />
              <NavItem active={activeTab === 'pricing'} onClick={() => { setActiveTab('pricing'); setIsMobileMenuOpen(false); }} icon={<CreditCard size={20} />} label="Planos" />
              {user.email === 'wesleybizerra@hotmail.com' && (
                <NavItem active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }} icon={<ShieldCheck size={20} />} label="Admin" />
              )}
              <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400">
                <LogOut size={20} />
                <span>Sair</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
          {activeTab === 'generate' && <GenerateTab user={user} />}
          {activeTab === 'gallery' && <GalleryTab />}
          {activeTab === 'pricing' && <PricingTab user={user} refreshUser={refreshUser} />}
          {activeTab === 'admin' && <AdminTab />}
          {activeTab === 'payment-success' && <PaymentSuccessTab refreshUser={refreshUser} setActiveTab={setActiveTab} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
  );
}

function GenerateTab({ user }: { user: any }) {
  const [theme, setTheme] = useState(THEMES[0].id);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReel, setGeneratedReel] = useState<any>(null);
  const [status, setStatus] = useState('');

  const currentTheme = THEMES.find(t => t.id === theme);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setGeneratedReel(null);
    try {
      setStatus('Criando roteiro persuasivo...');
      const script = await generateReelScript(theme, topic, language, duration, user.plan);
      
      setStatus('Gerando imagens cinematográficas...');
      const scenesWithAssets = [];
      for (let i = 0; i < script.scenes.length; i++) {
        const scene = script.scenes[i];
        setStatus(`Gerando imagem para cena ${i + 1}/${script.scenes.length}...`);
        const imageUrl = await generateSceneImage(scene.imagePrompt);
        setStatus(`Gerando narração para cena ${i + 1}/${script.scenes.length}...`);
        const audioUrl = await generateSceneAudio(scene.text, language);
        scenesWithAssets.push({ ...scene, imageUrl, audioUrl });
      }

      const finalReel = {
        title: script.title,
        theme,
        language,
        duration,
        assets: scenesWithAssets
      };

      setGeneratedReel(finalReel);
      setStatus('Salvando na sua galeria...');
      await fetch('/api/reels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalReel)
      });
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Erro na geração. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-start">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Criar Novo <span className="text-indigo-500">Reel</span></h1>
          <p className="text-gray-400">Transforme ideias em vídeos virais em segundos.</p>
        </div>

        <div className="space-y-6 bg-[#0f0f12] p-8 rounded-3xl border border-white/5 shadow-xl">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Tema do Vídeo</label>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-[#16161a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            >
              {THEMES.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Idioma</label>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-[#16161a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Tópico ou Assunto</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={currentTheme?.placeholder}
              className="w-full bg-[#16161a] border border-white/10 rounded-xl px-4 py-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Duração (segundos)</label>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 90, 120, 150, 180].map(d => {
                const plan = PLANS.find(p => p.name === user.plan);
                const isDisabled = d > (plan?.durationLimit || 60);
                return (
                  <button
                    key={d}
                    disabled={isDisabled}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium border transition-all",
                      duration === d ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#16161a] border-white/5 text-gray-400 hover:border-white/20",
                      isDisabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {d}s
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 overflow-hidden relative"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Gerar Reel Mágico</span>
              </>
            )}
          </button>
          
          {status && (
            <p className="text-center text-xs text-indigo-400 animate-pulse font-medium">{status}</p>
          )}
        </div>
      </motion.div>

      <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#0f0f12] rounded-3xl border border-white/5 border-dashed p-10">
        {generatedReel ? (
          <div className="space-y-6 w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-center">{generatedReel.title}</h3>
            <ReelPlayer scenes={generatedReel.assets} />
            <button className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              <Download size={20} />
              Baixar Vídeo Final
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4 max-w-xs">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video size={40} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-bold">Pré-visualização</h3>
            <p className="text-gray-500 text-sm">Preencha os dados ao lado e clique em gerar para ver a mágica acontecer aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryTab() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReel, setSelectedReel] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reels')
      .then(res => res.json())
      .then(data => {
        setReels(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Minha <span className="text-indigo-500">Galeria</span></h1>
        <p className="text-gray-400">Todos os seus vídeos gerados ficam salvos aqui.</p>
      </div>

      {reels.length === 0 ? (
        <div className="bg-[#0f0f12] rounded-3xl p-20 text-center border border-white/5">
          <History size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Você ainda não gerou nenhum Reel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {reels.map(reel => (
            <motion.div 
              key={reel.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedReel(reel)}
              className="bg-[#0f0f12] rounded-2xl overflow-hidden border border-white/5 cursor-pointer group"
            >
              <div className="aspect-[9/16] bg-gray-900 relative">
                <img 
                  src={JSON.parse(reel.assets)[0].imageUrl} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-bold truncate">{reel.title}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{reel.theme} • {reel.language}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedReel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full flex flex-col items-center"
            >
              <button 
                onClick={() => setSelectedReel(null)}
                className="absolute -top-12 right-0 text-white hover:text-indigo-400 transition-colors"
              >
                <X size={32} />
              </button>
              <h2 className="text-2xl font-bold mb-6">{selectedReel.title}</h2>
              <ReelPlayer scenes={JSON.parse(selectedReel.assets)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PricingTab({ user, refreshUser }: { user: any, refreshUser: () => void }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleBuy = async (plan: any) => {
    if (plan.name === 'Gratuito') return;
    setLoadingPlan(plan.name);
    try {
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName: plan.name, price: plan.price })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Escolha seu <span className="text-indigo-500">Plano</span></h1>
        <p className="text-gray-400">Aumente sua produtividade e crie vídeos sem limites. Aceitamos Pix e Cartão de Crédito.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map(plan => (
          <div 
            key={plan.name}
            className={cn(
              "bg-[#0f0f12] rounded-3xl p-8 border flex flex-col transition-all duration-300",
              user.plan === plan.name ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-white/5 hover:border-white/10"
            )}
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">R${plan.price.toFixed(2)}</span>
                <span className="text-gray-500 text-sm">/mês</span>
              </div>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleBuy(plan)}
              disabled={user.plan === plan.name || plan.name === 'Gratuito' || !!loadingPlan}
              className={cn(
                "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                user.plan === plan.name 
                  ? "bg-white/5 text-indigo-400 cursor-default" 
                  : plan.name === 'Gratuito'
                    ? "bg-white/5 text-gray-500 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
              )}
            >
              {loadingPlan === plan.name ? <Loader2 className="animate-spin" size={20} /> : (user.plan === plan.name ? 'Plano Atual' : 'Comprar Plano')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Painel do <span className="text-indigo-500">Administrador</span></h1>
        <p className="text-gray-400">Gerencie os usuários da plataforma.</p>
      </div>

      <div className="bg-[#0f0f12] rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-gray-400">Nome de Usuário</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium">{u.username}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded-full border border-emerald-500/20">Ativo</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentSuccessTab({ refreshUser, setActiveTab }: { refreshUser: () => void, setActiveTab: (t: string) => void }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan) {
      fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      }).then(() => {
        refreshUser();
        setTimeout(() => setActiveTab('generate'), 3000);
      });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
        <CheckCircle2 size={48} />
      </div>
      <h1 className="text-3xl font-bold">Pagamento Confirmado!</h1>
      <p className="text-gray-400 max-w-md">Seu plano foi ativado com sucesso. Você será redirecionado para o gerador em instantes.</p>
      <button onClick={() => setActiveTab('generate')} className="text-indigo-400 font-bold">Ir agora</button>
    </div>
  );
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (isLogin) {
        login(data.user);
      } else {
        setIsLogin(true);
        setError('Conta criada! Faça login agora.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0f0f12] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20 mb-6">
            <Video className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold">ReelsGen <span className="text-indigo-500">AI</span></h1>
          <p className="text-gray-400 mt-2 text-center">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta gratuita hoje.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Nome de Usuário</label>
              <input 
                required
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#16161a] border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Como quer ser chamado?"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#16161a] border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              placeholder="seu@hotmail.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Senha</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#16161a] border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar na Plataforma' : 'Criar Minha Conta')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
