import { buildVerdict, classifyOwnership } from "./ownership";
import type { ParcelResult } from "./types";

type DemoSpot = {
  name: string;
  lat: number;
  lng: number;
  pnu: string;
  address: string;
  jimok: string;
  jimokCode: string;
  ownershipLabel: string;
  ownershipCode: string;
  area: number;
};

/** API 키 없이도 동작을 확인할 수 있는 계곡·하천 인근 예시 지점 */
const DEMO_SPOTS: DemoSpot[] = [
  {
    name: "가평 계곡 인근(예시)",
    lat: 37.8312,
    lng: 127.5104,
    pnu: "4182025021100010000",
    address: "경기도 가평군 설악면 (데모 필지)",
    jimok: "임야",
    jimokCode: "05",
    ownershipLabel: "개인",
    ownershipCode: "01",
    area: 1240,
  },
  {
    name: "양평 계곡 인근(예시)",
    lat: 37.4918,
    lng: 127.4876,
    pnu: "4183034022100450001",
    address: "경기도 양평군 옥천면 (데모 필지)",
    jimok: "하천",
    jimokCode: "17",
    ownershipLabel: "국유",
    ownershipCode: "02",
    area: 830,
  },
  {
    name: "포천 계곡 인근(예시)",
    lat: 38.0965,
    lng: 127.2912,
    pnu: "4165033025100120000",
    address: "경기도 포천시 영북면 (데모 필지)",
    jimok: "잡종지",
    jimokCode: "28",
    ownershipLabel: "공유",
    ownershipCode: "03",
    area: 560,
  },
];

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function squareAround(lat: number, lng: number, meters = 35) {
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - dLng, lat - dLat],
        [lng + dLng, lat - dLat],
        [lng + dLng, lat + dLat],
        [lng - dLng, lat + dLat],
        [lng - dLng, lat - dLat],
      ],
    ],
  };
}

export function buildDemoParcel(lat: number, lng: number): ParcelResult {
  const nearest = DEMO_SPOTS.reduce(
    (best, spot) => {
      const d = distanceMeters(lat, lng, spot.lat, spot.lng);
      if (!best || d < best.distance) return { spot, distance: d };
      return best;
    },
    null as { spot: DemoSpot; distance: number } | null,
  );

  // 가까운 예시가 없으면, 좌표 해시로 사유지/공공을 번갈아 보여줍니다.
  const useNearest = nearest && nearest.distance < 25000;
  const hash = Math.abs(Math.floor(lat * 1000) + Math.floor(lng * 1000));
  const fallback = DEMO_SPOTS[hash % DEMO_SPOTS.length];
  const spot = useNearest ? nearest!.spot : fallback;

  const kind = classifyOwnership(spot.ownershipCode, spot.ownershipLabel);

  return {
    lat,
    lng,
    pnu: spot.pnu,
    address: useNearest
      ? spot.address
      : `${spot.address} · 현재 좌표 기준 데모 응답`,
    jimok: spot.jimok,
    jimokCode: spot.jimokCode,
    ownershipLabel: spot.ownershipLabel,
    ownershipCode: spot.ownershipCode,
    area: spot.area,
    geometry: squareAround(lat, lng),
    verdict: buildVerdict(kind, spot.ownershipLabel, spot.jimok),
    source: "demo",
    fetchedAt: new Date().toISOString(),
  };
}

export const DEMO_CENTER = {
  lat: 37.8312,
  lng: 127.5104,
  label: "가평 설악면 일대",
};
