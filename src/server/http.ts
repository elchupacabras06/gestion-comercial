import { NextRequest } from "next/server";
import { ZodType } from "zod";
import { ApiError, errorResponse } from "@/lib/errors";
import { getSessionUser, requireAdmin, requireSessionUser, type SessionUser } from "@/lib/auth";
import { parseOrThrow } from "./validation";

type Ctx = { request: NextRequest; user: SessionUser; params: Record<string, string> };

export function api(handler: (ctx: Ctx) => Promise<Response>) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await requireSessionUser();
      const params = (await context?.params) ?? {};
      return await handler({ request, user, params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function adminApi(handler: (ctx: Ctx) => Promise<Response>) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await requireAdmin();
      const params = (await context?.params) ?? {};
      return await handler({ request, user, params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function publicApi(handler: (ctx: { request: NextRequest; params: Record<string, string> }) => Promise<Response>) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const params = (await context?.params) ?? {};
      return await handler({ request, params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson<T>(request: NextRequest, schema?: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo no es JSON válido.");
  }
  if (schema) return parseOrThrow(schema, body);
  return body as T;
}

export function ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export { getSessionUser };
