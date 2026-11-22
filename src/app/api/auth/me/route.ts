import { api, ok } from "@/server/http";

export const GET = api(async ({ user }) => ok(user));
