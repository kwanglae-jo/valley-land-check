import { NextRequest, NextResponse } from "next/server";
import { buildDemoParcelsInBbox } from "@/lib/demo-data";
import type { ParcelsApiResponse } from "@/lib/types";
import { fetchParcelsByBbox, getVWorldKey } from "@/lib/vworld";

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const west = parseCoord(searchParams.get("west"));
  const south = parseCoord(searchParams.get("south"));
  const east = parseCoord(searchParams.get("east"));
  const north = parseCoord(searchParams.get("north"));
  const forceDemo = searchParams.get("demo") === "1";

  if (west == null || south == null || east == null || north == null) {
    const body: ParcelsApiResponse = {
      ok: false,
      error: "지도 범위(west, south, east, north)가 필요합니다.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const key = getVWorldKey();
  if (forceDemo || !key) {
    const data = buildDemoParcelsInBbox(west, south, east, north);
    const body: ParcelsApiResponse = { ok: true, data, source: "demo" };
    return NextResponse.json(body);
  }

  try {
    const data = await fetchParcelsByBbox(key, west, south, east, north);
    const body: ParcelsApiResponse = { ok: true, data, source: "live" };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "필지 목록 조회에 실패했습니다.";
    const data = buildDemoParcelsInBbox(west, south, east, north);
    const body: ParcelsApiResponse = { ok: true, data, source: "demo" };
    // 폴백이어도 클라이언트는 필지를 눌러 선택할 수 있어야 합니다.
    void message;
    return NextResponse.json(body);
  }
}
