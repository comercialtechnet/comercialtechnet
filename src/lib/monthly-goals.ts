import { MonthlyGoal } from './types';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// No initial goals — everything comes from the database
export const INITIAL_MONTHLY_GOALS: Record<string, MonthlyGoal> = {};

const DEFAULT_GOAL: MonthlyGoal = {
  meta_faturamento: 0,
  meta_total_vendas: 0,
  meta_vendas_virtua: 0,
};

export function getMonthlyGoalFromStore(goals: Record<string, MonthlyGoal>, dataInicio?: string): MonthlyGoal {
  if (!dataInicio) return DEFAULT_GOAL;
  const date = new Date(dataInicio + 'T00:00:00');
  if (isNaN(date.getTime())) return DEFAULT_GOAL;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return goals[key] || DEFAULT_GOAL;
}

/** @deprecated Use getMonthlyGoalFromStore with context goals */
export function getMonthlyGoal(dataInicio?: string): MonthlyGoal {
  return getMonthlyGoalFromStore(INITIAL_MONTHLY_GOALS, dataInicio);
}

export function formatPeriodLabel(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  return `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`;
}

export function formatMonthKey(key: string): string {
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES[idx]}/${year}`;
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
