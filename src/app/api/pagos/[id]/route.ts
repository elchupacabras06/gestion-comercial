import { api, ok } from "@/server/http";
import { getPago } from "@/server/pagos-service";

export const GET = api(async ({ params }) => ok(await getPago(Number(params.id))));
