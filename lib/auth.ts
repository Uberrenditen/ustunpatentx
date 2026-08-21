import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "upx_session";

export function expectedSessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  const secret = process.env.AUTH_SECRET?.trim() || password;
  return createHmac("sha256", secret).update(password).digest("hex");
}

export async function isAdminSession(): Promise<boolean> {
  const expected = expectedSessionToken();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === expected;
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdminSession()) return null;
  return Response.json({ error: "Oturum açık değil" }, { status: 401 });
}
