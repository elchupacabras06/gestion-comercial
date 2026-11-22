import { api, ok, readJson } from "@/server/http";
import { createCliente, listClientes } from "@/server/clientes-service";

export const GET = api(async ({ request }) => ok(await listClientes(request.nextUrl.searchParams)));
export const POST = api(async ({ request }) => ok(await createCliente(await readJson(request)), 201));
