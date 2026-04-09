import { MonthlyGoal } from './types';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Metas mensais iniciais: chave no formato "YYYY-MM"
export const INITIAL_MONTHLY_GOALS: Record<string, MonthlyGoal> = {
  '2025-01': { meta_faturamento: 100000, meta_total_vendas: 200, meta_vendas_virtua: 120 },
  '2025-02': { meta_faturamento: 110000, meta_total_vendas: 220, meta_vendas_virtua: 130 },
  '2025-03': { meta_faturamento: 120000, meta_total_vendas: 250, meta_vendas_virtua: 150 },
  '2025-04': { meta_faturamento: 115000, meta_total_vendas: 230, meta_vendas_virtua: 140 },
  '2025-05': { meta_faturamento: 125000, meta_total_vendas: 260, meta_vendas_virtua: 155 },
  '2025-06': { meta_faturamento: 130000, meta_total_vendas: 270, meta_vendas_virtua: 160 },
  '2025-07': { meta_faturamento: 120000, meta_total_vendas: 240, meta_vendas_virtua: 145 },
  '2025-08': { meta_faturamento: 135000, meta_total_vendas: 280, meta_vendas_virtua: 165 },
  '2025-09': { meta_faturamento: 140000, meta_total_vendas: 290, meta_vendas_virtua: 170 },
  '2025-10': { meta_faturamento: 145000, meta_total_vendas: 300, meta_vendas_virtua: 175 },
  '2025-11': { meta_faturamento: 150000, meta_total_vendas: 310, meta_vendas_virtua: 180 },
  '2025-12': { meta_faturamento: 160000, meta_total_vendas: 330, meta_vendas_virtua: 190 },
  '2026-01': { meta_faturamento: 140000, meta_total_vendas: 280, meta_vendas_virtua: 165 },
  '2026-02': { meta_faturamento: 145000, meta_total_vendas: 290, meta_vendas_virtua: 170 },
  '2026-03': { meta_faturamento: 155000, meta_total_vendas: 310, meta_vendas_virtua: 180 },
  '2026-04': { meta_faturamento: 160000, meta_total_vendas: 320, meta_vendas_virtua: 185 },
};

const DEFAULT_GOAL: MonthlyGoal = {
  meta_faturamento: 120000,
  meta_total_vendas: 250,
  meta_vendas_virtua: 150,
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
