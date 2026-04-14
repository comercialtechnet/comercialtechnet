import { useState, useMemo } from 'react';
import { useFilteredData } from '@/lib/use-filtered-data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Search, ChevronLeft, ChevronRight, Eye, Filter } from 'lucide-react';
import { Venda } from '@/lib/types';
import { mockItens } from '@/lib/mock-data';
import { useIsMobile } from '@/hooks/use-mobile';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 20;

function VendaDetail({ venda }: { venda: Venda }) {
  const vendaItens = mockItens.filter(it => it.venda_id === venda.id_venda);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          ['Proposta', venda.proposta],
          ['Contrato', venda.contrato],
          ['Cliente', venda.cliente],
          ['Tipo Cliente', venda.tipo_cliente],
          ['Vendedor', venda.vendedor],
          ['Supervisor', venda.supervisor],
          ['Data Instalação', venda.data_instalacao],
          ['Valor Total', fmt(venda.valor_total)],
          ['Tipo Venda', venda.tipo_venda],
          ['Forma Pagamento', venda.forma_pagamento],
          ['Tipo Combo', venda.combo_tipo],
          ['Qtd Itens', String(venda.quantidade_itens)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground text-sm">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Produtos Brutos</p>
        <p className="text-xs font-mono bg-surface rounded p-2 text-foreground break-all">{venda.produtos_brutos}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Itens Parseados</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {vendaItens.map(it => (
                <tr key={it.id}>
                  <td className="text-xs">{it.ordem_item}</td>
                  <td className="text-xs">{it.descricao_original}</td>
                  <td className="text-xs">{it.categoria_principal}</td>
                  <td className="text-xs">{it.subcategoria}</td>
                  <td className="text-xs font-semibold">{fmt(it.valor_item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ColFilters {
  data: string;
  contrato: string;
  cliente: string;
  vendedor: string;
  supervisor: string;
  tipo: string;
}

const emptyColFilters: ColFilters = { data: '', contrato: '', cliente: '', vendedor: '', supervisor: '', tipo: '' };

export function TabAnalise() {
  const { filteredVendas } = useFilteredData();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<ColFilters>(emptyColFilters);
  const isMobile = useIsMobile();

  const hasColFilters = Object.values(colFilters).some(v => v.length > 0);

  const searched = useMemo(() => {
    let list = filteredVendas;

    // Global search
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(v =>
        v.cliente.toLowerCase().includes(s) ||
        v.vendedor.toLowerCase().includes(s) ||
        v.id_venda.toLowerCase().includes(s) ||
        v.proposta.toLowerCase().includes(s) ||
        v.contrato.toLowerCase().includes(s)
      );
    }

    // Column filters
    if (colFilters.data) {
      const f = colFilters.data.toLowerCase();
      list = list.filter(v => v.data_instalacao.toLowerCase().includes(f));
    }
    if (colFilters.contrato) {
      const f = colFilters.contrato.toLowerCase();
      list = list.filter(v => v.contrato.toLowerCase().includes(f));
    }
    if (colFilters.cliente) {
      const f = colFilters.cliente.toLowerCase();
      list = list.filter(v => v.cliente.toLowerCase().includes(f));
    }
    if (colFilters.vendedor) {
      const f = colFilters.vendedor.toLowerCase();
      list = list.filter(v => v.vendedor.toLowerCase().includes(f));
    }
    if (colFilters.supervisor) {
      const f = colFilters.supervisor.toLowerCase();
      list = list.filter(v => v.supervisor.toLowerCase().includes(f));
    }
    if (colFilters.tipo) {
      const f = colFilters.tipo.toLowerCase();
      list = list.filter(v => v.tipo_venda.toLowerCase().includes(f));
    }

    return list;
  }, [filteredVendas, search, colFilters]);

  const totalPages = Math.ceil(searched.length / PAGE_SIZE);
  const paged = searched.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updateColFilter = (key: keyof ColFilters, value: string) => {
    setColFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Análise Detalhada</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{searched.length} registros encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." className="h-8 w-full sm:w-64 text-xs pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Button
            variant={showColFilters ? "secondary" : "outline"}
            size="sm"
            className="h-8 gap-1 text-xs shrink-0"
            onClick={() => setShowColFilters(!showColFilters)}
          >
            <Filter className="h-3 w-3" />
            <span className="hidden sm:inline">Colunas</span>
            {hasColFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </Button>
          {hasColFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setColFilters(emptyColFilters)}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {paged.map(v => (
          <div key={v.id} className="bg-card rounded-lg border border-border p-3" onClick={() => setSelectedVenda(v)}>
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{v.cliente}</p>
                <p className="text-[10px] text-muted-foreground">{v.data_instalacao} · {v.vendedor}</p>
                {v.contrato && <p className="text-[10px] text-muted-foreground">Contrato: {v.contrato}</p>}
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums shrink-0 ml-2">{fmt(v.valor_total)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`status-badge text-[10px] ${v.tipo_venda === 'NOVA' ? 'status-approved' : 'status-pending'}`}>{v.tipo_venda}</span>
              <span className={`status-badge text-[10px] ${v.e_combo ? 'status-approved' : 'bg-surface text-foreground border border-border'}`}>{v.e_combo ? 'Combo' : 'Single'}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{v.quantidade_itens} itens</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>ID Venda</th>
              <th>Contrato</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Supervisor</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Itens</th>
              <th>Combo</th>
              <th></th>
            </tr>
            {showColFilters && (
              <tr className="bg-surface/50">
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Data..." value={colFilters.data} onChange={e => updateColFilter('data', e.target.value)} /></th>
                <th className="p-1"></th>
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Contrato..." value={colFilters.contrato} onChange={e => updateColFilter('contrato', e.target.value)} /></th>
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Cliente..." value={colFilters.cliente} onChange={e => updateColFilter('cliente', e.target.value)} /></th>
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Vendedor..." value={colFilters.vendedor} onChange={e => updateColFilter('vendedor', e.target.value)} /></th>
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Supervisor..." value={colFilters.supervisor} onChange={e => updateColFilter('supervisor', e.target.value)} /></th>
                <th className="p-1"></th>
                <th className="p-1"><Input className="h-6 text-[10px] w-full" placeholder="Tipo..." value={colFilters.tipo} onChange={e => updateColFilter('tipo', e.target.value)} /></th>
                <th className="p-1"></th>
                <th className="p-1"></th>
                <th className="p-1"></th>
              </tr>
            )}
          </thead>
          <tbody>
            {paged.map(v => (
              <tr key={v.id}>
                <td className="text-xs font-mono">{v.data_instalacao}</td>
                <td className="text-xs font-mono">{v.id_venda}</td>
                <td className="text-xs font-mono">{v.contrato}</td>
                <td className="text-xs max-w-32 truncate">{v.cliente}</td>
                <td className="text-xs">{v.vendedor}</td>
                <td className="text-xs">{v.supervisor}</td>
                <td className="text-xs font-semibold">{fmt(v.valor_total)}</td>
                <td><span className={`status-badge ${v.tipo_venda === 'NOVA' ? 'status-approved' : 'status-pending'}`}>{v.tipo_venda}</span></td>
                <td className="text-xs text-center">{v.quantidade_itens}</td>
                <td><span className={`status-badge ${v.e_combo ? 'status-approved' : 'bg-surface text-foreground border border-border'}`}>{v.e_combo ? 'Combo' : 'Single'}</span></td>
                <td>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedVenda(v)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Detail: Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes da Venda {selectedVenda?.id_venda}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto">
              {selectedVenda && <VendaDetail venda={selectedVenda} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Detalhes da Venda {selectedVenda?.id_venda}</DialogTitle>
            </DialogHeader>
            {selectedVenda && <VendaDetail venda={selectedVenda} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
