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

const defaultFilters: DashboardFilters = {
  dataInicio: '',
  dataFim: '',
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

function normalizeDateForInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const m = iso[2].padStart(2, '0');
    const d = iso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = br[1].padStart(2, '0');
    const m = br[2].padStart(2, '0');
    const y = br[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
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

  const reloadFromDatabase = useCallback(async (): Promise<boolean> => {
    setIsLoadingFromDB(true);
    setLoadingProgress({ step: 'Conectando...', percent: 5 });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
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
        setImportedData({
          vendas: dbData.vendas,
          itens: dbData.itens,
          nomeArquivo: 'Banco de dados',
          totalLinhas: dbData.vendas.length,
          erros: [],
        });

        const dates = dbData.vendas
          .map(v => normalizeDateForInput(v.data_instalacao))
          .filter((d): d is string => Boolean(d))
          .sort();
        const now = new Date();
        const latestDate = dates.length > 0 ? dates[dates.length - 1] : now.toISOString().slice(0, 10);
        const earliestDate = dates.length > 0 ? dates[0] : latestDate;

        setFilters(prev => ({
          ...prev,
          dataInicio: earliestDate,
          dataFim: latestDate,
        }));
      } else {
        setImportedData(null);
      }

      if (Object.keys(dbMetas).length > 0) {
        setMonthlyGoals(dbMetas);
      }

      setLoadingProgress({ step: 'Pronto!', percent: 100 });
      return true;
    } catch (err) {
      console.warn('Não foi possível carregar dados do banco:', err);
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
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Sempre recarregar no SIGNED_IN (sessão pode ter sido restaurada após o primeiro try falhar)
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          void reloadFromDatabase();
        }
      } else if (event === 'SIGNED_OUT') {
        hasLoadedRef.current = false;
        setImportedData(null);
        setUserInfo(null);
        setFilters(defaultFilters);
        setActiveTab('resumo');
        setIsLoadingFromDB(false);
      }
    });

    // Tentar carregar imediatamente (sessão pode já existir no localStorage)
    void reloadFromDatabase().then((success) => {
      if (success) hasLoadedRef.current = true;
      // Se falhou (sem sessão), NÃO marcar — deixar o SIGNED_IN lidar
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
    if (compManualRef.current) {
      compManualRef.current = false;
      return;
    }
    if (filters.dataInicio) {
      const { compDataInicio, compDataFim } = getDefaultComparisonDates(filters.dataInicio, filters.dataFim);
      setFilters(prev => {
        if (prev.compDataInicio === compDataInicio && prev.compDataFim === compDataFim) return prev;
        return { ...prev, compDataInicio, compDataFim };
      });
    }
  }, [filters.dataInicio, filters.dataFim]);

  const resetFilters = () => {
    compManualRef.current = false;
    setFilters(defaultFilters);
  };

  const wrappedSetFilters: React.Dispatch<React.SetStateAction<DashboardFilters>> = (action) => {
    setFilters(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.compDataInicio !== prev.compDataInicio || next.compDataFim !== prev.compDataFim) {
        const auto = getDefaultComparisonDates(next.dataInicio, next.dataFim);
        if (next.compDataInicio !== auto.compDataInicio || next.compDataFim !== auto.compDataFim) {
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
