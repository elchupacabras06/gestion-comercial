import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "./errors";

const COOKIE_NAME = "gc_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  sub: number;
  email: string;
  rol: "admin" | "vendedor";
  iat: number;
  exp: number;
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET inválido");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "iat" | "exp">) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + MAX_AGE_SECONDS;
  const body = Buffer.from(JSON.stringify({ ...payload, iat, exp })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await db.query.usuarios.findFirst({ where: eq(usuarios.id, payload.sub) });
  if (!user || !user.activo) return null;
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
  return user;
}

export async function requireAdmin() {
  const user = await requireSessionUser();
  if (user.rol !== "admin") throw new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
