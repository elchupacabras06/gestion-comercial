import { adminApi, api, ok, readJson } from "@/server/http";
import { createUsuario, listUsuarios } from "@/server/usuarios-service";

export const GET = adminApi(async ({ request, user }) => ok(await listUsuarios(user, request.nextUrl.searchParams)));
export const POST = adminApi(async ({ request, user }) => ok(await createUsuario(user, await readJson(request)), 201));
