import { adminApi, ok, readJson } from "@/server/http";
import { anularFactura } from "@/server/facturas-service";

export const POST = adminApi(async ({ user, params, request }) => ok(await anularFactura(user, Number(params.id), await readJson(request))));
