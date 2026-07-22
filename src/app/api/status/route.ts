import { NextResponse } from "next/server";
import { getVWorldDomain, hasVWorldKey } from "@/lib/vworld";

export async function GET() {
  const live = hasVWorldKey();
  return NextResponse.json({
    ok: true,
    mode: live ? "live" : "demo",
    live,
    domain: getVWorldDomain(),
    message: live
      ? "브이월드 키가 설정되어 실제 지적·소유구분 조회를 시도합니다."
      : "키가 없어 데모(연습용) 필지를 보여 줍니다. VWORLD_API_KEY를 넣으면 실데이터가 됩니다.",
    apply: {
      vworld: "https://www.vworld.kr/dev/v4api.do",
      cadastral: "https://www.data.go.kr/data/15056910/openapi.do",
      landForest: "https://www.data.go.kr/data/15123884/openapi.do",
      landOwner: "https://www.data.go.kr/data/15123976/openapi.do",
      note:
        "k-skill(NomaDamas/k-skill)에는 연속지적·소유구분 API가 없습니다. 브이월드 Data/WFS를 직접 씁니다. 검색용 VWorld 패턴만 참고했습니다.",
    },
  });
}
