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

## Cursor Cloud specific instructions

- Instale dependências na raiz com `npm ci` e gere o client com `npm run prisma:generate -w @drogamar/backend`. O binário do Prisma fica em `apps/backend/node_modules/.bin`, não na raiz.
- PostgreSQL 16 já está na imagem (não há Docker). `service postgresql` não sobe: `policy-rc.d` recusa o start. Use `sudo pg_ctlcluster 16 main start` e espere `pg_isready`. Role e banco: `drogamar` / `drogamar` em `localhost:5432`.
- Copie `.env.example` para `.env` e para `apps/backend/.env`. Prisma e o Nest leem o arquivo do backend. No shell de login, `npx` pode apontar para `/exec-daemon/npx` e não achar o CLI do workspace — use `npm run prisma:deploy -w @drogamar/backend` e `npm run prisma:seed -w @drogamar/backend`.
- Login de desenvolvimento, depois do seed: `admin@drogamar.local` / `ChangeMeNow!123`.
- Backend: `npm run start:dev -w @drogamar/backend` na porta 3000. Frontend: `npm run dev -w @drogamar/frontend -- --host 0.0.0.0 --port 5173`. O Vite faz proxy de `/api` para o backend. Abra `http://localhost:5173/login`.
- Testes: `npm test -w @drogamar/backend` e `npm test -w @drogamar/frontend`. Lint do frontend: `npm run lint -w @drogamar/frontend`. O `npm run lint` do backend inclui `--fix` e hoje acusa erros já existentes no código.
- `OPENAI_API_KEY` é opcional. Sem a chave, a busca por IA usa o parser local.
