import { adminApi, ok } from "@/server/http";
import { resetPassword } from "@/server/usuarios-service";

export const POST = adminApi(async ({ user, params }) => ok(await resetPassword(user, Number(params.id))));
