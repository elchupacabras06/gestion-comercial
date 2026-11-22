import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./local.db"),
  TURSO_AUTH_TOKEN: z.string().optional(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET debe tener al menos 16 caracteres"),
  PUNTO_VENTA: z.string().regex(/^\d{4}$/).default("0001"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  AUTH_SECRET: process.env.AUTH_SECRET,
  PUNTO_VENTA: process.env.PUNTO_VENTA,
});

if (!parsed.success) {
  console.error("Variables de entorno inválidas", parsed.error.flatten().fieldErrors);
  throw new Error("Configuración de entorno inválida");
}

export const env = parsed.data;
