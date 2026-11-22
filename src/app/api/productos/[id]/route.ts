import { api, adminApi, ok, readJson } from "@/server/http";
import { getProducto, updateProducto } from "@/server/productos-service";

export const GET = api(async ({ params }) => ok(await getProducto(Number(params.id))));
export const PATCH = adminApi(async ({ user, request, params }) => ok(await updateProducto(user, Number(params.id), await readJson(request))));
