import { api, ok } from "@/server/http";
import { getFactura } from "@/server/facturas-service";

export const GET = api(async ({ params }) => ok(await getFactura(Number(params.id))));
