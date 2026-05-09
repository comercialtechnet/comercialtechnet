/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { DashboardFilters, DashboardTab, Venda, ItemVenda, MonthlyGoal } from './types';
import { getDefaultComparisonDates, INITIAL_MONTHLY_GOALS } from './monthly-goals';
import { loadVendasFromDatabase, loadMetasFromDatabase } from './db-service';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';

type ProfileWithBindings = {
  perfil: string | null;
  nome_vinculado?: string | null;
  nome_supervisor_vinculado?: string | null;
  nome_vendedor_vinculado?: string | null;
};

function getCurrentMonthDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { dataInicio: toInputDate(start), dataFim: toInputDate(end) };
}

function buildDefaultFilters(): DashboardFilters {
  const { dataInicio, dataFim } = getCurrentMonthDateRange();
  return {
    dataInicio,
    dataFim,
    vendedor: [],
    supervisor: [],
    categoriaPrincipal: '',
    subcategoria: '',
    tipoVenda: [],
    tipoCliente: '',
    formaPagamento: '',
    tipoFiltro: [],
    empresa: [],
    busca: '',
    compDataInicio: '',
    compDataFim: '',
  };
}

const defaultFilters: DashboardFilters = buildDefaultFilters();

const emptyFiltersBase: Omit<DashboardFilters, 'dataInicio' | 'dataFim'> = {
  vendedor: [],
  supervisor: [],
  categoriaPrincipal: '',
  subcategoria: '',
  tipoVenda: [],
  tipoCliente: '',
  formaPagamento: '',
  tipoFiltro: [],
  empresa: [],
  busca: '',
  compDataInicio: '',
  compDataFim: '',
};

export interface ImportedData {
  vendas: Venda[];
  itens: ItemVenda[];
  nomeArquivo: string;
  totalLinhas: number;
  erros: string[];
}

export interface UserInfo {
  perfil: string;
  nome_vinculado: string;
  email: string;
  nome_supervisor_vinculado: string | null;
  nome_vendedor_vinculado: string | null;
}

