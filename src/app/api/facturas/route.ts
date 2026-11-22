import { api, ok, readJson } from "@/server/http";
import { createFactura, listFacturas } from "@/server/facturas-service";

export const GET = api(async ({ request }) => ok(await listFacturas(request.nextUrl.searchParams)));
export const POST = api(async ({ user, request }) => ok(await createFactura(user, await readJson(request)), 201));
