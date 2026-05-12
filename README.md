# TechNET Comercial

Sistema de gestão comercial desenvolvido para centralizar, organizar e acompanhar indicadores de vendas, faturamento, produtos, metas, supervisão e desempenho operacional.

O projeto foi estruturado como uma aplicação web moderna, com autenticação, controle de perfis, importação de planilhas, filtros dinâmicos e dashboards voltados para análise comercial e acompanhamento gerencial.

---

## Visão geral

O **TechNET Comercial** tem como objetivo transformar dados comerciais em informações claras, visuais e úteis para tomada de decisão.

A aplicação permite acompanhar indicadores como:

- Faturamento total;
- Quantidade de vendas;
- Ticket médio;
- Vendas por vendedor;
- Vendas por supervisor;
- Produtos vendidos;
- Combos e singles;
- Vendas de internet/Virtua;
- Metas mensais;
- Comparativo entre períodos;
- Ranking comercial;
- Indicadores por empresa;
- Análises por tipo de venda e tipo de produto.

---

## Principais recursos

### Dashboard comercial

Painel central com indicadores comerciais, gráficos, rankings e filtros para análise dos dados importados.

### Importação de planilhas

Importação de arquivos `.xlsx` e `.xls`, com leitura dos dados de vendas e itens para composição dos relatórios.

### Filtros dinâmicos

Filtros por período, empresa, vendedor, supervisor, tipo de venda, tipo de produto e busca textual.

### Comparativo de períodos

Permite comparar o período atual com outro intervalo selecionado, facilitando análises de evolução, queda ou crescimento.

### Metas mensais

Área administrativa para cadastro e acompanhamento de metas por mês, empresa, faturamento e quantidade de vendas de internet.

### Gestão de usuários

Controle de usuários por perfil, com aprovação manual, ativação/desativação e vinculação a vendedores ou supervisores.

### Controle de acesso

A aplicação possui diferentes níveis de visualização conforme o perfil do usuário:

- Vendedor;
- Consultor;
- Supervisor;
- Administrador.

### Modo apresentação

Modo visual voltado para exibição dos principais indicadores em reuniões, apresentações e acompanhamentos gerenciais.

---

## Tecnologias utilizadas

- React;
- TypeScript;
- Vite;
- Supabase;
- Tailwind CSS;
- shadcn/ui;
- Recharts;
- Framer Motion;
- React Query;
- React Router;
- XLSX.

---

## Estrutura geral do projeto

```txt
src/
├── components/
│   └── dashboard/
├── hooks/
├── integrations/
│   └── supabase/
├── lib/
├── pages/
└── main.tsx
```

---

## Instalação e execução local

### 1. Clonar o repositório

```bash
git clone https://github.com/comercialtechnet/comercialtechnet.git
cd comercialtechnet
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publicavel
```

> Nunca envie o arquivo `.env` para o repositório.

### 4. Rodar em ambiente de desenvolvimento

```bash
npm run dev
```

### 5. Gerar build de produção

```bash
npm run build
```

### 6. Visualizar build localmente

```bash
npm run preview
```

---

## Scripts disponíveis

### Servidor de desenvolvimento

```bash
npm run dev
```

### Build de produção

```bash
npm run build
```

### Prévia do build

```bash
npm run preview
```

### Verificação de lint

```bash
npm run lint
```

### Execução de testes

```bash
npm run test
```

---

## Perfis de acesso

### Vendedor / Consultor

Acesso restrito aos dados vinculados ao próprio usuário, conforme configuração administrativa.

### Supervisor

Acesso aos dados relacionados à equipe ou supervisores vinculados.

### Administrador

Acesso completo às áreas de gestão, importação, metas, usuários e configurações administrativas.

---

## Segurança

Este projeto utiliza Supabase como backend de autenticação e banco de dados.

Recomendações importantes:

- Manter o arquivo `.env` fora do Git;
- Utilizar apenas chaves públicas no frontend;
- Nunca expor `service_role`, `sb_secret`, senhas, tokens privados ou strings de conexão no navegador;
- Manter Row Level Security habilitado nas tabelas do Supabase;
- Aplicar políticas de acesso por perfil diretamente no banco de dados;
- Revisar permissões das tabelas relacionadas a usuários, vendas, importações, metas e itens de venda;
- Garantir que usuários pendentes, rejeitados ou inativos não tenham acesso aos dados comerciais;
- Validar que vendedor, consultor, supervisor e administrador tenham permissões compatíveis com suas funções.

---

## Observações sobre dados

Os dados comerciais são processados a partir de planilhas importadas e armazenados no Supabase.

A qualidade dos indicadores depende da padronização das informações de origem, especialmente campos como:

- Vendedor;
- Supervisor;
- Contrato;
- Cliente;
- Produto;
- Valor;
- Data de instalação;
- Tipo de venda;
- Forma de pagamento.

---

## Boas práticas recomendadas

Antes de publicar ou atualizar o repositório, recomenda-se verificar:

- Se o arquivo `.env` não está sendo enviado ao Git;
- Se não existem senhas, tokens ou credenciais no código;
- Se as permissões do Supabase estão corretas;
- Se as políticas de RLS estão ativas e testadas;
- Se o build de produção está funcionando corretamente;
- Se os dados utilizados em ambiente de teste não expõem informações sensíveis.

---

## Status do projeto

Projeto em desenvolvimento e evolução contínua, com foco em melhoria de performance, organização dos dados, segurança, usabilidade e clareza dos indicadores comerciais.

---

## Créditos técnicos

Desenvolvimento e implementação técnica principal realizados por **Francisco Gabriel**.

Este registro tem finalidade documental interna, indicando a autoria técnica do desenvolvimento, sem alterar regras de titularidade, confidencialidade ou propriedade aplicáveis ao projeto.