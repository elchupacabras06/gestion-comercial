import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { movimientosStock, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { paginationSchema, paged, parseOrThrow } from "./validation";
import { movimientoStockSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";

export type StockMotivoIngreso = "Reposición" | "Stock inicial" | "Devolución de cliente";
export type StockMotivoEgreso = "Rotura" | "Vencimiento" | "Ajuste de inventario" | "Uso interno";

function assertAdmin(user: SessionUser) {
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
}

export async function registrarMovimientoStock(
  tx: any,
  args: { productoId: number; usuarioId: number; tipo: "venta" | "anulacion" | "ingreso" | "egreso"; cantidad: number; motivo: string; facturaId?: number | null; observacion?: string | null; fecha?: Date },
) {
  // Regla 1 y 2: existencia nunca negativa, todo cambio deja movimiento en la misma transacción.
  const delta = args.tipo === "egreso" || args.tipo === "venta" ? -Math.abs(args.cantidad) : Math.abs(args.cantidad);
  const where = delta < 0
    ? and(eq(productos.id, args.productoId), sql`${productos.existencia} >= ${Math.abs(delta)}`)
    : eq(productos.id, args.productoId);

  const [updated] = await tx.update(productos)
    .set({ existencia: sql`${productos.existencia} + ${delta}`, updatedAt: new Date() })
    .where(where)
    .returning({ existencia: productos.existencia, id: productos.id, codigo: productos.codigo });

  if (!updated) {
    const prod = await tx.query.productos.findFirst({ where: eq(productos.id, args.productoId) });
    if (!prod) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    throw new ApiError(409, "STOCK_INSUFICIENTE", "Stock insuficiente.", [{ productoId: args.productoId, solicitado: Math.abs(delta), disponible: prod.existencia }]);
  }

  const [mov] = await tx.insert(movimientosStock).values({
    productoId: args.productoId,
    usuarioId: args.usuarioId,
    facturaId: args.facturaId ?? null,
    tipo: args.tipo,
    cantidad: delta,
    existenciaResultante: updated.existencia,
    motivo: args.motivo,
    observacion: args.observacion ?? null,
    fecha: args.fecha ?? new Date(),
  }).returning();

  return { movimiento: mov, existencia: updated.existencia, codigo: updated.codigo };
}

export async function createMovimientoManual(actor: SessionUser, productoId: number, input: unknown) {
  // RF-P4/RF-P5: ingreso/egreso manual, solo admin.
  assertAdmin(actor);
  const data = parseOrThrow(movimientoStockSchema, input);
  const motivosIngreso = ["Reposición", "Stock inicial", "Devolución de cliente"];
  const motivosEgreso = ["Rotura", "Vencimiento", "Ajuste de inventario", "Uso interno"];
  if (data.tipo === "ingreso" && !motivosIngreso.includes(data.motivo)) {
    throw new ApiError(422, "VALIDACION", "Motivo inválido para ingreso.", [{ campo: "motivo", mensaje: `Use: ${motivosIngreso.join(", ")}` }]);
  }
  if (data.tipo === "egreso" && !motivosEgreso.includes(data.motivo)) {
    throw new ApiError(422, "VALIDACION", "Motivo inválido para egreso.", [{ campo: "motivo", mensaje: `Use: ${motivosEgreso.join(", ")}` }]);
  }

  return db.transaction(async (tx) => {
    const prod = await tx.query.productos.findFirst({ where: eq(productos.id, productoId) });
    if (!prod) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    const res = await registrarMovimientoStock(tx, {
      productoId, usuarioId: actor.id, tipo: data.tipo, cantidad: data.cantidad, motivo: data.motivo, observacion: data.observacion,
    });
    return {
      id: res.movimiento.id,
      producto: { id: productoId, codigo: res.codigo },
      tipo: res.movimiento.tipo,
      cantidad: res.movimiento.cantidad,
      existenciaResultante: res.movimiento.existenciaResultante,
      motivo: res.movimiento.motivo,
      referencia: null,
      usuario: { id: actor.id, nombre: actor.nombre },
      fecha: res.movimiento.fecha,
    };
  });
}

export async function listMovimientosProducto(productoId: number, searchParams: URLSearchParams) {
  // RF-P6: historial por producto.
  const prod = await db.query.productos.findFirst({ where: eq(productos.id, productoId) });
  if (!prod) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const where = eq(movimientosStock.productoId, productoId);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movimientosStock).where(where);
  const rows = await db.query.movimientosStock.findMany({
    where, limit: pageSize, offset: (page - 1) * pageSize,
    with: { usuario: true, factura: true, producto: true },
    orderBy: (m, { desc }) => [desc(m.fecha), desc(m.id)],
  });
  return paged(rows.map(mapMovimiento), page, pageSize, Number(count));
}

export async function listMovimientos(searchParams: URLSearchParams) {
  // RF-P6: consulta global de movimientos.
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const productoId = searchParams.get("productoId");
  const tipo = searchParams.get("tipo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const where = and(
    productoId ? eq(movimientosStock.productoId, Number(productoId)) : undefined,
    tipo ? eq(movimientosStock.tipo, tipo as any) : undefined,
    desde ? sql`date(${movimientosStock.fecha} / 1000, 'unixepoch', '-3 hours') >= ${desde}` : undefined,
    hasta ? sql`date(${movimientosStock.fecha} / 1000, 'unixepoch', '-3 hours') <= ${hasta}` : undefined,
  );
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(movimientosStock).where(where);
  const rows = await db.query.movimientosStock.findMany({
    where, limit: pageSize, offset: (page - 1) * pageSize,
    with: { usuario: true, factura: true, producto: true },
    orderBy: (m, { desc }) => [desc(m.fecha), desc(m.id)],
  });
  return paged(rows.map(mapMovimiento), page, pageSize, Number(count));
}

function mapMovimiento(m: any) {
  return {
    id: m.id,
    producto: { id: m.producto.id, codigo: m.producto.codigo, descripcion: m.producto.descripcion },
    tipo: m.tipo,
    cantidad: m.cantidad,
    existenciaResultante: m.existenciaResultante,
    motivo: m.motivo,
    observacion: m.observacion,
    referencia: m.factura ? { facturaId: m.factura.id, numero: `${String(m.factura.puntoVenta).padStart(4, "0")}-${String(m.factura.numero).padStart(8, "0")}` } : null,
    usuario: { id: m.usuario.id, nombre: m.usuario.nombre },
    fecha: m.fecha,
  };
}
