import { adminApi, ok, readJson } from "@/server/http";
import { updateCategoria } from "@/server/categorias-service";

export const PATCH = adminApi(async ({ user, request, params }) => ok(await updateCategoria(user, Number(params.id), await readJson(request))));
