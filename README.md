# Gestión Comercial - Segundo Parcial Programación IV

Sistema de gestión comercial para comercio minorista: facturación, control de existencias y cuenta corriente de clientes.

## Integrantes

- Diaz Rossini Juan Jose - Legajo 61744
- Álvarez Martin - Legajo 61984

## URL pública

- https://gestion-comercial-sable.vercel.app

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + componentes UI estilo shadcn/ui
- Drizzle ORM + drizzle-kit
- SQLite en desarrollo / libSQL Turso en producción
- Zod para validación
- Chart.js + react-chartjs-2

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

También funcionan los comandos equivalentes con `npm`.

## Variables de entorno

Ver `.env.example`.

- `DATABASE_URL`: `file:./local.db` en desarrollo, `libsql://...` en Turso.
- `TURSO_AUTH_TOKEN`: token de Turso en producción.
- `AUTH_SECRET`: secreto largo para firmar sesión.
- `PUNTO_VENTA`: punto de venta, 4 dígitos.

## Usuarios de prueba

- Admin: `admin@comercio.test` / `Admin1234`
- Vendedor: `vendedor@comercio.test` / `Vendedor1234`

## Deploy

- App: Vercel.
- Base de datos: Turso/libSQL.
- Configurar `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET` y `PUNTO_VENTA` en Vercel.
- Ejecutar migraciones y seed contra la base Turso antes de la demo.
