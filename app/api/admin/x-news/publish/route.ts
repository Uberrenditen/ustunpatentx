import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { publishNext } from "@/lib/publish";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await publishNext({ force: true, manual: true, maxPosts: 1 });
  return NextResponse.json(
    {
      ...result,
      error: result.ok ? undefined : result.reason,
      errorCode: result.errorCode,
    },
    { status: result.ok ? 200 : 500 },
  );
}
