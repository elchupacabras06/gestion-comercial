import { api, ok } from "@/server/http";
import { getCuentaCorriente } from "@/server/clientes-service";

export const GET = api(async ({ params, request }) => ok(await getCuentaCorriente(Number(params.id), request.nextUrl.searchParams)));
