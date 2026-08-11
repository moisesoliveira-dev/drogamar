import {
  BriefcaseIcon,
  ChartIcon,
  FactoryIcon,
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from '../../../shared/ui/icons'
import type { NavModuleConfig } from './nav.types'

/**
 * Configuração central da navegação do ERP.
 * Novos setores/páginas entram aqui — sidebars leem esta fonte.
 */
export const appModules: NavModuleConfig[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: HomeIcon,
    basePath: '/app',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app',
        description: 'Visão geral do sistema.',
      },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: BriefcaseIcon,
    basePath: '/app/comercial',
    items: [
      {
        id: 'comercial-dashboard',
        label: 'Dashboard',
        path: '/app/comercial',
        description: 'Indicadores comerciais.',
      },
      {
        id: 'clientes',
        label: 'Clientes',
        path: '/app/comercial/clientes',
        description: 'Gerencie os clientes cadastrados no sistema.',
      },
      {
        id: 'leads',
        label: 'Leads',
        path: '/app/comercial/leads',
        description: 'Acompanhe leads e oportunidades iniciais.',
      },
      {
        id: 'oportunidades',
        label: 'Oportunidades',
        path: '/app/comercial/oportunidades',
        description: 'Pipeline de oportunidades.',
      },
      {
        id: 'propostas',
        label: 'Propostas',
        path: '/app/comercial/propostas',
        description: 'Propostas comerciais.',
      },
      {
        id: 'vendas',
        label: 'Vendas',
        path: '/app/comercial/vendas',
        description: 'Pedidos e vendas fechadas.',
      },
      {
        id: 'comercial-relatorios',
        label: 'Relatórios',
        path: '/app/comercial/relatorios',
        description: 'Relatórios do módulo comercial.',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: WalletIcon,
    basePath: '/app/financeiro',
    items: [
      {
        id: 'financeiro-dashboard',
        label: 'Dashboard',
        path: '/app/financeiro',
        description: 'Visão financeira consolidada.',
      },
      {
        id: 'contas-pagar',
        label: 'Contas a pagar',
        path: '/app/financeiro/contas-pagar',
        description: 'Obrigações a pagar.',
      },
      {
        id: 'contas-receber',
        label: 'Contas a receber',
        path: '/app/financeiro/contas-receber',
        description: 'Recebíveis e cobranças.',
      },
      {
        id: 'fluxo-caixa',
        label: 'Fluxo de caixa',
        path: '/app/financeiro/fluxo-caixa',
        description: 'Movimentação de caixa.',
      },
      {
        id: 'conciliacao',
        label: 'Conciliação',
        path: '/app/financeiro/conciliacao',
        description: 'Conciliação bancária.',
      },
      {
        id: 'financeiro-relatorios',
        label: 'Relatórios',
        path: '/app/financeiro/relatorios',
        description: 'Relatórios financeiros.',
      },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: PackageIcon,
    basePath: '/app/estoque',
    items: [
      {
        id: 'estoque-dashboard',
        label: 'Dashboard',
        path: '/app/estoque',
        description: 'Resumo de estoque.',
      },
      {
        id: 'produtos',
        label: 'Produtos',
        path: '/app/estoque/produtos',
        description: 'Cadastro de produtos e insumos.',
      },
      {
        id: 'inventario',
        label: 'Inventário',
        path: '/app/estoque/inventario',
        description: 'Contagens e inventário.',
      },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    icon: FactoryIcon,
    basePath: '/app/producao',
    items: [
      {
        id: 'producao-dashboard',
        label: 'Dashboard',
        path: '/app/producao',
        description: 'Acompanhamento da produção.',
      },
      {
        id: 'ordens',
        label: 'Ordens de produção',
        path: '/app/producao/ordens',
        description: 'Ordens e filas de produção.',
      },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    icon: UsersIcon,
    basePath: '/app/rh',
    items: [
      {
        id: 'rh-dashboard',
        label: 'Dashboard',
        path: '/app/rh',
        description: 'Visão de recursos humanos.',
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        path: '/app/rh/colaboradores',
        description: 'Cadastro de colaboradores.',
      },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: ChartIcon,
    basePath: '/app/relatorios',
    items: [
      {
        id: 'relatorios-geral',
        label: 'Visão geral',
        path: '/app/relatorios',
        description: 'Relatórios transversais do ERP.',
      },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: SettingsIcon,
    basePath: '/app/configuracoes',
    items: [
      {
        id: 'config-geral',
        label: 'Geral',
        path: '/app/configuracoes',
        description: 'Preferências e parâmetros do sistema.',
      },
      {
        id: 'usuarios',
        label: 'Usuários',
        path: '/app/configuracoes/usuarios',
        description: 'Gestão de usuários e acessos.',
      },
    ],
  },
]

export function findModuleById(id: string) {
  return appModules.find((module) => module.id === id) ?? null
}
