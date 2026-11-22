import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { parseOrThrow } from "./validation";
import { categoriaCreateSchema, categoriaUpdateSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";

function assertAdmin(user: SessionUser) {
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
}

export async function listCategorias(searchParams?: URLSearchParams) {
  // RF-P7: listado de categorías activas, sin paginar. Admin puede pedir todas para gestión.
  const todas = searchParams?.get("activas") === "todas";
  return db.query.categorias.findMany({
    where: todas ? undefined : eq(categorias.activa, true),
    orderBy: (c, { asc }) => [asc(c.nombre)],
  });
}

export async function createCategoria(actor: SessionUser, input: unknown) {
  // RF-P7: alta de categoría.
  assertAdmin(actor);
  const data = parseOrThrow(categoriaCreateSchema, input);
  const exists = await db.query.categorias.findFirst({ where: eq(categorias.nombre, data.nombre) });
  if (exists) throw new ApiError(409, "NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  const [created] = await db.insert(categorias).values({ nombre: data.nombre, activa: true }).returning();
  return created;
}

export async function updateCategoria(actor: SessionUser, id: number, input: unknown) {
  // RF-P7: edición/baja de categoría.
  assertAdmin(actor);
  const data = parseOrThrow(categoriaUpdateSchema, input);
  const existing = await db.query.categorias.findFirst({ where: eq(categorias.id, id) });
  if (!existing) throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
  if (data.nombre) {
    const dup = await db.query.categorias.findFirst({ where: eq(categorias.nombre, data.nombre) });
    if (dup && dup.id !== id) throw new ApiError(409, "NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  }
  if (data.activa === false) {
    const [{ activos }] = await db.select({ activos: sql<number>`count(*)` }).from(productos).where(and(eq(productos.categoriaId, id), eq(productos.activo, true)));
    if (Number(activos) > 0) throw new ApiError(409, "CATEGORIA_EN_USO", "La categoría tiene productos activos.");
  }
  const [updated] = await db.update(categorias).set({ ...data, updatedAt: new Date() }).where(eq(categorias.id, id)).returning();
  return updated;
}
