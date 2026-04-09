import { useState } from 'react';
import { Zap, Upload, LogOut, Menu, X, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/lib/filters-context';
import { DashboardTab } from '@/lib/types';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { TabResumo } from '@/components/dashboard/TabResumo';
import { TabKPIs } from '@/components/dashboard/TabKPIs';
import { TabProdutos } from '@/components/dashboard/TabProdutos';
import { TabRanking } from '@/components/dashboard/TabRanking';
import { TabGraficos } from '@/components/dashboard/TabGraficos';
import { TabSupervisao } from '@/components/dashboard/TabSupervisao';
import { TabAnalise } from '@/components/dashboard/TabAnalise';
import { TabAdmin } from '@/components/dashboard/TabAdmin';
import { ImportDialog } from '@/components/dashboard/ImportDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';

const tabs: { id: DashboardTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'supervisao', label: 'Supervisão' },
  { id: 'analise', label: 'Análise' },
  { id: 'admin', label: 'Admin' },
];

const tabComponents: Record<DashboardTab, React.FC> = {
  resumo: TabResumo,
  kpis: TabKPIs,
  produtos: TabProdutos,
  ranking: TabRanking,
  graficos: TabGraficos,
  supervisao: TabSupervisao,
  analise: TabAnalise,
  admin: TabAdmin,
};

export default function Dashboard() {
  const { activeTab, setActiveTab, importedData, setImportedData, isUsingImportedData } = useFilters();
  const navigate = useNavigate();
  const ActiveComponent = tabComponents[activeTab];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleTabChange = (id: DashboardTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">TechNET</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Comercial</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:inline-flex" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Importar XLSX</span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hidden sm:inline-flex">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 sm:hidden text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="bg-card border-b border-border px-3 sm:px-6 hidden md:block">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Tab Bar */}
      <div className="bg-card border-b border-border px-3 md:hidden">
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <Menu className="h-4 w-4" />
            {tabs.find(t => t.id === activeTab)?.label}
          </button>
          <span className="text-xs text-muted-foreground">
            {tabs.findIndex(t => t.id === activeTab) + 1}/{tabs.length}
          </span>
        </div>
        {/* Scrollable pill tabs for quick access */}
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Navegação</SheetTitle>
          </SheetHeader>
          <nav className="p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Import banner */}
      {isUsingImportedData && importedData && (
        <div className="bg-primary/10 border-b border-primary/20 px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary truncate">
              {importedData.nomeArquivo} — {importedData.vendas.length} vendas
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-primary shrink-0" onClick={() => setImportedData(null)}>
            <X className="h-3 w-3 mr-1" /> Remover
          </Button>
        </div>
      )}

      {/* Filters */}
      <FilterBar />

      {/* Import Dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Content */}
      <main className="p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
