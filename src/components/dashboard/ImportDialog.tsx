import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/lib/filters-context';
import { parseXLSX, ParseResult } from '@/lib/xlsx-parser';
import { saveImportToDatabase } from '@/lib/db-service';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { setImportedData, resetFilters, reloadFromDatabase } = useFilters();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Formato inválido. Envie um arquivo .xlsx ou .xls');
      return;
    }
    setError(null);
    setResult(null);
    setParsing(true);
    try {
      const parsed = await parseXLSX(file);
      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const response = await saveImportToDatabase(
        result.vendas,
        result.itens,
        result.nomeArquivo,
        result.totalLinhas,
        result.erros.length
      );

      await reloadFromDatabase();

      if (response.totalInseridas > 0 && response.totalDuplicadas > 0) {
        toast.success(`${response.totalInseridas} vendas novas salvas. ${response.totalDuplicadas} já existiam no banco.`);
      } else if (response.totalInseridas > 0) {
        toast.success(`${response.totalInseridas} vendas salvas no banco de dados!`);
      } else if (response.totalDuplicadas > 0) {
        toast.info(`Nenhuma venda nova enviada. ${response.totalDuplicadas} registro(s) deste arquivo já existiam no banco.`);
      } else {
        toast.warning('Nenhuma venda válida foi encontrada para importar.');
      }
    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
      const message = err instanceof Error ? err.message : 'Erro ao salvar no banco';
      toast.error(message === 'Usuário não autenticado'
        ? 'Faça login antes de importar para enviar os dados ao banco.'
        : 'Erro ao salvar no banco. Dados serão usados apenas na sessão.');
      setImportedData({
        vendas: result.vendas,
        itens: result.itens,
        nomeArquivo: result.nomeArquivo,
        totalLinhas: result.totalLinhas,
        erros: result.erros,
      });
    }
    resetFilters();
    setSaving(false);
    onOpenChange(false);
    setResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
    setError(null);
  };

  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Planilha XLSX
          </DialogTitle>
          <DialogDescription>Carregue um arquivo .xlsx com as abas de vendas para gerar o relatório</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando planilha...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Arraste o arquivo ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos aceitos: .xlsx, .xls
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result preview */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.nomeArquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.totalLinhas} linhas • Abas: {result.sheets.map(s => `${s.name} (${s.rows})`).join(', ')}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 shrink-0" onClick={() => setResult(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{result.vendas.length}</p>
                    <p className="text-[10px] text-muted-foreground">Vendas</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{result.itens.length}</p>
                    <p className="text-[10px] text-muted-foreground">Itens</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-primary tabular-nums">
                      {fmt(result.vendas.reduce((s, v) => s + v.valor_total, 0))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Faturamento</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {new Set(result.vendas.map(v => v.vendedor_normalizado)).size}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Vendedores</p>
                  </div>
                </div>

                {result.erros.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs font-medium text-yellow-600 mb-1">
                      {result.erros.length} aviso(s)
                    </p>
                    <div className="max-h-20 overflow-y-auto space-y-0.5">
                      {result.erros.slice(0, 10).map((e, i) => (
                        <p key={i} className="text-[10px] text-yellow-700">{e}</p>
                      ))}
                      {result.erros.length > 10 && (
                        <p className="text-[10px] text-yellow-600 font-medium">
                          +{result.erros.length - 10} outros avisos
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setResult(null)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button className="flex-1 gap-1" onClick={handleConfirm} disabled={result.vendas.length === 0 || saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Database className="h-3.5 w-3.5" />
                        Importar e Salvar
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-muted-foreground text-center">
            Colunas esperadas: IdVenda, Proposta, Contrato, Cliente, Vendedor, Supervisor, Produtos, ValorTotal, DataInstalacao, TipoVenda, FormaPagamento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
