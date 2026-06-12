import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { FIFA_MATCHES_TAG } from "@/lib/fifa";

export async function POST() {
  revalidateTag(FIFA_MATCHES_TAG, "max");

  return NextResponse.json({
    ok: true,
    revalidatedAt: new Date().toISOString(),
  });
}
