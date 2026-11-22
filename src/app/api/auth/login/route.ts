import { login } from "@/server/auth-service";
import { noContent, ok, publicApi, readJson } from "@/server/http";

export const POST = publicApi(async ({ request }) => {
  const body = await readJson(request);
  const user = await login(body);
  return ok(user);
});
