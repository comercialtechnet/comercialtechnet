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
  if (isNaN(start.getTime())) return { compDataInicio: '', compDataFim: '' };

  const prevMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const lastDayPrev = new Date(start.getFullYear(), start.getMonth(), 0);

  return {
    compDataInicio: prevMonth.toISOString().split('T')[0],
    compDataFim: lastDayPrev.toISOString().split('T')[0],
  };
}

export function generateMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
