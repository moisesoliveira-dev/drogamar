import {
  BriefcaseIcon,
  CalendarAlertIcon,
  ChartIcon,
  FactoryIcon,
  FileDownIcon,
  HomeIcon,
  PackageIcon,
  PackagePlusIcon,
  SettingsIcon,
  ShoppingCartIcon,
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
    id: 'vendas',
    label: 'Vendas',
    icon: BriefcaseIcon,
    basePath: '/app/vendas',
    items: [
      {
        id: 'carrinho-cliente',
        label: 'Carrinho Cliente',
        code: 'F1',
        path: '/app/vendas/carrinho',
        icon: ShoppingCartIcon,
        description:
          'Carrinho de compras para revisão de produtos e valores da venda.',
      },
      {
        id: 'busca-codigo-barras',
        label: 'Busca de Código de Barras',
        code: 'F2',
        path: '/app/vendas/codigo-barras',
        description: 'Localização rápida de produtos por código de barras.',
      },
      {
        id: 'pagamentos',
        label: 'Pagamentos',
        code: 'F3',
        path: '/app/vendas/pagamentos',
        description: 'Finalização e meios de pagamento da venda.',
      },
      {
        id: 'balcao-caixa',
        label: 'Sistema Balcão/Caixa',
        code: 'F4',
        path: '/app/vendas/balcao',
        description: 'Operação de balcão e caixa.',
      },
      {
        id: 'busca-ia',
        label: 'Busca por IA',
        code: 'F5',
        path: '/app/vendas/busca-ia',
        description: 'Busca assistida por inteligência artificial.',
      },
      {
        id: 'descontos-promocoes',
        label: 'Descontos e Promoções',
        code: 'F6',
        path: '/app/vendas/descontos',
        description: 'Regras de desconto e promoções comerciais.',
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
        id: 'cadastro-itens',
        label: 'Cadastro de Itens',
        code: 'F1',
        path: '/app/estoque/itens',
        icon: PackagePlusIcon,
        description: 'Cadastro e gerenciamento dos itens do estoque.',
      },
      {
        id: 'alerta-validade',
        label: 'Alerta de Validade',
        code: 'F2',
        path: '/app/estoque/validade',
        icon: CalendarAlertIcon,
        description:
          'Acompanhamento de itens próximos do vencimento ou com validade expirada.',
      },
      {
        id: 'exportacao-arquivos',
        label: 'Exportação de Arquivos',
        code: 'F3',
        path: '/app/estoque/exportacao',
        icon: FileDownIcon,
        description: 'Exportação dos dados do estoque.',
      },
      {
        id: 'loja-online',
        label: 'Loja Online',
        code: 'F4',
        path: '/app/estoque/loja-online',
        icon: ShoppingCartIcon,
        description: 'Integração e gerenciamento da loja online.',
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