interface FiltersContextType {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  importedData: ImportedData | null;
  setImportedData: (data: ImportedData | null) => void;
  isUsingImportedData: boolean;
  monthlyGoals: Record<string, MonthlyGoal>;
  setMonthlyGoals: React.Dispatch<React.SetStateAction<Record<string, MonthlyGoal>>>;
  isLoadingFromDB: boolean;
  loadingProgress: { step: string; percent: number };
  reloadFromDatabase: () => Promise<boolean>;
  userInfo: UserInfo | null;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(() => buildDefaultFilters());
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumo');
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ step: 'Conectando...', percent: 0 });
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, MonthlyGoal>>(() => {
    try {
      const saved = localStorage.getItem('technet-monthly-goals');
      return saved ? JSON.parse(saved) : { ...INITIAL_MONTHLY_GOALS };
    } catch {
      return { ...INITIAL_MONTHLY_GOALS };
    }
  });
  const compManualRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const reloadFromDatabase = useCallback(async (): Promise<boolean> => {
    setIsLoadingFromDB(true);
    setLoadingProgress({ step: 'Conectando...', percent: 5 });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        console.warn('[Carga] Nenhuma sessão ativa encontrada; dados do dashboard não serão carregados agora.');
        setImportedData(null);
        // NÃO marcar como carregado — esperar o SIGNED_IN
        return false;
      }

      setLoadingProgress({ step: 'Carregando perfil...', percent: 15 });

      // Carregar perfil do usuário primeiro (sequencial para evitar Token Refresh Collision + necessário para o Filtro do Servidor)
      const { data: profile } = await supabase
        .from('profiles')
        .select('perfil, nome_vinculado, nome_supervisor_vinculado, nome_vendedor_vinculado')
        .eq('id', session.user.id)
        .single();
        
      const typedProfile = profile as ProfileWithBindings | null;
      if (!typedProfile) {
        console.error('[Carga] Perfil do usuário não encontrado ou sem permissão de leitura.', { userId: session.user.id });
      }
      const userProfile = typedProfile ? {
        perfil: typedProfile.perfil || 'vendedor',
        nome_vinculado: typedProfile.nome_vinculado || session.user.email,
        email: session.user.email || '',
        nome_supervisor_vinculado: typedProfile.nome_supervisor_vinculado || null,
        nome_vendedor_vinculado: typedProfile.nome_vendedor_vinculado || null,
      } : null;

      if (userProfile) {
        setUserInfo(userProfile);
      }

      setLoadingProgress({ step: 'Buscando vendas e metas...', percent: 35 });

      // Agora busca os dados E as metas com Filtro Aplicado direto no Banco de Dados
      const [dbData, dbMetas] = await Promise.all([
        loadVendasFromDatabase(userProfile, (step, percent) => setLoadingProgress({ step, percent })),
        loadMetasFromDatabase(),
      ]);

      setLoadingProgress({ step: 'Montando dashboard...', percent: 90 });

      if (dbData && dbData.vendas.length > 0) {
        const loadedDates = dbData.vendas.map(v => v.data_instalacao).filter(Boolean).sort();
        console.info('[Carga] Dados aplicados ao dashboard', {
          vendas: dbData.vendas.length,
          itens: dbData.itens.length,
          primeiraData: loadedDates[0] ?? null,
          ultimaData: loadedDates[loadedDates.length - 1] ?? null,
          perfil: userProfile?.perfil ?? null,
        });
        setImportedData({
          vendas: dbData.vendas,
          itens: dbData.itens,
          nomeArquivo: 'Banco de dados',
          totalLinhas: dbData.vendas.length,
          erros: [],
        });

        setFilters(prev => ({
          ...prev,
          dataInicio: prev.dataInicio || defaultFilters.dataInicio,
          dataFim: prev.dataFim || defaultFilters.dataFim,
        }));
      } else {
        console.warn('[Carga] Nenhuma venda retornou do banco para o perfil atual.', { perfil: userProfile?.perfil ?? null, userProfile });
        setImportedData(null);
        setFilters(prev => ({
          ...prev,
          ...emptyFiltersBase,
          dataInicio: prev.dataInicio || defaultFilters.dataInicio,
          dataFim: prev.dataFim || defaultFilters.dataFim,
        }));
      }

      if (Object.keys(dbMetas).length > 0) {
        setMonthlyGoals(dbMetas);
      }

      setLoadingProgress({ step: 'Pronto!', percent: 100 });
      return true;
    } catch (err) {
      console.error('[Carga] Erro crítico ao carregar dados do banco', err);
      // Use standard alert since sonner is not imported
      alert('Erro crítico ao carregar dados do banco: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    } finally {
      setIsLoadingFromDB(false);
    }
  }, []);

  // Esperar sessão estar pronta antes de carregar dados
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id || null;
        // Recarregar se nunca carregou OU se mudou de usuário
        if (!hasLoadedRef.current || currentUserIdRef.current !== newUserId) {
          hasLoadedRef.current = true;
          currentUserIdRef.current = newUserId;
          // Limpar estado da sessão anterior antes de recarregar
          setImportedData(null);
          setUserInfo(null);
          setFilters(buildDefaultFilters());
          setActiveTab('resumo');
          void reloadFromDatabase();
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Token só refresca; não recarregar
      } else if (event === 'SIGNED_OUT') {
        hasLoadedRef.current = false;
        currentUserIdRef.current = null;
        setImportedData(null);
        setUserInfo(null);
        setFilters(buildDefaultFilters());
        setActiveTab('resumo');
        setIsLoadingFromDB(false);
      }
    });

    // Tentar carregar imediatamente (sessão pode já existir no localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        hasLoadedRef.current = true;
        void reloadFromDatabase();
      } else {
        setIsLoadingFromDB(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reloadFromDatabase]);

  // Persist goals to localStorage as fallback
  useEffect(() => {
    localStorage.setItem('technet-monthly-goals', JSON.stringify(monthlyGoals));
  }, [monthlyGoals]);

  // Auto-set comparison dates when main dates change
  useEffect(() => {
    // Only auto-update comparison dates if user already enabled comparison
    // AND has not made a manual edit. Comparison is OFF by default.
    if (compManualRef.current) return;
    if (!filters.compDataInicio && !filters.compDataFim) return; // disabled
    if (!filters.dataInicio) return;
    const { compDataInicio, compDataFim } = getDefaultComparisonDates(filters.dataInicio, filters.dataFim);
    setFilters(prev => {
      if (prev.compDataInicio === compDataInicio && prev.compDataFim === compDataFim) return prev;
      return { ...prev, compDataInicio, compDataFim };
    });
  }, [filters.dataInicio, filters.dataFim]);

  const resetFilters = () => {
    compManualRef.current = false;
    setFilters(buildDefaultFilters());
  };

  const wrappedSetFilters: React.Dispatch<React.SetStateAction<DashboardFilters>> = (action) => {
    setFilters(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.compDataInicio !== prev.compDataInicio || next.compDataFim !== prev.compDataFim) {
        const auto = getDefaultComparisonDates(next.dataInicio, next.dataFim);
        const isCleared = !next.compDataInicio && !next.compDataFim;
        const matchesAuto = next.compDataInicio === auto.compDataInicio && next.compDataFim === auto.compDataFim;
        if (isCleared || matchesAuto) {
          // turning off OR resetting to auto = back to automatic mode
          compManualRef.current = false;
        } else {
          // user-edited custom comparison range
          compManualRef.current = true;
        }
      }
      return next;
    });
  };

  return (
    <FiltersContext.Provider value={{
      filters, setFilters: wrappedSetFilters, resetFilters,
      activeTab, setActiveTab,
      importedData, setImportedData,
      isUsingImportedData: importedData !== null,
      monthlyGoals, setMonthlyGoals,
      isLoadingFromDB,
      loadingProgress,
      reloadFromDatabase,
      userInfo,
    }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}
