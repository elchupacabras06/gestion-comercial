import { api, ok, readJson } from "@/server/http";
import { getCliente, updateCliente } from "@/server/clientes-service";

export const GET = api(async ({ params }) => ok(await getCliente(Number(params.id))));
export const PATCH = api(async ({ request, params }) => ok(await updateCliente(Number(params.id), await readJson(request))));
