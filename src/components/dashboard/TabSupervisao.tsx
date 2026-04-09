import { useFilteredData } from '@/lib/use-filtered-data';
import { Users } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabSupervisao() {
  const { stats } = useFilteredData();

  const supervisores = Object.entries(stats.porSupervisor)
    .map(([nome, data]) => ({
      nome,
      faturamento: data.faturamento,
      vendas: data.vendas,
      produtos: data.produtos,
      combos: data.combos,
      vendedores: Array.from(data.vendedores),
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Supervisão</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visão por equipe e supervisor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {supervisores.map(sup => (
          <div key={sup.nome} className="bg-card rounded-lg border border-border p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">{sup.nome}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{sup.vendedores.length} vendedores</p>
              </div>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Faturamento</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{fmt(sup.faturamento)}</p>
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Vendas</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.vendas}</p>
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Produtos</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.produtos}</p>
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Combos</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.combos}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Equipe</p>
              <div className="space-y-1">
                {sup.vendedores.map(v => {
                  const vData = stats.porVendedor[v];
                  return (
                    <div key={v} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate mr-2">{v}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0">{vData ? fmt(vData.faturamento) : '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
