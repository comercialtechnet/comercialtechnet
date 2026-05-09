import { MonthlyGoal } from './types';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export type Empresa = 'RDT' | 'VNA';
export const EMPRESAS: Empresa[] = ['RDT', 'VNA'];

export const DEFAULT_META_FATURAMENTO = 60000;
export const DEFAULT_META_VIRTUA = 300;

// No initial goals — everything comes from the database
export const INITIAL_MONTHLY_GOALS: Record<string, MonthlyGoal> = {};

export interface AggregatedMonthlyGoal {
  meta_faturamento: number;
  meta_faturamento_supervisor: number;
  meta_vendas_virtua: number;
  meta_vendas_virtua_supervisor: number;
}

const EMPTY_AGG: AggregatedMonthlyGoal = {
  meta_faturamento: 0,
  meta_faturamento_supervisor: 0,
  meta_vendas_virtua: 0,
  meta_vendas_virtua_supervisor: 0,
};

/** Returns a goal key in the form `YYYY-MM-EMPRESA`. */
export function generateGoalKey(year: number, month: number, empresa: Empresa): string {
  return `${year}-${String(month).padStart(2, '0')}-${empresa}`;
}

/** Parses `YYYY-MM-EMPRESA` into its parts. Returns null when malformed. */
export function parseGoalKey(key: string): { year: number; month: number; empresa: Empresa; monthKey: string } | null {
  const m = key.match(/^(\d{4})-(\d{2})-(RDT|VNA)$/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    empresa: m[3] as Empresa,
    monthKey: `${m[1]}-${m[2]}`,
  };
}

function getMonthKeyFromDate(dataInicio: string): string | null {
  const date = new Date(dataInicio + 'T00:00:00');
  if (isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Aggregates RDT + VNA goals for the month containing `dataInicio`.
 * Returns zeroes when the date is missing or no goals exist.
 */
export function getMonthlyGoalFromStore(goals: Record<string, MonthlyGoal>, dataInicio?: string): AggregatedMonthlyGoal {
  if (!dataInicio) return EMPTY_AGG;
  const monthKey = getMonthKeyFromDate(dataInicio);
  if (!monthKey) return EMPTY_AGG;

  const agg: AggregatedMonthlyGoal = { ...EMPTY_AGG };
  for (const empresa of EMPRESAS) {
    const g = goals[`${monthKey}-${empresa}`];
    if (!g) continue;
    agg.meta_faturamento += Number(g.meta_faturamento) || 0;
    agg.meta_faturamento_supervisor += Number(g.meta_faturamento_supervisor) || 0;
    agg.meta_vendas_virtua += Number(g.meta_vendas_virtua) || 0;
    agg.meta_vendas_virtua_supervisor += Number(g.meta_vendas_virtua_supervisor) || 0;
  }
  return agg;
}

/** Returns which empresas (RDT/VNA) are missing a goal for the given month. */
export function getMissingEmpresasForMonth(goals: Record<string, MonthlyGoal>, year: number, month: number): Empresa[] {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return EMPRESAS.filter(empresa => {
    const g = goals[`${monthKey}-${empresa}`];
    return !g || (
      (Number(g.meta_faturamento) || 0) === 0 &&
      (Number(g.meta_vendas_virtua) || 0) === 0
    );
  });
}

export function formatPeriodLabel(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  return `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`;
}

export function formatMonthKey(key: string): string {
  // Accepts both `YYYY-MM` and `YYYY-MM-EMPRESA` keys.
  const parts = key.split('-');
  const [year, month] = parts;
  const empresa = parts[2];
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  const base = `${MONTH_NAMES[idx]}/${year}`;
  return empresa ? `${base} · ${empresa}` : base;
}

export function getDefaultComparisonDates(dataInicio: string, dataFim: string): { compDataInicio: string; compDataFim: string } {
  if (!dataInicio) return { compDataInicio: '', compDataFim: '' };
  const start = new Date(dataInicio + 'T00:00:00');
  const end = new Date((dataFim || dataInicio) + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { compDataInicio: '', compDataFim: '' };

  // Same day-of-month, one month earlier. Clamp to last day of previous month if needed.
  const shift = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth() - 1;
    const day = d.getDate();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const safeDay = Math.min(day, lastDay);
    const result = new Date(y, m, safeDay);
    const yy = result.getFullYear();
    const mm = String(result.getMonth() + 1).padStart(2, '0');
    const dd = String(result.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  return {
    compDataInicio: shift(start),
    compDataFim: shift(end),
  };
}

export function generateMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
