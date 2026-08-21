import { NextResponse } from "next/server";
import { publishNext } from "@/lib/publish";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (secret && header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const result = await publishNext();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
