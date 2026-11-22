import { z } from "zod";
import { ApiError } from "@/lib/errors";

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({
    campo: issue.path.join(".") || "body",
    mensaje: issue.message,
  }));
  throw new ApiError(422, "VALIDACION", "Hay campos con errores.", details);
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paged<T>(data: T[], page: number, pageSize: number, total: number) {
  return { data, page, pageSize, total };
}
