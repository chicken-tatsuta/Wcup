import { NextResponse } from "next/server";
import { getWorldCupDashboard } from "@/lib/fifa";

export const dynamic = "force-dynamic";

export async function GET() {
  const dashboard = await getWorldCupDashboard();
  return NextResponse.json(dashboard);
}
