import { api, ok } from "@/server/http";
import { listMovimientos } from "@/server/stock-service";

export const GET = api(async ({ request }) => ok(await listMovimientos(request.nextUrl.searchParams)));
