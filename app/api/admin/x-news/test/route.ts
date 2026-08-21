import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { verifyXConnection } from "@/lib/x-api";
import { resolveXApiConfig } from "@/lib/store";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const cfg = await resolveXApiConfig();
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "Anahtarlar eksik", errorCode: "generic" }, { status: 400 });
  }
  const result = await verifyXConnection(cfg);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errorCode: result.errorCode, error: result.error },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true, handle: result.handle });
}
