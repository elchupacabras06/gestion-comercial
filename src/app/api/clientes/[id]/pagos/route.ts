import { api, ok, readJson } from "@/server/http";
import { createPago } from "@/server/pagos-service";

export const POST = api(async ({ user, params, request }) => ok(await createPago(user, Number(params.id), await readJson(request)), 201));
