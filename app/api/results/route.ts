import { NextResponse } from "next/server";
import { getWorldCupDashboard } from "@/lib/fifa";

export async function GET() {
  const dashboard = await getWorldCupDashboard();
  return NextResponse.json(dashboard);
}
