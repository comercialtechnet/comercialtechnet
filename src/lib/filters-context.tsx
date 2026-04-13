import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { DashboardFilters, DashboardTab, Venda, ItemVenda, MonthlyGoal } from './types';
import { getDefaultComparisonDates, INITIAL_MONTHLY_GOALS } from './monthly-goals';
import { loadVendasFromDatabase, loadMetasFromDatabase } from './db-service';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';

const defaultFilters: DashboardFilters = {
  dataInicio: '',
  dataFim: '',
  vendedor: '',
  supervisor: '',
  categoriaPrincipal: '',
  subcategoria: '',
  tipoVenda: '',
  tipoCliente: '',
  formaPagamento: '',
  tipoFiltro: '',
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
  reloadFromDatabase: () => Promise<void>;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumo');
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true);
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, MonthlyGoal>>(() => {
    try {
      const saved = localStorage.getItem('technet-monthly-goals');
      return saved ? JSON.parse(saved) : { ...INITIAL_MONTHLY_GOALS };
    } catch {
      return { ...INITIAL_MONTHLY_GOALS };
    }
  });
  const compManualRef = useRef(false);

  const reloadFromDatabase = useCallback(async () => {
    setIsLoadingFromDB(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setImportedData(null);
        return;
      }

      const [dbData, dbMetas] = await Promise.all([
        loadVendasFromDatabase(),
        loadMetasFromDatabase(),
      ]);

      if (dbData && dbData.vendas.length > 0) {
        setImportedData({
          vendas: dbData.vendas,
          itens: dbData.itens,
          nomeArquivo: 'Banco de dados',
          totalLinhas: dbData.vendas.length,
          erros: [],
        });

        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const dates = dbData.vendas
          .map(v => v.data_instalacao)
          .filter(Boolean)
          .sort();
        const latestDate = dates.length > 0 ? dates[dates.length - 1] : now.toISOString().slice(0, 10);

        setFilters(prev => ({
          ...prev,
          dataInicio: firstDay,
          dataFim: latestDate,
        }));
      } else {
        setImportedData(null);
      }

      if (Object.keys(dbMetas).length > 0) {
        setMonthlyGoals(dbMetas);
      }
    } catch (err) {
      console.warn('Não foi possível carregar dados do banco:', err);
    } finally {
      setIsLoadingFromDB(false);
    }
  }, []);

  useEffect(() => {
    void reloadFromDatabase();
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
      reloadFromDatabase,
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
