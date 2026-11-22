import { api, adminApi, ok, readJson } from "@/server/http";
import { createProducto, listProductos } from "@/server/productos-service";

export const GET = api(async ({ request, user }) => ok(await listProductos(request.nextUrl.searchParams, user)));
export const POST = adminApi(async ({ user, request }) => ok(await createProducto(user, await readJson(request)), 201));
