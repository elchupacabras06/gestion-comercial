import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "@/lib/errors";
import { parseOrThrow } from "./validation";
import { z } from "zod";
import { createSessionToken, setSessionCookie, clearSessionCookie, type SessionUser } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

const passwordSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function login(input: unknown) {
  // RF-U1: inicio de sesión con email y contraseña.
  const data = parseOrThrow(loginSchema, input);
  const user = await db.query.usuarios.findFirst({ where: eq(usuarios.email, data.email.toLowerCase()) });
  if (!user || !user.activo) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  const token = createSessionToken({ sub: user.id, email: user.email, rol: user.rol });
  await setSessionCookie(token);
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

export async function logout() {
  // RF-U1: cierre de sesión.
  await clearSessionCookie();
}

export async function changePassword(user: SessionUser, input: unknown) {
  // RF-U5: cada usuario puede cambiar su contraseña.
  const data = parseOrThrow(passwordSchema, input);
  const dbUser = await db.query.usuarios.findFirst({ where: eq(usuarios.id, user.id) });
  if (!dbUser) throw new ApiError(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
  const ok = await bcrypt.compare(data.actual, dbUser.passwordHash);
  if (!ok) throw new ApiError(422, "CONTRASENA_ACTUAL_INCORRECTA", "La contraseña actual es incorrecta.");
  const hash = await bcrypt.hash(data.nueva, 10);
  await db.update(usuarios).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(usuarios.id, user.id));
}
