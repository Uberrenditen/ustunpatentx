import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { regenerateTodayQueue } from "@/lib/generate";
import { previewQueue } from "@/lib/publish";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const generated = await regenerateTodayQueue();
  const preview = await previewQueue();
  return NextResponse.json({ ok: true, ...generated, preview });
}
