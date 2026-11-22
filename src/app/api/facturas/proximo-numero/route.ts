import { api, ok } from "@/server/http";
import { getProximoNumero } from "@/server/facturas-service";

export const GET = api(async () => ok(await getProximoNumero()));
