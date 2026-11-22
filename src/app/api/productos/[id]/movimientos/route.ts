import { api, adminApi, ok, readJson } from "@/server/http";
import { createMovimientoManual, listMovimientosProducto } from "@/server/stock-service";

export const GET = api(async ({ request, params }) => ok(await listMovimientosProducto(Number(params.id), request.nextUrl.searchParams)));
export const POST = adminApi(async ({ user, request, params }) => ok(await createMovimientoManual(user, Number(params.id), await readJson(request)), 201));
