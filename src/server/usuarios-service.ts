import bcrypt from "bcryptjs";
import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { paginationSchema, paged, parseOrThrow } from "./validation";
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/lib/schemas";
import type { SessionUser } from "@/lib/auth";

function assertAdmin(user: SessionUser) {
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
}

export async function listUsuarios(actor: SessionUser, searchParams: URLSearchParams) {
  // RF-U4: gestión de usuarios, solo admin.
  assertAdmin(actor);
  const { page, pageSize } = parseOrThrow(paginationSchema, Object.fromEntries(searchParams));
  const q = searchParams.get("q")?.trim();
  const activo = searchParams.get("activo");
  const where = and(
    q ? or(like(usuarios.nombre, `%${q}%`), like(usuarios.email, `%${q}%`)) : undefined,
    activo === "true" ? eq(usuarios.activo, true) : activo === "false" ? eq(usuarios.activo, false) : undefined,
  );
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usuarios).where(where);
  const data = await db.query.usuarios.findMany({
    where, limit: pageSize, offset: (page - 1) * pageSize, orderBy: (u, { asc }) => [asc(u.nombre)],
    columns: { passwordHash: false },
  });
  return paged(data, page, pageSize, Number(count));
}

export async function createUsuario(actor: SessionUser, input: unknown) {
  // RF-U4: alta de usuario.
  assertAdmin(actor);
  const data = parseOrThrow(usuarioCreateSchema, input);
  const email = data.email.toLowerCase();
  const exists = await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) });
  if (exists) throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const [created] = await db.insert(usuarios).values({ ...data, email, passwordHash }).returning({
    id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email, rol: usuarios.rol, activo: usuarios.activo,
  });
  return created;
}

export async function updateUsuario(actor: SessionUser, id: number, input: unknown) {
  // RF-U4: edición/desactivación de usuario.
  assertAdmin(actor);
  const data = parseOrThrow(usuarioUpdateSchema, input);
  if (id === actor.id && (data.activo === false || (data.rol && data.rol !== "admin"))) {
    throw new ApiError(422, "OPERACION_SOBRE_SI_MISMO", "No puede desactivarse ni quitarse el rol de administrador.");
  }
  const existing = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
  if (!existing) throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  if (data.email) {
    const email = data.email.toLowerCase();
    const dup = await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) });
    if (dup && dup.id !== id) throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
    data.email = email;
  }
  const [updated] = await db.update(usuarios).set({ ...data, updatedAt: new Date() }).where(eq(usuarios.id, id)).returning({
    id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email, rol: usuarios.rol, activo: usuarios.activo,
  });
  return updated;
}

export async function resetPassword(actor: SessionUser, id: number) {
  // RF-U5: admin restablece contraseña.
  assertAdmin(actor);
  const existing = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
  if (!existing) throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  const passwordTemporal = Math.random().toString(36).slice(-10) + "A1";
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);
  await db.update(usuarios).set({ passwordHash, updatedAt: new Date() }).where(eq(usuarios.id, id));
  return { passwordTemporal };
}
