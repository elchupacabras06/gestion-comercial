import { adminApi, ok, readJson } from "@/server/http";
import { updateUsuario } from "@/server/usuarios-service";

export const PATCH = adminApi(async ({ request, user, params }) => ok(await updateUsuario(user, Number(params.id), await readJson(request))));
