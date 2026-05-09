import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Zap, Upload, LogOut, Menu, Sun, Moon, RefreshCw, Play, X, Filter, FilterX, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/lib/filters-context';
import { DashboardTab } from '@/lib/types';
import { FilterBar } from '@/components/dashboard/FilterBar';
// Code-splitting por aba — cada tab vira um chunk próprio, baixado só quando aberto.
const TabResumo     = lazy(() => import('@/components/dashboard/TabResumo').then(m => ({ default: m.TabResumo })));
const TabKPIs       = lazy(() => import('@/components/dashboard/TabKPIs').then(m => ({ default: m.TabKPIs })));
const TabProdutos   = lazy(() => import('@/components/dashboard/TabProdutos').then(m => ({ default: m.TabProdutos })));
const TabRanking    = lazy(() => import('@/components/dashboard/TabRanking').then(m => ({ default: m.TabRanking })));
const TabGraficos   = lazy(() => import('@/components/dashboard/TabGraficos').then(m => ({ default: m.TabGraficos })));
const TabSupervisao = lazy(() => import('@/components/dashboard/TabSupervisao').then(m => ({ default: m.TabSupervisao })));
const TabAnalise    = lazy(() => import('@/components/dashboard/TabAnalise').then(m => ({ default: m.TabAnalise })));
const TabAdmin      = lazy(() => import('@/components/dashboard/TabAdmin').then(m => ({ default: m.TabAdmin })));
const ImportDialog  = lazy(() => import('@/components/dashboard/ImportDialog').then(m => ({ default: m.ImportDialog })));
import { MetaReminderDialog } from '@/components/dashboard/MetaReminderDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';
import { LoadingScreen } from '@/components/LoadingScreen';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';

