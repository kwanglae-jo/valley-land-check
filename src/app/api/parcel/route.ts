import { NextRequest, NextResponse } from "next/server";
import { buildDemoParcel } from "@/lib/demo-data";
import type { ParcelApiResponse } from "@/lib/types";
import { getVWorldKey, lookupParcelLive } from "@/lib/vworld";

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseCoord(searchParams.get("lat"));
  const lng = parseCoord(searchParams.get("lng"));
  const pnu = searchParams.get("pnu");
  const forceDemo = searchParams.get("demo") === "1";

  if (lat == null || lng == null) {
    const body: ParcelApiResponse = {
      ok: false,
      error: "위도(lat)·경도(lng)가 필요합니다.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  if (lat < 33 || lat > 43 || lng < 124 || lng > 132) {
    const body: ParcelApiResponse = {
      ok: false,
      error: "대한민국 영역 밖의 좌표입니다.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const key = getVWorldKey();

  if (forceDemo || !key) {
    const data = buildDemoParcel(lat, lng, pnu);
    const body: ParcelApiResponse = { ok: true, data };
    return NextResponse.json(body);
  }

  try {
    const data = await lookupParcelLive(key, lat, lng);
    const body: ParcelApiResponse = { ok: true, data };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "필지 조회 중 오류가 발생했습니다.";

    const data = buildDemoParcel(lat, lng, pnu);
    const body: ParcelApiResponse = {
      ok: true,
      data: {
        ...data,
        address: data.address
          ? `${data.address} (실API 실패 → 데모 폴백: ${message})`
          : `실API 실패 → 데모 폴백: ${message}`,
      },
    };
    return NextResponse.json(body);
  }
}
