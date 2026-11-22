import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, movimientosStock, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { paginationSchema, paged, parseOrThrow } from "./validation";
import { productoCreateSchema, productoUpdateSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";

function assertAdmin(user: SessionUser) {
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
}

function mapProducto(p: any) {
  return {
    id: p.id,
    codigo: p.codigo,
    descripcion: p.descripcion,
    categoria: p.categoria ? { id: p.categoria.id, nombre: p.categoria.nombre } : null,
    precio: p.precio,
    existencia: p.existencia,
    stockMinimo: p.stockMinimo,
    bajoMinimo: p.existencia < p.stockMinimo,
    activo: p.activo,
  };
}

export async function listProductos(searchParams: URLSearchParams, actor?: SessionUser) {
  // RF-P1: catálogo con búsqueda, filtros y paginación.
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const q = searchParams.get("q")?.trim();
  const categoriaId = searchParams.get("categoriaId");
  const bajoMinimo = searchParams.get("bajoMinimo") === "true";
  const activoParam = searchParams.get("activo");
  let activoFilter: boolean | undefined = true;
  if (activoParam === "todos") {
    if (actor?.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "Solo admin puede ver productos inactivos.");
    activoFilter = undefined;
  } else if (activoParam === "false") {
    if (actor?.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "Solo admin puede ver productos inactivos.");
    activoFilter = false;
  }
  const where = and(
    q ? or(like(productos.codigo, `%${q}%`), like(productos.descripcion, `%${q}%`)) : undefined,
    categoriaId ? eq(productos.categoriaId, Number(categoriaId)) : undefined,
    bajoMinimo ? sql`${productos.existencia} < ${productos.stockMinimo}` : undefined,
    activoFilter === undefined ? undefined : eq(productos.activo, activoFilter),
  );
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productos).where(where);
  const rows = await db.query.productos.findMany({
    where, limit: pageSize, offset: (page - 1) * pageSize,
    with: { categoria: true },
    orderBy: (p, { asc }) => [asc(p.descripcion)],
  });
  return paged(rows.map(mapProducto), page, pageSize, Number(count));
}

export async function getProducto(id: number) {
  const p = await db.query.productos.findFirst({ where: eq(productos.id, id), with: { categoria: true } });
  if (!p) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  return mapProducto(p);
}

export async function createProducto(actor: SessionUser, input: unknown) {
  // RF-P2: alta de producto. La existencia no se edita a mano; stock inicial genera ingreso.
  assertAdmin(actor);
  const data = parseOrThrow(productoCreateSchema, input);
  const dup = await db.query.productos.findFirst({ where: eq(productos.codigo, data.codigo) });
  if (dup) throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.");
  const cat = await db.query.categorias.findFirst({ where: eq(categorias.id, data.categoriaId) });
  if (!cat) throw new ApiError(422, "VALIDACION", "Categoría inválida.", [{ campo: "categoriaId", mensaje: "Categoría no encontrada." }]);

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(productos).values({
      codigo: data.codigo,
      descripcion: data.descripcion,
      categoriaId: data.categoriaId,
      precio: data.precio,
      stockMinimo: data.stockMinimo,
      existencia: 0,
      activo: true,
    }).returning();
    if (data.stockInicial && data.stockInicial > 0) {
      await tx.update(productos).set({ existencia: data.stockInicial }).where(eq(productos.id, created.id));
      await tx.insert(movimientosStock).values({
        productoId: created.id, usuarioId: actor.id, tipo: "ingreso",
        cantidad: data.stockInicial, existenciaResultante: data.stockInicial,
        motivo: "Stock inicial", fecha: new Date(),
      });
      created.existencia = data.stockInicial;
    }
    const full = await tx.query.productos.findFirst({ where: eq(productos.id, created.id), with: { categoria: true } });
    return mapProducto(full);
  });
}

export async function updateProducto(actor: SessionUser, id: number, input: unknown) {
  // RF-P2/RF-P3: edición y baja lógica. existencia no se acepta.
  assertAdmin(actor);
  const raw = input as Record<string, unknown>;
  if (raw && Object.prototype.hasOwnProperty.call(raw, "existencia")) {
    throw new ApiError(422, "VALIDACION", "La existencia no se puede editar directamente.", [{ campo: "existencia", mensaje: "Use ingresos/egresos de stock." }]);
  }
  const data = parseOrThrow(productoUpdateSchema, input);
  const existing = await db.query.productos.findFirst({ where: eq(productos.id, id) });
  if (!existing) throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  if (data.codigo) {
    const dup = await db.query.productos.findFirst({ where: eq(productos.codigo, data.codigo) });
    if (dup && dup.id !== id) throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.");
  }
  if (data.categoriaId) {
    const cat = await db.query.categorias.findFirst({ where: eq(categorias.id, data.categoriaId) });
    if (!cat) throw new ApiError(422, "VALIDACION", "Categoría inválida.", [{ campo: "categoriaId", mensaje: "Categoría no encontrada." }]);
  }
  await db.update(productos).set({ ...data, updatedAt: new Date() }).where(eq(productos.id, id));
  return getProducto(id);
}
