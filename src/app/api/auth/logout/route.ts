import { logout } from "@/server/auth-service";
import { api, noContent } from "@/server/http";

export const POST = api(async () => {
  await logout();
  return noContent();
});
