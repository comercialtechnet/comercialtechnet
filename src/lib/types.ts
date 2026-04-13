export type UserProfile = 'vendedor' | 'consultor' | 'supervisor' | 'administrador';
export type ApprovalStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface Venda {
  id: string;
  importacao_id: string;
  empresa_venda: string;
  id_venda: string;
  proposta: string;
  contrato: string;
  id_cliente: string;
  cliente: string;
  tipo_cliente: string;
  id_vendedor: string;
  vendedor: string;
  vendedor_normalizado: string;
  valor_total: number;
  tipo_pacote: string;
  tipo_venda: string;
  data_instalacao: string;
  forma_pagamento: string;
  com_tv_original: string;
  produtos_brutos: string;
  supervisor: string;
  supervisor_normalizado: string;
  quantidade_itens: number;
  e_combo: boolean;
  combo_tipo: string;
  possui_internet: boolean;
  possui_tv: boolean;
  possui_movel: boolean;
  possui_telefone: boolean;
  possui_mesh: boolean;
  possui_ponto_extra: boolean;
  possui_mudanca_tecnologia: boolean;
  possui_adicionais: boolean;
  chave_deduplicacao: string;
  data_ultima_importacao: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  ordem_item: number;
  descricao_original: string;
  descricao_normalizada: string;
  valor_item: number;
  categoria_principal: string;
  subcategoria: string;
  grupo_combo: string;
  flags_json: Record<string, boolean>;
}

export interface Importacao {
  id: string;
  nome_arquivo: string;
  importado_por: string;
  data_importacao: string;
  total_linhas: number;
  total_inseridas: number;
  total_substituidas: number;
  total_erros: number;
  empresa_venda: string;
}

export interface MonthlyGoal {
  meta_faturamento: number;
  meta_total_vendas: number;
  meta_vendas_virtua: number;
}

export interface RegraClassificacao {
  id: string;
  prioridade: number;
  ativo: boolean;
  texto_correspondencia: string;
  tipo_correspondencia: string;
  categoria_principal: string;
  subcategoria: string;
  observacao: string;
}

export interface DashboardFilters {
  dataInicio: string;
  dataFim: string;
  vendedor: string;
  supervisor: string;
  categoriaPrincipal: string;
  subcategoria: string;
  tipoVenda: string;
  tipoCliente: string;
  formaPagamento: string;
  tipoFiltro: string;
  busca: string;
  compDataInicio: string;
  compDataFim: string;
}

export interface DashboardStats {
  faturamento: number;
  totalVendas: number;
  totalProdutos: number;
  totalCombos: number;
  ticketMedio: number;
  mediaProdutos: number;
  percCombos: number;
  vendedoresAtivos: number;
  supervisoresAtivos: number;
  vendasInternet: number;
  porCategoria: Record<string, { faturamento: number; quantidade: number }>;
  porVendedor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number; vendasInternet: number }>;
  porSupervisor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number; vendedores: Set<string> }>;
  porComboTipo: Record<string, number>;
}

export type DashboardTab = 'resumo' | 'kpis' | 'produtos' | 'ranking' | 'graficos' | 'supervisao' | 'analise' | 'admin';
