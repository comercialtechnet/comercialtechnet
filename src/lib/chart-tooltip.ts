/** Estilo padronizado para tooltips de todos os gráficos Recharts */
export const chartTooltip = {
  contentStyle: {
    backgroundColor: '#18181b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#ffffff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    padding: '8px 12px',
  },
  labelStyle: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '12px',
    marginBottom: '4px',
    textTransform: 'none' as const,
  },
  itemStyle: {
    color: '#e4e4e7',
    fontSize: '11px',
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

/** Formata uma string com primeira letra maiúscula e demais minúsculas */
export function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
