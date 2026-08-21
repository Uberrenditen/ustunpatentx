import { NextResponse } from "next/server";
import { expectedSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const expected = expectedSessionToken();
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD fehlt in der Umgebung" },
      { status: 500 },
    );
  }
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password !== process.env.ADMIN_PASSWORD?.trim()) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
