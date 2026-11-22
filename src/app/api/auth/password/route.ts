import { changePassword } from "@/server/auth-service";
import { api, noContent, readJson } from "@/server/http";

export const PUT = api(async ({ request, user }) => {
  await changePassword(user, await readJson(request));
  return noContent();
});
