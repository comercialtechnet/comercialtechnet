import { useState } from 'react';
import { useFilteredData, calcVariation } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { Users, AlertTriangle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 6;

function VariationBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const variation = calcVariation(current, previous);
  if (variation === undefined) return <span className="text-[9px] text-muted-foreground">N/A</span>;
  const isPositive = variation > 0;
  const isZero = variation === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${isZero ? 'text-muted-foreground' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      {isZero ? <Minus className="h-2.5 w-2.5" /> : isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isPositive ? '+' : ''}{variation.toFixed(1)}%
    </span>
  );
}

export function TabSupervisao() {
  const { stats, compStats, hasComparison } = useFilteredData();
  const { userInfo } = useFilters();
  const [page, setPage] = useState(0);

  const isAdmin = userInfo?.perfil === 'administrador';
  const isSupervisor = userInfo?.perfil === 'supervisor';
  const supervisorVinculado = userInfo?.nome_supervisor_vinculado || null;

  // Se é supervisor mas não tem vínculo, mostrar mensagem
  if (isSupervisor && !supervisorVinculado) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Supervisão</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Visão por equipe e supervisor</p>
        </div>
        <div className="bg-card rounded-lg border border-amber-200 dark:border-amber-800 p-6 sm:p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-2">Aguardando vinculação</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Seu perfil de supervisor ainda não foi vinculado a uma equipe na base de dados.
            Solicite ao administrador que faça a vinculação na aba Admin.
          </p>
        </div>
      </div>
    );
  }

  const allSupervisores = Object.entries(stats.porSupervisor)
    .map(([nome, data]) => {
      const vendedoresList = Array.from(data.vendedores)
        .map(v => {
          const vData = stats.porVendedor[v];
          return {
            nome: v,
            faturamento: vData?.faturamento ?? 0,
            vendas: vData?.vendas ?? 0,
            produtos: vData?.produtos ?? 0,
            vendasInternet: vData?.vendasInternet ?? 0,
          };
        })
        .sort((a, b) => b.faturamento - a.faturamento);

      const compData = compStats?.porSupervisor[nome];

      return {
        nome,
        faturamento: data.faturamento,
        vendas: data.vendas,
        produtos: data.produtos,
        vendasInternet: data.vendasInternet,
        vendedores: vendedoresList,
        compFaturamento: compData?.faturamento,
        compVendas: compData?.vendas,
        compProdutos: compData?.produtos,
        compVendasInternet: compData?.vendasInternet,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);

  // Filtrar: se é supervisor com vínculo, mostrar apenas sua equipe
  const supervisores = isSupervisor && supervisorVinculado
    ? allSupervisores.filter(s => s.nome === supervisorVinculado)
    : allSupervisores;

  // Paginação
  const totalPages = Math.ceil(supervisores.length / PAGE_SIZE);
  const pagedSupervisores = supervisores.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Supervisão</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isSupervisor ? `Equipe de ${supervisorVinculado}` : `Visão por equipe e supervisor — ${supervisores.length} supervisores`}
        </p>
      </div>

      {supervisores.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">Nenhum dado de supervisão encontrado para o período selecionado.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {pagedSupervisores.map(sup => (
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
                {hasComparison && sup.compFaturamento !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{fmt(sup.compFaturamento)}</span>
                    <VariationBadge current={sup.faturamento} previous={sup.compFaturamento} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Vendas</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.vendas}</p>
                {hasComparison && sup.compVendas !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compVendas}</span>
                    <VariationBadge current={sup.vendas} previous={sup.compVendas} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Produtos</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.produtos}</p>
                {hasComparison && sup.compProdutos !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compProdutos}</span>
                    <VariationBadge current={sup.produtos} previous={sup.compProdutos} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Virtua</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.vendasInternet}</p>
                {hasComparison && sup.compVendasInternet !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compVendasInternet}</span>
                    <VariationBadge current={sup.vendasInternet} previous={sup.compVendasInternet} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Equipe</p>
              <div className="flex items-center text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
                <span className="flex-1">Vendedor</span>
                <span className="w-20 text-right">Faturam.</span>
                <span className="w-12 text-right">Virtua</span>
                <span className="w-12 text-right">Prod.</span>
              </div>
              <div className="space-y-1">
                {sup.vendedores.map(v => (
                  <div key={v.nome} className="flex items-center text-xs px-0.5">
                    <span className="text-foreground truncate flex-1 mr-2">{v.nome}</span>
                    <span className="text-muted-foreground tabular-nums w-20 text-right shrink-0">{fmt(v.faturamento)}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right shrink-0">{v.vendasInternet}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right shrink-0">{v.produtos}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
