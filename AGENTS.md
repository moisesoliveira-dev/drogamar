# Instruções para a IA (Cursor)

As regras do projeto ficam em [`.cursor/rules/`](.cursor/rules/). A IDE as carrega automaticamente conforme o escopo (`alwaysApply` ou `globs`).

| Arquivo | Escopo |
|---------|--------|
| `00-core-workflow.mdc` | Sempre — workflow, modularidade, tom |
| `01-commits-atomicos.mdc` | Sempre — fatias commitáveis |
| `backend-architecture.mdc` | `apps/backend/**` — DDD, Hexagonal, CQRS, Spec, Domain Events |
| `backend-prisma.mdc` | Backend/Prisma |
| `frontend-architecture.mdc` | `apps/frontend/**` — Facade, features, C/P, Zod, RQ, Zustand |
| `frontend-components.mdc` | Componentes reutilizáveis |
| `frontend-design-shell.mdc` | Estilo obrigatório = `farmacia_manipulacao_shell.html` |
| `frontend-impeccable.mdc` | Design com Impeccable (shell prevalece) |
| `docker-workflow.mdc` | Docker / compose / env |

Não substituir estas rules por atalhos que violem os padrões de arquitetura.
