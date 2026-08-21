import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { previewGeneratedPost } from "@/lib/generate";
import { loadPublisherConfig } from "@/lib/publisher-config";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const publisher = await loadPublisherConfig();
    const generated = await previewGeneratedPost(publisher);
    return NextResponse.json({
      ok: true,
      preview: {
        tweets: [
          {
            ticker: generated.ticker,
            text: generated.text,
            chars: generated.text.length,
            posted: false,
            hour: null,
          },
        ],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Üretim başarısız" },
      { status: 500 },
    );
  }
}
