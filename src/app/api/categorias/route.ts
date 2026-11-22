import { api, adminApi, ok, readJson } from "@/server/http";
import { createCategoria, listCategorias } from "@/server/categorias-service";

export const GET = api(async ({ request }) => ok(await listCategorias(request.nextUrl.searchParams)));
export const POST = adminApi(async ({ user, request }) => ok(await createCategoria(user, await readJson(request)), 201));
