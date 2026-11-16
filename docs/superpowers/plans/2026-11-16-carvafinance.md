# CarvaFinance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CarvaFinance, a full-stack personal finance app (accounts, categories, income, expenses, transfers, dashboard, period filters, reports, CSV export) that runs with a single `docker compose up --build`.

**Architecture:** One Next.js App Router project. Thin REST Route Handlers (`src/app/api/**`) authenticate, validate with Zod and call server-only services (`src/server/services`) that always scope by `userId` and use Prisma against PostgreSQL in Docker. The client uses feature hooks over TanStack Query. Pure business rules live in `src/domain`.

**Tech Stack:** Next.js (latest stable, App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Prisma, PostgreSQL 17, Better Auth, Zod, TanStack Query v5, React Hook Form, Recharts, date-fns (pt-BR), lucide-react, next-themes, sonner, Vitest, Testing Library, MSW, Playwright, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-16-carvafinance-design.md`

## Global Constraints

- Node.js 22 LTS or newer; package manager: npm.
- TypeScript `strict: true`; no `any` (ESLint `@typescript-eslint/no-explicit-any: error`).
- ESLint bans `dangerouslySetInnerHTML` (`react/no-danger: error`) and `$queryRawUnsafe` / `$executeRawUnsafe` (`no-restricted-properties`).
- Money is always integer cents (`amountCents: 1599` = R$ 15,99); formatted only in UI with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Dates of transactions are calendar dates `YYYY-MM-DD`, stored as `@db.Date`, converted with `toDbDate`/`fromDbDate` (Task 3) — never `new Date('YYYY-MM-DD')` in local time.
- Code identifiers in English; all user-facing text in Portuguese (pt-BR).
- `userId` always comes from the session, never from request body or query.
- A resource owned by another user responds `404 NOT_FOUND`.
- API error body: `{ "error": { "code": string, "message": string, "details"?: unknown } }`; statuses 400, 401, 404, 409, 500.
- Primary color `#1E88E5`; income green, expense red; light/dark theme. Logo at `public/logo.webp`.
- Transfers never count in income/expense totals.
- Accounts/categories with transactions are archived, never deleted.
- Subcategories: exactly one level. Single currency BRL.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Demo credentials: `demo@carvafinance.dev` / `demo12345`.

## Review Focus

1. **pt-BR money input** (`"1.234,56"`, `"0,5"`, `"10"`, `"R$ 2,00"`) must become exact cents; `"abc"`, `"0"`, `"-5"` and 3+ decimals must be rejected — tests in Task 2.
2. **Month boundaries and timezone**: a transaction dated `2026-11-30` must appear in November and not shift to the 29th in `America/Sao_Paulo` — tests in Tasks 3 and 9.
3. **Cross-user references**: creating/updating a transaction or category with another user's `accountId`/`categoryId`/`parentId` must fail with 404, never succeed — tests in Tasks 8 and 9.
4. **PATCH that changes `type`** (e.g. EXPENSE → TRANSFER without `toAccountId`) must be validated as the merged full record and rejected — test in Task 9.
5. **Percent change when previous period is zero** (new user, first month) must show "—", never `NaN%`/`Infinity%` — tests in Tasks 4 and 13.

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: whole Next.js scaffold, `.prettierrc`, `vitest.config.ts`, `tests/setup.ts`, `.env.example`, `.gitignore` entries, `src/app/globals.css` theme tokens, `components.json` (shadcn)
- Test: `src/shared/lib/utils.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` in `src/shared/lib/utils.ts`; path alias `@/*` → `src/*`; npm scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:integration` (`vitest run --project integration`), `test:e2e` (`playwright test`), `format`.

- [ ] **Step 1:** Run `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (keep existing `docs/`, `public/logo.webp`).
- [ ] **Step 2:** Install dev deps: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw prettier prettier-plugin-tailwindcss husky lint-staged vite-tsconfig-paths`. Configure `vitest.config.ts` with two projects: `unit` (jsdom, `src/**/*.test.{ts,tsx}`, setup `tests/setup.ts`) and `integration` (node, `tests/integration/**/*.test.ts`, `fileParallelism: false`).
- [ ] **Step 3:** Run `npx shadcn@latest init` (style new-york, base color slate, CSS variables). Set `--primary` to `#1E88E5` (and dark-mode equivalent) in `globals.css`; add tokens `--income` (green-600) and `--expense` (red-600). Move generated `src/lib/utils.ts` to `src/shared/lib/utils.ts` and set `components.json` aliases to `@/shared/components/ui` and `@/shared/lib/utils`.
- [ ] **Step 4:** Add ESLint rules from Global Constraints; Husky pre-commit running `lint-staged` (eslint --fix + prettier on staged files).
- [ ] **Step 5: Write test** `utils.test.ts`: `expect(cn('p-2', 'p-4')).toBe('p-4')`.
- [ ] **Step 6:** Run `npm run lint && npm run typecheck && npm test` — Expected: all pass.
- [ ] **Step 7:** Commit `chore: scaffold Next.js app with Tailwind, shadcn, Vitest and lint tooling`.

---

### Task 2: Domain — money

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/money.test.ts`

**Interfaces:**
- Produces: `parseMoneyInput(input: string): number | null` (positive cents or null), `formatBRL(cents: number): string`, `sumCents(values: number[]): number`.

- [ ] **Step 1: Write failing tests**

```ts
it.each([
  ['1.234,56', 123456], ['0,5', 50], ['10', 1000], ['R$ 2,00', 200], [' 15,99 ', 1599], ['1234.56', 123456],
])('parses %s', (input, cents) => expect(parseMoneyInput(input)).toBe(cents));
it.each(['abc', '', '0', '0,00', '-5', '1,234', '12,3456'])('rejects %s', (input) =>
  expect(parseMoneyInput(input)).toBeNull());
it('formats', () => {
  expect(formatBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  expect(formatBRL(-500).replace(/\s/g, ' ')).toBe('-R$ 5,00');
});
it('sums', () => expect(sumCents([100, 250, -50])).toBe(300));
```

Rule for `1234.56` vs `1.234`: a single `.` followed by exactly 2 digits and no `,` is a decimal separator; otherwise `.` is a thousands separator. `1,234` is rejected (3 decimals). Never use floats for the conversion: split integer and fraction strings.

- [ ] **Step 2:** Run `npx vitest run src/domain/money.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the three functions.
- [ ] **Step 4:** Run the same command — Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): add money parsing and formatting`.

---

### Task 3: Domain — periods and dates

**Files:**
- Create: `src/domain/period.ts`
- Test: `src/domain/period.test.ts`

**Interfaces:**
- Produces:
  - `type PeriodPreset = 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom'`
  - `type DateRange = { from: string; to: string }` (inclusive, `YYYY-MM-DD`)
  - `resolvePreset(preset: Exclude<PeriodPreset,'custom'>, today: Date): DateRange`
  - `previousRange(range: DateRange): DateRange` — same number of days, ending the day before `from`; if `range` is whole calendar months, the previous range is the same number of whole months.
  - `shiftRange(range: DateRange, months: number): DateRange` — moves whole-month ranges by N months.
  - `listMonths(range: DateRange): string[]` (`'YYYY-MM'`)
  - `isValidRange(range: DateRange): boolean`
  - `toDbDate(date: string): Date` (UTC midnight), `fromDbDate(date: Date): string`
  - `PRESET_LABELS: Record<PeriodPreset, string>` = Este mês, Mês passado, Últimos 3 meses, Últimos 6 meses, Este ano, Personalizado.

- [ ] **Step 1: Write failing tests** (with `today = new Date(2026, 10, 15)`):

```ts
expect(resolvePreset('this-month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
expect(resolvePreset('last-month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
expect(resolvePreset('last-3-months', today)).toEqual({ from: '2026-09-01', to: '2026-11-30' });
expect(resolvePreset('last-6-months', today)).toEqual({ from: '2026-06-01', to: '2026-11-30' });
expect(resolvePreset('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
expect(previousRange({ from: '2026-11-01', to: '2026-11-30' })).toEqual({ from: '2026-10-01', to: '2026-10-31' });
expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
expect(previousRange({ from: '2026-11-10', to: '2026-11-19' })).toEqual({ from: '2026-10-31', to: '2026-11-09' });
expect(shiftRange({ from: '2026-11-01', to: '2026-11-30' }, -1)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
expect(listMonths({ from: '2026-09-15', to: '2026-11-02' })).toEqual(['2026-09', '2026-10', '2026-11']);
expect(isValidRange({ from: '2026-11-30', to: '2026-11-01' })).toBe(false);
expect(fromDbDate(toDbDate('2026-11-30'))).toBe('2026-11-30');
expect(toDbDate('2026-11-30').toISOString()).toBe('2026-11-30T00:00:00.000Z');
```

Add `"test": "cross-env TZ=America/Sao_Paulo vitest run"` (install `cross-env`) so date tests run in the Brazilian timezone.

- [ ] **Step 2:** Run `npx vitest run src/domain/period.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement with date-fns (`startOfMonth`, `endOfMonth`, `subMonths`, `differenceInCalendarDays`, `format`), using only date-only strings internally.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): add period presets and date helpers`.

---

### Task 4: Domain — balance, report helpers, CSV

**Files:**
- Create: `src/domain/balance.ts`, `src/domain/reports.ts`, `src/domain/csv.ts`
- Test: `src/domain/balance.test.ts`, `src/domain/reports.test.ts`, `src/domain/csv.test.ts`

**Interfaces:**
- Produces:
  - `type BalanceParts = { initialCents: number; incomeCents: number; expenseCents: number; transferOutCents: number; transferInCents: number }`
  - `computeBalance(p: BalanceParts): number`
  - `percentChange(current: number, previous: number): number | null` — `null` when `previous === 0`; otherwise rounded to 1 decimal.
  - `formatPercentChange(value: number | null): string` — `null` → `'—'`, `12.5` → `'+12,5%'`, `-3` → `'-3,0%'`.
  - `type MonthTotals = { month: string; incomeCents: number; expenseCents: number }`
  - `fillMonths(rows: MonthTotals[], months: string[]): MonthTotals[]` — one row per month in order, zeros for missing.
  - `withShares<T extends { totalCents: number }>(rows: T[]): (T & { share: number })[]` — share in % with 1 decimal, sorted desc by total; empty or all-zero → shares 0.
  - `toCsv(rows: (string | number)[][]): string` — starts with `\uFEFF`, separator `;`, line break `\r\n`, quotes cells containing `;`, `"` or line breaks (doubling `"`), prefixes `'` to cells starting with `=`, `+`, `-`, `@` **only for string cells** (numbers untouched).

- [ ] **Step 1: Write failing tests**

```ts
expect(computeBalance({ initialCents: 1000, incomeCents: 500, expenseCents: 200, transferOutCents: 100, transferInCents: 50 })).toBe(1250);
expect(percentChange(150, 100)).toBe(50);
expect(percentChange(100, 0)).toBeNull();
expect(percentChange(0, 0)).toBeNull();
expect(formatPercentChange(null)).toBe('—');
expect(formatPercentChange(12.5)).toBe('+12,5%');
expect(fillMonths([{ month: '2026-10', incomeCents: 5, expenseCents: 1 }], ['2026-09', '2026-10']))
  .toEqual([{ month: '2026-09', incomeCents: 0, expenseCents: 0 }, { month: '2026-10', incomeCents: 5, expenseCents: 1 }]);
expect(withShares([{ totalCents: 100 }, { totalCents: 300 }]).map((r) => r.share)).toEqual([75, 25]);
expect(withShares([{ totalCents: 0 }])[0].share).toBe(0);
expect(toCsv([['Descrição', 'Valor'], ['=HYPERLINK("x")', -1599], ['a;b', 1]]))
  .toBe('\uFEFFDescrição;Valor\r\n"\'=HYPERLINK(""x"")";-1599\r\n"a;b";1');
```

- [ ] **Step 2:** Run `npx vitest run src/domain` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): add balance, report and CSV helpers`.

---

### Task 5: Docker Postgres, Prisma schema, env and integration test harness

**Files:**
- Create: `docker-compose.yml` (service `db` only for now), `prisma/schema.prisma`, `prisma/migrations/*`, `src/server/db.ts`, `src/server/env.ts`, `tests/integration/global-setup.ts`, `tests/integration/helpers.ts`, `.env.example`
- Test: `tests/integration/constraints.test.ts`

**Interfaces:**
- Produces:
  - `db: PrismaClient` (singleton cached on `globalThis` in dev) in `src/server/db.ts` (file starts with `import 'server-only'`).
  - `env` in `src/server/env.ts`: Zod-parsed `{ DATABASE_URL: string; BETTER_AUTH_SECRET: string (min 32); BETTER_AUTH_URL: string (url) }`, throws on startup if invalid.
  - Prisma models (tables mapped to snake_case with `@@map`): `User`, `Session`, `AuthAccount`, `Verification` (Better Auth, generated in Task 6), and:
    - `Account { id String @id @default(cuid()); userId; name String @db.VarChar(60); type AccountType; initialBalanceCents Int @default(0); color String @db.VarChar(7); archived Boolean @default(false); createdAt; updatedAt }`
    - `Category { id; userId; parentId String?; name @db.VarChar(40); kind CategoryKind; color; icon String @db.VarChar(40); archived; createdAt }` — `parent` relation `onDelete: SetNull`
    - `Transaction { id; userId; type TransactionType; amountCents Int; date DateTime @db.Date; description String @db.VarChar(120) @default(""); accountId; toAccountId String?; categoryId String?; createdAt; updatedAt }` — relations to `Account` with `onDelete: Restrict`
    - enums `AccountType { CHECKING SAVINGS WALLET CREDIT_CARD INVESTMENT }`, `CategoryKind { INCOME EXPENSE }`, `TransactionType { INCOME EXPENSE TRANSFER }`
    - indexes `@@index([userId, date])`, `@@index([userId, accountId])`, `@@index([userId, categoryId])`; all user relations `onDelete: Cascade`.
  - `resetDb(): Promise<void>` (TRUNCATE all app and auth tables CASCADE) and `createUser(email?: string): Promise<{ id: string }>` (inserts a `User` row directly) in `tests/integration/helpers.ts`.

- [ ] **Step 1:** `docker-compose.yml`: service `db` with `postgres:17-alpine`, env `POSTGRES_USER=carva`, `POSTGRES_PASSWORD=carva`, `POSTGRES_DB=carvafinance`, port `5432:5432`, volume `pgdata`, healthcheck `pg_isready -U carva`. Add `docker/initdb/create-test-db.sql` (`CREATE DATABASE carvafinance_test;`) mounted at `/docker-entrypoint-initdb.d`.
- [ ] **Step 2:** Install `prisma @prisma/client server-only zod`; write `schema.prisma`; run `docker compose up -d db` then `npx prisma migrate dev --name init --create-only`; append to the generated `migration.sql`:

```sql
ALTER TABLE "transactions" ADD CONSTRAINT "amount_positive" CHECK ("amount_cents" > 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transfer_shape" CHECK (
  ("type" = 'TRANSFER' AND "to_account_id" IS NOT NULL AND "to_account_id" <> "account_id" AND "category_id" IS NULL)
  OR ("type" <> 'TRANSFER' AND "to_account_id" IS NULL AND "category_id" IS NOT NULL));
```

(Use `@map` so columns are snake_case.) Run `npx prisma migrate dev`.
- [ ] **Step 3:** `global-setup.ts` sets `DATABASE_URL` to `.../carvafinance_test` and runs `prisma migrate reset --force --skip-seed`. Wire it as `globalSetup` of the `integration` Vitest project; each test file calls `resetDb()` in `beforeEach`.
- [ ] **Step 4: Write test** `constraints.test.ts`: creating a `Transaction` with `amountCents: 0` rejects; creating a `TRANSFER` with `toAccountId` equal to `accountId` rejects; creating an `EXPENSE` without `categoryId` rejects.
- [ ] **Step 5:** Run `npm run test:integration` — Expected: PASS (3 tests).
- [ ] **Step 6:** Commit `feat(db): add Postgres compose service, Prisma schema and check constraints`.

---

### Task 6: Authentication, HTTP helpers and route protection

**Files:**
- Create: `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/shared/lib/auth-client.ts`, `src/server/http.ts`, `src/server/services/default-categories.ts`, `src/middleware.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/features/auth/components/login-form.tsx`, `src/features/auth/components/register-form.tsx`, `src/features/auth/schemas.ts`, `src/app/(app)/layout.tsx` (temporary minimal, replaced in Task 10)
- Test: `tests/integration/auth.test.ts`, `src/server/http.test.ts`, `src/features/auth/components/login-form.test.tsx`

**Interfaces:**
- Consumes: `db`, `env` (Task 5).
- Produces:
  - `auth` (Better Auth instance: `emailAndPassword: { enabled: true, minPasswordLength: 8 }`, `prismaAdapter(db, { provider: 'postgresql' })`, `account: { modelName: 'authAccount' }`, `rateLimit: { enabled: true, window: 60, max: 10 }`, `databaseHooks.user.create.after` → `createDefaultCategories(user.id)`).
  - `getSessionUserId(headers: Headers): Promise<string | null>`
  - `createDefaultCategories(userId: string): Promise<void>` — EXPENSE: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Compras, Outros; INCOME: Salário, Freelance, Investimentos, Outros (each with a color and lucide icon name).
  - `class AppError extends Error { constructor(public code: string, public status: 400|401|404|409, message: string, public details?: unknown) }`, helpers `notFound(entity: string)`, `conflict(code, message)`, `badRequest(code, message, details?)`.
  - `withAuth<P>(handler: (req: Request, ctx: { userId: string; params: P }) => Promise<Response>)` → Route Handler `(req, { params: Promise<P> })`. Returns 401 `UNAUTHORIZED` without session; maps `ZodError` → 400 `VALIDATION_ERROR` (details = `error.flatten()`), `AppError` → its status, anything else → 500 `INTERNAL_ERROR` (logs, generic message).
  - `ok<T>(data: T, status = 200): Response`
  - `authClient` (`createAuthClient()`) in `auth-client.ts`.
  - `loginSchema { email, password min 8 }`, `registerSchema { name 2..60, email, password min 8, confirmPassword }` with refine "As senhas não conferem".
  - `DEMO_CREDENTIALS = { email: 'demo@carvafinance.dev', password: 'demo12345' }` in `src/features/auth/demo.ts`.

- [ ] **Step 1:** Install `better-auth`; write `auth.ts`; run `npx @better-auth/cli generate` to add auth models to `schema.prisma` (confirm the `AuthAccount` model name), then `npx prisma migrate dev --name auth`.
- [ ] **Step 2: Write failing tests**
  - `http.test.ts` (mock `getSessionUserId`): no session → status 401 and body `{ error: { code: 'UNAUTHORIZED', message: 'Faça login para continuar.' } }`; handler throwing `new AppError('NOT_FOUND', 404, 'Conta não encontrada.')` → 404 same shape; handler throwing ZodError → 400 `VALIDATION_ERROR`; handler throwing `new Error('boom')` → 500 with message `'Erro interno. Tente novamente.'` (no `boom` in body).
  - `auth.test.ts`: `auth.api.signUpEmail({ body: { name: 'Ana', email: 'ana@x.dev', password: 'senha1234' } })` creates 12 categories for that user (8 EXPENSE, 4 INCOME).
  - `login-form.test.tsx`: submitting empty form shows "Informe um e-mail válido" and "A senha deve ter pelo menos 8 caracteres"; clicking "Entrar como demo" calls `authClient.signIn.email` with `DEMO_CREDENTIALS`.
- [ ] **Step 3:** Run `npm test && npm run test:integration` — Expected: FAIL.
- [ ] **Step 4:** Implement. `middleware.ts` redirects to `/login` when the Better Auth session cookie is absent for `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/reports`, `/settings`, and redirects `/` to `/dashboard`. `(app)/layout.tsx` re-checks the session server-side with `auth.api.getSession` and redirects. Login/register pages show the logo, use shadcn `Card`, `Input`, `Button`; errors from Better Auth are shown as toast in pt-BR ("E-mail ou senha incorretos.", "Este e-mail já está cadastrado.").
- [ ] **Step 5:** Run — Expected: PASS.
- [ ] **Step 6:** Commit `feat(auth): add Better Auth email/password, route protection and API error helpers`.

---

### Task 7: Accounts — service and API

**Files:**
- Create: `src/features/accounts/schemas.ts`, `src/server/services/accounts.service.ts`, `src/app/api/accounts/route.ts`, `src/app/api/accounts/[id]/route.ts`
- Test: `tests/integration/accounts.test.ts`

**Interfaces:**
- Consumes: `withAuth`, `ok`, `AppError`, `notFound` (Task 6); `computeBalance` (Task 4).
- Produces:
  - `ACCOUNT_TYPE_LABELS: Record<AccountType, string>` = Conta corrente, Poupança, Carteira, Cartão de crédito, Investimento.
  - `accountCreateSchema = z.object({ name: z.string().trim().min(1, 'Informe um nome').max(60), type: z.nativeEnum-like enum, initialBalanceCents: z.number().int(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })`; `accountUpdateSchema = accountCreateSchema.partial().extend({ archived: z.boolean().optional() })`.
  - `type AccountDTO = { id; name; type; initialBalanceCents; color; archived; balanceCents: number }`
  - `listAccounts(userId: string, opts?: { includeArchived?: boolean }): Promise<AccountDTO[]>` (ordered by name)
  - `getAccountBalances(userId: string): Promise<Map<string, number>>` (reused by dashboard/reports)
  - `getAccount(userId, id): Promise<AccountDTO>`; `createAccount(userId, input)`; `updateAccount(userId, id, input)`; `deleteAccount(userId, id): Promise<{ result: 'deleted' | 'archived' }>`
  - Routes: `GET/POST /api/accounts` (`?includeArchived=true`), `GET/PATCH/DELETE /api/accounts/:id`. POST returns 201.

Balances: one `groupBy(['accountId','type'])` sum plus one `groupBy(['toAccountId'])` sum for transfers in, combined with `computeBalance`.

- [ ] **Step 1: Write failing tests** (call services directly, plus one route test per verb through the handler with a mocked session):
  - account with initial 10000, income 5000, expense 2000, transfer out 1000 to B → balance 12000; B (initial 0) → 1000.
  - user B `getAccount(userB, accountOfA)` → throws AppError 404; `PATCH` by B → 404.
  - `deleteAccount` without transactions → `{ result: 'deleted' }` and row gone; with transactions → `{ result: 'archived' }`, row has `archived: true`, `listAccounts` excludes it, `includeArchived` includes it.
  - POST with `name: ''` → 400 `VALIDATION_ERROR`.
- [ ] **Step 2:** Run `npm run test:integration -- accounts` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(accounts): add accounts service and REST routes`.

---

### Task 8: Categories — service and API

**Files:**
- Create: `src/features/categories/schemas.ts`, `src/server/services/categories.service.ts`, `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`
- Test: `tests/integration/categories.test.ts`

**Interfaces:**
- Produces:
  - `categoryCreateSchema { name 1..40 ('Informe um nome'), kind: 'INCOME'|'EXPENSE', color hex, icon string 1..40, parentId: string nullable optional }`; `categoryUpdateSchema` = partial + `archived?`.
  - `type CategoryDTO = { id; name; kind; color; icon; archived; parentId: string | null; children: CategoryDTO[] }` (tree, children one level).
  - `listCategories(userId, opts?: { kind?: CategoryKind; includeArchived?: boolean }): Promise<CategoryDTO[]>`
  - `createCategory`, `updateCategory`, `deleteCategory(userId, id): Promise<{ result: 'deleted' | 'archived' }>`
  - `assertCategoryUsable(userId, categoryId, kind): Promise<void>` (exists, owned, not archived, same kind; else 404 / 400 `CATEGORY_KIND_MISMATCH`) — reused by Task 9.
- Rules: parent must be owned (else 404), same kind (400 `CATEGORY_KIND_MISMATCH`), and have no parent itself (400 `CATEGORY_DEPTH`); a category with children cannot become a child (400 `CATEGORY_DEPTH`); changing `kind` of a category with transactions → 409 `CATEGORY_IN_USE`.

- [ ] **Step 1: Write failing tests:** one test per rule above, plus: parentId of another user's category → 404; delete used category → archived; delete unused parent → deleted and children get `parentId: null`; list with `kind=EXPENSE` returns only expenses as a tree.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(categories): add categories service and REST routes`.

---

### Task 9: Transactions — service and API

**Files:**
- Create: `src/features/transactions/schemas.ts`, `src/server/services/transactions.service.ts`, `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`
- Test: `tests/integration/transactions.test.ts`, `src/features/transactions/schemas.test.ts`

**Interfaces:**
- Consumes: `assertCategoryUsable` (Task 8), `toDbDate`/`fromDbDate`/`isValidRange` (Task 3).
- Produces:
  - `transactionInputSchema` = `z.discriminatedUnion('type', [incomeExpense('INCOME'), incomeExpense('EXPENSE'), transfer])` where common = `{ amountCents: z.number().int().positive('Informe um valor maior que zero'), date: /^\d{4}-\d{2}-\d{2}$/ valid date, description: z.string().trim().max(120).default('') }`, income/expense add `{ accountId, categoryId }`, transfer adds `{ accountId, toAccountId }` refined `accountId !== toAccountId` ('Escolha contas diferentes', path `toAccountId`).
  - `transactionPatchSchema = z.record(...)` partial of all fields (loosely typed object of optional fields).
  - `transactionFiltersSchema { from?, to?, type?, accountId?, categoryId?, q? (max 60), page: coerce int ≥1 default 1, pageSize: coerce int 1..100 default 20, sort: 'date_desc'|'date_asc'|'amount_desc'|'amount_asc' default 'date_desc' }` with refine valid range when both given.
  - `type TransactionDTO = { id; type; amountCents; date: string; description; account: { id; name; color }; toAccount: { id; name; color } | null; category: { id; name; color; icon } | null }`
  - `type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }`
  - `listTransactions(userId, filters): Promise<Paginated<TransactionDTO>>` — `accountId` filter matches `accountId` OR `toAccountId`; `categoryId` filter includes its children; `q` is case-insensitive `contains` on description; tie-break sort by `createdAt desc`.
  - `getTransaction`, `createTransaction(userId, input)`, `updateTransaction(userId, id, patch)`, `deleteTransaction(userId, id): Promise<void>`
- Rules: accounts must be owned (404) and not archived (400 `ACCOUNT_ARCHIVED`); category via `assertCategoryUsable` with kind = type. `updateTransaction` merges existing record (as input shape) with `patch`, validates the merged object with `transactionInputSchema`, and on switching to TRANSFER sets `categoryId: null` / to INCOME|EXPENSE sets `toAccountId: null`.

- [ ] **Step 1: Write failing tests**
  - schemas: transfer with same accounts fails at path `toAccountId`; `amountCents: 0` fails; `amountCents: 10.5` fails; `date: '2026-02-30'` fails.
  - create EXPENSE with an INCOME category → 400 `CATEGORY_KIND_MISMATCH`.
  - create with another user's `accountId` → 404; with another user's `toAccountId` → 404; with another user's `categoryId` → 404.
  - create on archived account → 400 `ACCOUNT_ARCHIVED`.
  - PATCH EXPENSE → `{ type: 'TRANSFER' }` (no `toAccountId`) → 400 `VALIDATION_ERROR`; PATCH `{ type: 'TRANSFER', toAccountId: B }` → succeeds and `category` is null.
  - list: dated `2026-11-30` is returned for `from=2026-11-01&to=2026-11-30` and `date === '2026-11-30'` (run under `TZ=America/Sao_Paulo`); not returned for `from=2026-12-01`.
  - list: 25 items, `pageSize=10&page=3` → 5 items, `total=25`; `q='mercado'` matches "Supermercado"; `accountId=B` includes transfers into B; `categoryId` of a parent includes child-category transactions.
  - user B GET/PATCH/DELETE on A's transaction → 404.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat(transactions): add income, expense and transfer service and REST routes`.

---

### Task 10: App shell, providers, API client and period filter

**Files:**
- Create: `src/app/providers.tsx`, `src/app/(app)/layout.tsx` (replace), `src/shared/components/layout/app-shell.tsx`, `sidebar.tsx`, `header.tsx`, `user-menu.tsx`, `theme-toggle.tsx`, `src/shared/components/period-picker.tsx`, `src/shared/hooks/use-period-filter.ts`, `src/shared/lib/api.ts`, `src/shared/lib/query-client.ts`, `src/shared/components/feedback/empty-state.tsx`, `error-state.tsx`, `confirm-dialog.tsx`, `src/shared/components/money-input.tsx`, `src/shared/components/money.tsx`
- Test: `src/shared/hooks/use-period-filter.test.tsx`, `src/shared/lib/api.test.ts`, `src/shared/components/money-input.test.tsx`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { code: string; status: number; details?: unknown }`; `apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>` — sets JSON headers, parses error body into `ApiError`, returns `undefined` for 204.
  - `usePeriodFilter(): { range: DateRange; preset: PeriodPreset; setPreset(p: PeriodPreset): void; setRange(r: DateRange): void; shift(months: number): void }` — reads `from`/`to`/`preset` from URL search params, defaults to `this-month`, writes with `router.replace` keeping other params.
  - `<PeriodPicker />` (preset select + ◀ ▶ + custom date range popover, label like "Novembro 2026" for whole-month ranges).
  - `<MoneyInput value: number | null; onChange(cents: number | null) />` using `parseMoneyInput`, displaying formatted value on blur.
  - `<Money cents: number; colored?: boolean />` (green positive / red negative when `colored`).
  - `<EmptyState icon title description action? />`, `<ErrorState onRetry />`, `<ConfirmDialog title description confirmLabel onConfirm />`.
  - Query keys convention: `['accounts', ...]`, `['categories', ...]`, `['transactions', filters]`, `['dashboard', range]`, `['reports', type, params]`.
- Shell: sidebar with logo + "CarvaFinance", links Dashboard, Lançamentos, Contas, Categorias, Relatórios, Configurações (lucide icons, active state), collapses to a `Sheet` on mobile; header with `PeriodPicker`, "+ Lançamento" button (opens dialog from Task 12 — render a placeholder slot now), theme toggle and user menu (name, Sair). Providers: `QueryClientProvider` (staleTime 30s), `ThemeProvider` (next-themes, class strategy), `Toaster` (sonner). Install `@tanstack/react-query next-themes sonner react-hook-form @hookform/resolvers date-fns lucide-react` and shadcn components `button card input label select dialog sheet dropdown-menu popover calendar table tabs badge skeleton tooltip toggle-group form`.

- [ ] **Step 1: Write failing tests**
  - `usePeriodFilter` with no params and system time 2026-11-15 → `range = { from: '2026-11-01', to: '2026-11-30' }`, `preset 'this-month'`; with `?from=2026-01-01&to=2026-01-31&preset=custom` → that range; `shift(-1)` calls `router.replace` with `from=2026-10-01&to=2026-10-31` and preserves `accountId=x`; invalid `from` falls back to default.
  - `apiFetch` on a 404 response with error body → rejects with `ApiError` `{ code: 'NOT_FOUND', status: 404 }`.
  - `MoneyInput`: typing "1.234,56" calls `onChange(123456)`; typing "abc" calls `onChange(null)`.
- [ ] **Step 2:** Run `npm test` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run build` — Expected: PASS and build succeeds.
- [ ] **Step 5:** Commit `feat(ui): add app shell, providers, API client and period filter`.

---

### Task 11: Accounts and categories UI

**Files:**
- Create: `src/features/accounts/api-client.ts`, `src/features/accounts/hooks/use-accounts.ts`, `src/features/accounts/components/account-form.tsx`, `account-card.tsx`, `account-list.tsx`, `src/app/(app)/accounts/page.tsx`; same set under `src/features/categories/` (`category-form.tsx`, `category-list.tsx`) and `src/app/(app)/categories/page.tsx`; `src/shared/components/color-picker.tsx`, `src/shared/components/category-icon.tsx`; `tests/mocks/handlers.ts`, `tests/mocks/server.ts`
- Test: `src/features/accounts/components/account-form.test.tsx`, `src/features/categories/components/category-form.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, schemas and DTOs from Tasks 7–8.
- Produces: hooks `useAccounts(opts?)`, `useCreateAccount()`, `useUpdateAccount()`, `useDeleteAccount()`, `useCategories(opts?)`, `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`. Mutations invalidate `['accounts']` / `['categories']` plus `['dashboard']`, `['reports']`, `['transactions']`, and toast "Conta salva", "Conta arquivada", "Conta excluída" (categories analogous).
- `<CategoryIcon name: string />` maps a fixed whitelist of lucide icon names (the ones used in default categories + ~20 more) to components; unknown → `Tag`.
- Pages: grid of `AccountCard` (name, type label, colored balance, actions edit/archive/delete via `ConfirmDialog`), "Mostrar arquivadas" toggle, `EmptyState` "Nenhuma conta ainda" with "Criar conta". Categories page: tabs Despesas / Receitas, tree list, form dialog with parent select limited to same-kind top-level categories.

- [ ] **Step 1: Write failing tests** (MSW):
  - `AccountForm`: filling name "Nubank", type "Conta corrente", initial "1.500,00" and submitting sends `POST /api/accounts` with `{ name: 'Nubank', type: 'CHECKING', initialBalanceCents: 150000, color: <default> }`; empty name shows "Informe um nome".
  - `CategoryForm` for kind EXPENSE: parent select lists only EXPENSE top-level categories.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): add accounts and categories pages`.

---

### Task 12: Transactions UI

**Files:**
- Create: `src/features/transactions/api-client.ts`, `hooks/use-transactions.ts`, `components/transaction-form.tsx`, `transfer-form.tsx`, `new-transaction-dialog.tsx`, `transaction-table.tsx`, `transaction-filters.tsx`, `use-transaction-filters.ts`, `src/app/(app)/transactions/page.tsx`
- Modify: `src/shared/components/layout/header.tsx` (mount `NewTransactionDialog`)
- Test: `src/features/transactions/components/transaction-form.test.tsx`, `transaction-table.test.tsx`

**Interfaces:**
- Consumes: Task 9 schemas/DTOs, `usePeriodFilter`, `useAccounts`, `useCategories`, `MoneyInput`, `Money`.
- Produces: `useTransactions(filters)` (keepPreviousData), `useCreateTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()` (optimistic: removes the row from cached `['transactions', ...]` pages, rolls back and toasts "Não foi possível excluir" on error); all invalidate `['transactions']`, `['accounts']`, `['dashboard']`, `['reports']`.
- `useTransactionFilters()` combines `usePeriodFilter` with URL params `type`, `accountId`, `categoryId`, `q` (debounced 300 ms), `page`, `sort`; changing any filter resets `page` to 1.
- `<NewTransactionDialog defaultTab?: 'EXPENSE' | 'INCOME' | 'TRANSFER' transaction?: TransactionDTO />` with segmented control Despesa / Receita / Transferência; edit mode when `transaction` given.
- Table columns: Data (dd/MM/yyyy), Descrição, Categoria (icon + name, or "Transferência"), Conta (or "Origem → Destino"), Valor (green `+` income, red `-` expense, neutral transfer); row actions Editar / Excluir; footer pagination "Mostrando 1–20 de 57".
- Form only lists non-archived accounts and categories of the selected kind; date defaults to today; after save: toast "Lançamento salvo", dialog closes.

- [ ] **Step 1: Write failing tests** (MSW):
  - expense form: amount "45,90", category "Alimentação", account "Carteira", date default today → `POST /api/transactions` body `{ type: 'EXPENSE', amountCents: 4590, ... , date: <today YYYY-MM-DD> }`.
  - transfer form with same origin and destination shows "Escolha contas diferentes" and does not submit.
  - switching tab from Despesa to Receita resets the category field and lists only INCOME categories.
  - table renders an income as "+R$ 100,00" and a transfer as "Carteira → Poupança"; clicking Excluir then confirming removes the row before the server responds.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): add transactions list, filters and forms`.

---

### Task 13: Dashboard (service, route, UI)

**Files:**
- Create: `src/server/services/dashboard.service.ts`, `src/app/api/dashboard/route.ts`, `src/features/dashboard/api-client.ts`, `hooks/use-dashboard.ts`, `components/summary-cards.tsx`, `cash-flow-chart.tsx`, `expenses-by-category-chart.tsx`, `balance-trend-chart.tsx`, `account-balances.tsx`, `recent-transactions.tsx`, `src/app/(app)/dashboard/page.tsx`
- Test: `tests/integration/dashboard.test.ts`, `src/features/dashboard/components/summary-cards.test.tsx`

**Interfaces:**
- Consumes: `getAccountBalances` (Task 7), `listTransactions` (Task 9), `previousRange`, `listMonths` (Task 3), `percentChange`, `fillMonths`, `withShares` (Task 4).
- Produces:
  - `type Metric = { currentCents: number; previousCents: number; changePct: number | null }`
  - `type DashboardDTO = { totalBalanceCents: number; income: Metric; expense: Metric; result: Metric; cashFlow: MonthTotals[]; expensesByCategory: { categoryId: string; name: string; color: string; totalCents: number; share: number }[]; balanceTrend: { month: string; balanceCents: number }[]; accounts: { id: string; name: string; color: string; balanceCents: number }[]; recent: TransactionDTO[] }`
  - `getDashboard(userId: string, range: DateRange): Promise<DashboardDTO>`
  - `GET /api/dashboard?from&to` (400 on invalid range).
- Rules: `totalBalanceCents` sums all accounts including archived, independent of range. `cashFlow` and `balanceTrend` cover the 6 months ending at the month of `range.to`; `balanceTrend` = total balance at the end of each month. `expensesByCategory` groups child categories into their parent. `recent` = 5 latest overall. Monthly sums via a tagged `db.$queryRaw` using `date_trunc('month', date)` (parameterized).
- UI: 4 summary cards (Saldo total, Receitas, Despesas, Resultado) with `formatPercentChange` badge vs previous period ("vs. período anterior"); for Despesas an increase is shown red. Recharts: bar (cash flow), donut (by category, legend with share), line (balance trend), list (balances per account). Axis values formatted in BRL compact (`R$ 1,2 mil`). `Skeleton` while loading, `ErrorState` on error, `EmptyState` "Comece cadastrando uma conta" with button when the user has no accounts.

- [ ] **Step 1: Write failing tests**
  - integration: fixture (Nov 2026: income 500000, expenses 120000 Alimentação + 30000 child "Restaurantes" of Alimentação + 50000 Moradia, transfer 10000; Oct 2026: income 400000, expense 100000) → `income.currentCents 500000`, `income.previousCents 400000`, `income.changePct 25`; `expense.currentCents 200000`; transfer not counted; `expensesByCategory[0]` = Alimentação `totalCents 150000`, `share 75`; `cashFlow.length 6` with zeros for empty months; new user with no data → all metrics 0 and `changePct null`.
  - component: `SummaryCards` with `changePct: null` renders "—"; with income `changePct 25` renders "+25,0%".
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement (install `recharts`).
- [ ] **Step 4:** Run `npm test && npm run test:integration` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(dashboard): add dashboard aggregation endpoint and charts`.

---

### Task 14: Reports and CSV export

**Files:**
- Create: `src/server/services/reports.service.ts`, `src/app/api/reports/[type]/route.ts`, `src/features/reports/api-client.ts`, `hooks/use-reports.ts`, `components/monthly-report.tsx`, `category-report.tsx`, `account-report.tsx`, `export-csv-button.tsx`, `src/app/(app)/reports/page.tsx`
- Test: `tests/integration/reports.test.ts`, `src/features/reports/components/category-report.test.tsx`

**Interfaces:**
- Consumes: Tasks 3, 4, 7, 9 helpers.
- Produces:
  - `monthlyReport(userId, range): Promise<(MonthTotals & { resultCents: number })[]>`
  - `categoriesReport(userId, range, kind: CategoryKind): Promise<{ categoryId; name; color; parentId: string | null; totalCents; previousCents; changePct: number | null; share: number }[]>` (per category including children rows, shares relative to the kind total)
  - `accountsReport(userId, range): Promise<{ accountId; name; color; inflowCents; outflowCents; balanceCents }[]>` (inflow = income + transfers in; outflow = expense + transfers out)
  - `exportTransactionsCsv(userId, filters): Promise<string>` — all matching rows (no pagination), columns `Data;Tipo;Descrição;Categoria;Conta;Conta destino;Valor`, `Data` as `dd/MM/yyyy`, `Tipo` as Receita/Despesa/Transferência, `Valor` as pt-BR decimal string (`-45,90` for expenses, `1.500,00` for income), built with `toCsv`.
  - `GET /api/reports/:type` where type ∈ `monthly | categories | accounts | export`; unknown → 404 `NOT_FOUND`; `export` responds `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="carvafinance-<from>-a-<to>.csv"`.
- UI: tabs Resumo mensal / Por categoria / Por conta / Extrato, all using the shared period filter; each tab shows table + chart; `ExportCsvButton` downloads the extract for the current filters.

- [ ] **Step 1: Write failing tests**
  - `monthlyReport` for Sep–Nov returns 3 rows with correct `resultCents`, zeros for empty months.
  - `categoriesReport(EXPENSE)` shares sum to 100 (±0.1) and `changePct` null when previous is 0.
  - `accountsReport` counts a transfer as outflow for origin and inflow for destination.
  - `exportTransactionsCsv` output starts with `\uFEFF`, first line is the header above, an expense row ends with `;-45,90`, a description `=1+1` is exported as `'=1+1`.
  - route `/api/reports/unknown` → 404.
  - component: category report shows "—" for a category with no previous value.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run test:integration` — Expected: PASS.
- [ ] **Step 5:** Commit `feat(reports): add monthly, category, account reports and CSV export`.

---

### Task 15: Demo seed and settings page

**Files:**
- Create: `prisma/seed.ts`, `src/server/services/demo-data.ts`, `src/app/(app)/settings/page.tsx`, `src/features/settings/components/profile-form.tsx`, `change-password-form.tsx`, `theme-setting.tsx`
- Modify: `package.json` (`"prisma": { "seed": "tsx prisma/seed.ts" }`, install `tsx`)
- Test: `tests/integration/seed.test.ts`

**Interfaces:**
- Consumes: `auth.api.signUpEmail` (Task 6), services from Tasks 7–9.
- Produces: `seedDemo(today: Date): Promise<{ created: boolean }>` in `demo-data.ts` — idempotent (returns `{ created: false }` if `demo@carvafinance.dev` exists). Creates the demo user via `auth.api.signUpEmail` with `DEMO_CREDENTIALS` and name "Usuário Demo"; accounts Conta corrente (initial 250000), Poupança (1000000), Carteira (20000), Cartão de crédito (0); for each of the 6 months ending at `today`'s month: salary 650000 on day 5, a freelance income in alternate months, rent 180000 on day 10, ~15 random expenses across default categories (deterministic PRNG with fixed seed so data is stable), one transfer of 50000 to Poupança; no transactions after `today`.
- Settings page: profile name (`authClient.updateUser`), change password (`authClient.changePassword` with current/new/confirm; toasts "Senha alterada" / "Senha atual incorreta"), theme (Claro / Escuro / Sistema).

- [ ] **Step 1: Write failing test:** `seedDemo(new Date(2026, 10, 15))` → `{ created: true }`, demo user has 4 accounts and > 80 transactions, none dated after `2026-11-15`, every month Jun–Nov 2026 has at least one INCOME and one EXPENSE; second call → `{ created: false }` and transaction count unchanged.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement; `prisma/seed.ts` calls `seedDemo(new Date())`.
- [ ] **Step 4:** Run `npm run test:integration && npx prisma db seed` — Expected: PASS and "Demo data created" (or "already exists").
- [ ] **Step 5:** Commit `feat: add idempotent demo seed and settings page`.

---

### Task 16: Production Docker image and security headers

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker/entrypoint.sh`
- Modify: `docker-compose.yml` (add `app` service), `next.config.ts`
- Test: `tests/integration/headers.test.ts` (reads `next.config.ts` `headers()` output)

**Interfaces:**
- Produces: `next.config.ts` with `output: 'standalone'` and `headers()` for `/(.*)`: `Content-Security-Policy` (`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`; in dev also allow `'unsafe-eval'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Dockerfile stages: `deps` (`npm ci`), `build` (`prisma generate`, `next build`), `runner` (`node:22-alpine`, copies `.next/standalone`, `.next/static`, `public`, `prisma`, Prisma CLI + `tsx` for migrate/seed, `USER node`, `EXPOSE 3000`).
- `entrypoint.sh`: `npx prisma migrate deploy && npx prisma db seed && node server.js`.
- Compose `app`: `build: .`, `depends_on: db: condition: service_healthy`, `ports: 3000:3000`, env `DATABASE_URL=postgresql://carva:carva@db:5432/carvafinance`, `BETTER_AUTH_URL=http://localhost:3000`, `BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-change-me-in-production-please-32chars}`.

- [ ] **Step 1: Write failing test:** headers list for `/(.*)` contains `X-Frame-Options: DENY` and a CSP including `frame-ancestors 'none'`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run test:integration`, then `docker compose down -v && docker compose up --build -d` and `curl -sI http://localhost:3000/login` — Expected: tests PASS; HTTP 200 with the security headers; logging in as demo shows the dashboard with data.
- [ ] **Step 5:** Commit `feat(infra): add production Docker image, compose app service and security headers`.

---

### Task 17: E2E tests, CI and README

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/finance-flow.spec.ts`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`, `docs/screenshots/*.png`
- Modify: `docs/superpowers/specs/2026-11-16-carvafinance-design.md` (logo path → `../../../public/logo.webp`)

**Interfaces:**
- Consumes: the whole app.

- [ ] **Step 1: Write E2E tests** (Playwright, `baseURL http://localhost:3000`, `webServer: npm run build && npm start` when not in Docker):
  - `auth.spec.ts`: register a new unique user → lands on dashboard with empty state; logout → visiting `/dashboard` redirects to `/login`; "Entrar como demo" → dashboard shows "Saldo total" with a non-zero value.
  - `finance-flow.spec.ts`: new user creates accounts "Corrente" (R$ 1.000,00) and "Poupança" (R$ 0,00) → adds income R$ 500,00 (Salário), expense R$ 200,00 (Alimentação), transfer R$ 300,00 Corrente → Poupança → dashboard shows Saldo total "R$ 1.300,00", Receitas "R$ 500,00", Despesas "R$ 200,00"; accounts page shows Corrente "R$ 1.000,00" and Poupança "R$ 300,00"; switching period to "Mês passado" shows Receitas "R$ 0,00"; reports → Extrato → "Exportar CSV" downloads a file whose name starts with `carvafinance-`.
- [ ] **Step 2:** Run `npm run test:e2e` — Expected: PASS (fix any defects found in earlier tasks' code, with a regression unit/integration test for each).
- [ ] **Step 3:** CI workflow on push/PR to `main`: Node 22, `postgres:17-alpine` service, `npm ci` → `npm audit --audit-level=high` → `lint` → `typecheck` → `test` (with coverage, fail under 80% lines for `src/domain` + `src/server`) → `prisma migrate deploy` + `test:integration` → `build` → `npx playwright install --with-deps chromium` → `test:e2e`. Dependabot weekly for npm and GitHub Actions.
- [ ] **Step 4:** README (pt-BR): logo, badges (CI, coverage), one-paragraph pitch, screenshots (dashboard light/dark, transactions, reports), "Como rodar" (`docker compose up --build` → http://localhost:3000 → "Entrar como demo"), "Desenvolvimento" (`docker compose up -d db`, `cp .env.example .env`, `npm i`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`), stack, architecture diagram (mermaid from spec), API routes table, testing commands, license MIT.
- [ ] **Step 5:** Run `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build` — Expected: all pass.
- [ ] **Step 6:** Commit `test: add E2E flows, CI pipeline and README`.
