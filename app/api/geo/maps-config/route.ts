import { requireCuantiva } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim() ?? "";
  return NextResponse.json({ key: key || null });
}
