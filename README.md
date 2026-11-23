# Gestión Comercial - Segundo Parcial Programación IV

Sistema de gestión comercial para un comercio minorista. Permite administrar ventas/facturación, control de existencias y cuenta corriente de clientes, con autenticación por roles.

## Integrantes

- Diaz Rossini Juan Jose - Legajo 61744
- Álvarez Martin - Legajo 61984

## URL pública

- Producción: https://gestion-comercial-sable.vercel.app
- Repositorio: https://github.com/elchupacabras06/gestion-comercial

## Stack

- **Frontend/Backend**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + componentes estilo shadcn/ui + lucide-react
- **Gráficos**: Chart.js + react-chartjs-2
- **Base de datos**: Drizzle ORM + drizzle-kit; SQLite en desarrollo / libSQL (Turso) en producción
- **Validación**: Zod
- **Auth**: sesión en cookie `httpOnly` firmada (`gc_session`) con bcryptjs

## Funcionalidades principales

- **Autenticación y roles**: login/logout, cambio de contraseña, control por rol `admin` y `vendedor`.
- **Usuarios** (admin): alta, edición, activación/desactivación, reseteo de contraseña.
- **Categorías**: ABM con validaciones y baja lógica/uso controlado.
- **Productos y stock**: ABM, existencia, stock mínimo, movimientos de stock, ajuste manual y trazabilidad por venta/anulación.
- **Clientes**: ABM, cuenta corriente habilitada/no habilitada, límite de crédito, saldo y movimientos.
- **Ventas/Facturas**: nueva venta, numeración por punto de venta, formas de pago contado/tarjeta/cuenta corriente, detalle de factura, anulación.
- **Pagos/Cuenta corriente**: registro de pagos, validación de deuda/saldo, recibo/movimiento en cuenta.
- **Tablero**: indicadores de ventas, cuentas corrientes, bajo stock, gráficos y productos más vendidos.
- **UX**: modo claro/oscuro, layout responsive, estados de carga.

## Reglas de negocio clave

- La existencia se modifica **solo** a través de `registrarMovimientoStock()`.
- La creación y anulación de facturas se ejecutan en **transacciones**; si algo falla, se hace rollback.
- Los importes monetarios se almacenan en **centavos** (enteros).
- La numeración de facturas usa `PUNTO_VENTA` con formato `XXXX-XXXXXXXX`.
- Cuenta corriente: se valida cliente habilitado, deuda/límite y no se permiten pagos mayores a la deuda.
- La anulación de factura marca estado anulado y registra movimientos de stock compensatorios.
- Permisos validados en servidor; el frontend no es la única barrera.

## Puesta en marcha local

Requisitos: Node.js, pnpm (o npm).

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Abrir http://localhost:3000.

Scripts útiles:

```bash
pnpm run dev         # desarrollo
pnpm run build       # build de producción
pnpm run start       # servir build
pnpm run lint        # eslint
pnpm run db:migrate  # aplicar migraciones
pnpm run db:seed     # cargar datos de prueba
```

## Variables de entorno

Ver `.env.example`. No commitear `.env`.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | SQLite local o URL libSQL de Turso | `file:./local.db` / `libsql://...turso.io` |
| `TURSO_AUTH_TOKEN` | Token de Turso (solo producción/Turso) | `...` |
| `AUTH_SECRET` | Secreto para firmar sesión, mínimo 16 caracteres | cadena aleatoria larga |
| `PUNTO_VENTA` | Punto de venta para numeración, 4 dígitos | `0001` |

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@comercio.test` | `Admin1234` |
| Vendedor | `vendedor@comercio.test` | `Vendedor1234` |

## Deploy (Vercel + Turso)

1. Crear base en Turso y obtener `DATABASE_URL` y `TURSO_AUTH_TOKEN`.
2. Configurar env vars en el proyecto de Vercel: `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `PUNTO_VENTA`.
3. Aplicar migraciones y seed contra Turso antes de la demo:

```bash
pnpm run db:migrate
pnpm run db:seed
```

4. Importar el repo en Vercel y deployar. El build usa `pnpm run build`.

## Smoke test para defensa

- Login con admin y vendedor.
- Venta contado a consumidor final: verifica factura emitida y descuento de stock.
- Venta con cuenta corriente a cliente nuevo: verifica validación de CC y saldo.
- Registrar pago de cliente: verifica disminución de deuda y movimiento de cuenta.
- Anular factura: verifica estado anulado, stock repuesto y saldo ajustado según corresponda.
- Revisar tablero e impresión/detalle de factura.

## Notas de seguridad

- No publicar secretos (`AUTH_SECRET`, `TURSO_AUTH_TOKEN`) en el repo ni en capturas/chats.
- Si un token fue expuesto, revocarlo en Turso, generar uno nuevo y actualizar Vercel.
