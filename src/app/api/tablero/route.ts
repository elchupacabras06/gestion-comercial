import { api, ok } from "@/server/http";
import { getTablero } from "@/server/tablero-service";

export const GET = api(async () => ok(await getTablero()));