function PresentationSection({ index, label, children, total }: { index: number; label: string; children: React.ReactNode; total: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const [focus, setFocus] = useState(0); // 0..1 — proximity of section center to viewport center
  const [hasEntered, setHasEntered] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const wasInViewRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = vh / 2;
      const dist = Math.abs(sectionCenter - viewportCenter);
      // Within ~70% of viewport height = fully focused; falls off smoothly
      const f = Math.max(0, 1 - dist / (vh * 0.7));
      setFocus(f);

      // Detecta quando a seção entra na área visível para (re)disparar animações dos gráficos
      const inView = rect.bottom > vh * 0.15 && rect.top < vh * 0.85;
      if (inView && !wasInViewRef.current) {
        wasInViewRef.current = true;
        setHasEntered(true);
        // Bump key para forçar remount dos gráficos e replay da animação Recharts
        setReplayKey(k => k + 1);
      } else if (!inView && wasInViewRef.current && (rect.top > vh || rect.bottom < 0)) {
        // Saiu completamente da viewport — permite replay quando voltar
        wasInViewRef.current = false;
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const opacity = 0.4 + focus * 0.6;
  const translateY = (1 - focus) * 10;
  const scale = 0.985 + focus * 0.015;
  const isFocused = focus > 0.6;

  return (
    <motion.section
      ref={ref as any}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transition: 'opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className="relative space-y-5 min-h-[70vh] pl-6 sm:pl-10"
    >
      {/* Numeral decorativo gigante de fundo */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -top-10 -left-2 sm:left-2 text-[140px] sm:text-[200px] font-black leading-none tracking-tighter text-primary/[0.04] dark:text-primary/[0.06]"
        style={{
          transform: `translateY(${(1 - focus) * -20}px)`,
          transition: 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Indicador lateral de foco com gradiente */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[2px] bg-border/60 overflow-hidden rounded-full"
      >
        <span
          className="block w-full rounded-full transition-all duration-700 ease-out"
          style={{
            height: isFocused ? '100%' : '0%',
            opacity: isFocused ? 1 : 0,
            background: 'linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--primary) / 0.3))',
            boxShadow: isFocused ? '0 0 12px hsl(var(--primary) / 0.5)' : 'none',
          }}
        />
      </span>
      <motion.div
        className="flex items-baseline gap-3 relative"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <span className="text-[10px] font-mono tracking-widest text-primary/70 uppercase">
          {String(index + 1).padStart(2, '0')} <span className="text-muted-foreground/50">/ {String(total).padStart(2, '0')}</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
          {label}
        </h2>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* key força remount dos gráficos sempre que a seção volta à viewport,
            disparando novamente as animações de entrada do Recharts */}
        <div key={replayKey}>
          {hasEntered ? (
            <Suspense fallback={<div className="min-h-[300px] animate-pulse rounded-lg bg-muted/30" aria-hidden />}>
              {children}
            </Suspense>
          ) : (
            <div className="min-h-[300px]" aria-hidden />
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}

const tabs: { id: DashboardTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'supervisao', label: 'Supervisão' },
  { id: 'analise', label: 'Análise' },
  { id: 'admin', label: 'Admin' },
];

const tabComponents: Record<DashboardTab, React.FC> = {
  resumo: TabResumo,
  kpis: TabKPIs,
  produtos: TabProdutos,
  ranking: TabRanking,
  graficos: TabGraficos,
  supervisao: TabSupervisao,
  analise: TabAnalise,
  admin: TabAdmin,
};

export default function Dashboard() {
  const { activeTab, setActiveTab, isLoadingFromDB, loadingProgress, reloadFromDatabase, userInfo } = useFilters();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { dark, toggle: toggleTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [filtersHidden, setFiltersHidden] = useState(false);

  // Controle de acesso por perfil
  const perfil = userInfo?.perfil;
  const isAdmin = perfil === 'administrador';
  const isSupervisor = perfil === 'supervisor';
  const canImport = isAdmin;

  // Filtra abas visíveis conforme perfil
  const visibleTabs = tabs.filter(t => {
    if (t.id === 'admin') return isAdmin;
    // Supervisão e Análise: liberadas para Admin e Supervisor; ocultas para vendedores/consultores
    if (t.id === 'supervisao') return isAdmin || isSupervisor;
    if (t.id === 'analise') return isAdmin || isSupervisor;
    return true;
  });

  // Se a aba ativa não é mais permitida (mudou perfil ou tentou via URL), volta pro resumo
  useEffect(() => {
    if (!userInfo) return;
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab('resumo');
    }
  }, [userInfo, activeTab, visibleTabs, setActiveTab]);

  const ActiveComponent = tabComponents[activeTab];

  useEffect(() => {
    if (!presentationMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPresentationMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentationMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reloadFromDatabase();
    setIsRefreshing(false);
  };

  const handleTabChange = (id: DashboardTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro no signOut:', err);
    }
    // Limpa localStorage de metas e filtros (defensivo)
    try {
      localStorage.removeItem('technet-monthly-goals');
    } catch {}
    navigate('/', { replace: true });
  };

  if (isLoadingFromDB) {
    return <LoadingScreen loadingProgress={loadingProgress} />;
  }

  if (presentationMode) {
    const presentationTabs: DashboardTab[] = ['resumo', 'kpis', 'produtos', 'ranking', 'graficos'];
    return (
      <div className="min-h-screen bg-surface relative overflow-x-hidden">
        {/* Animated background orbs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30 dark:opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)',
              animation: 'orb-float-1 18s ease-in-out infinite',
            }}
          />
          <div
            className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full opacity-25 dark:opacity-15 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(217 91% 60% / 0.4), transparent 70%)',
              animation: 'orb-float-2 22s ease-in-out infinite',
            }}
          />
          <div
            className="absolute bottom-0 left-1/3 h-[450px] w-[450px] rounded-full opacity-20 dark:opacity-15 blur-3xl"
            style={{
              background: 'radial-gradient(circle, hsl(271 91% 65% / 0.35), transparent 70%)',
              animation: 'orb-float-3 26s ease-in-out infinite',
            }}
          />
        </div>

        {/* Scroll progress bar no topo */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] z-[90] origin-left"
          style={{
            background: 'linear-gradient(to right, hsl(var(--primary)), hsl(217 91% 60%), hsl(271 91% 65%))',
            scaleX: 0,
          }}
          ref={(el) => {
            if (!el) return;
            const update = () => {
              const scrollTop = window.scrollY;
              const docH = document.documentElement.scrollHeight - window.innerHeight;
              const p = docH > 0 ? scrollTop / docH : 0;
              el.style.transform = `scaleX(${p})`;
            };
            update();
            window.addEventListener('scroll', update, { passive: true });
          }}
        />

        {/* Header sticky minimalista com filtros recolhíveis */}
        <div className="fixed top-0 left-0 right-0 z-[80] bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="px-3 sm:px-6 h-11 flex items-center gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <motion.div
                className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                animate={{ boxShadow: ['0 0 0px hsl(var(--primary) / 0.4)', '0 0 16px hsl(var(--primary) / 0.6)', '0 0 0px hsl(var(--primary) / 0.4)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap className="h-3 w-3 text-primary-foreground" />
              </motion.div>
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase hidden sm:inline">
                Apresentação
              </span>
            </div>

            {/* Compact filters inline (only when not hidden) */}
            {!filtersHidden && (
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
                <FilterBar compact />
              </div>
            )}
            {filtersHidden && <div className="flex-1" />}

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFiltersHidden(v => !v)}
                title={filtersHidden ? 'Mostrar filtros' : 'Ocultar filtros'}
              >
                {filtersHidden ? <Filter className="h-3.5 w-3.5" /> : <FilterX className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPresentationMode(false)}
                className="h-7 gap-1 text-xs"
                title="Sair (Esc)"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        <main className="relative z-10 px-3 sm:px-6 md:px-10 pt-20 pb-8 space-y-20 max-w-[1600px] mx-auto">
          {presentationTabs.map((id, idx) => {
            const Comp = tabComponents[id];
            const label = tabs.find(t => t.id === id)?.label || id;
            return (
              <PresentationSection key={id} index={idx} label={label} total={presentationTabs.length}>
                <Comp />
              </PresentationSection>
            );
          })}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">TechNET</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Comercial</p>
            </div>
            {userInfo && (
              <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-border min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {(userInfo.nome_vinculado || userInfo.email || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="leading-tight min-w-0 max-w-[340px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {userInfo.nome_vinculado || userInfo.email}
                    </p>
                    <span className="shrink-0 text-[9px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                      {userInfo.perfil}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {userInfo.email}
                    {userInfo.perfil === 'supervisor' && userInfo.nome_supervisor_vinculado && (
                      <span className="ml-1">· Equipe: <span className="text-foreground/80">{userInfo.nome_supervisor_vinculado.split('||').map(s=>s.trim()).filter(Boolean).join(', ')}</span></span>
                    )}
                    {(userInfo.perfil === 'vendedor' || userInfo.perfil === 'consultor') && userInfo.nome_vendedor_vinculado && (
                      <span className="ml-1">· Vínculo: <span className="text-foreground/80">{userInfo.nome_vendedor_vinculado}</span></span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs hidden sm:inline-flex" onClick={() => setPresentationMode(true)} title="Modo apresentação">
              <Play className="h-3.5 w-3.5" />
              Apresentar
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setPresentationMode(true)} title="Modo apresentação">
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs hidden sm:inline-flex"
              onClick={() => setFiltersHidden(v => !v)}
              title={filtersHidden ? 'Mostrar filtros' : 'Ocultar filtros'}
            >
              {filtersHidden ? <Filter className="h-3.5 w-3.5" /> : <FilterX className="h-3.5 w-3.5" />}
              {filtersHidden ? 'Mostrar filtros' : 'Ocultar filtros'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:hidden"
              onClick={() => setFiltersHidden(v => !v)}
              title={filtersHidden ? 'Mostrar filtros' : 'Ocultar filtros'}
            >
              {filtersHidden ? <Filter className="h-3.5 w-3.5" /> : <FilterX className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {canImport && (
              <>
                <Button variant="outline" size="sm" className="gap-2 hidden sm:inline-flex" onClick={() => setImportOpen(true)}>
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Importar XLSX</span>
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setImportOpen(true)}>
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hidden sm:inline-flex">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 sm:hidden text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="bg-card border-b border-border px-3 sm:px-6 hidden md:block">
        <nav className="flex gap-1 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Tab Bar */}
      <div className="bg-card border-b border-border px-3 md:hidden">
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Menu className="h-4 w-4" />
            {visibleTabs.find(t => t.id === activeTab)?.label}
          </button>
          <span className="text-xs text-muted-foreground">
            {visibleTabs.findIndex(t => t.id === activeTab) + 1}/{visibleTabs.length}
          </span>
        </div>
        {/* Scrollable pill tabs for quick access */}
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Navegação</SheetTitle>
          </SheetHeader>
          <nav className="p-2">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Filters */}
      {!filtersHidden && <FilterBar />}

      {/* Import Dialog */}
      {importOpen && (
        <Suspense fallback={null}>
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </Suspense>
      )}

      {/* Content */}
      <main className="p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Suspense fallback={
              <div className="space-y-4">
                <div className="h-24 rounded-lg bg-muted/30 animate-pulse" />
                <div className="h-64 rounded-lg bg-muted/30 animate-pulse" />
              </div>
            }>
              <ActiveComponent />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <MetaReminderDialog onFillNow={() => setActiveTab('admin')} />
    </div>
  );
}
