import { buildVerdict, classifyOwnership } from "./ownership";
import type { ParcelGeometry, ParcelResult, ParcelSummary } from "./types";

type DemoSeed = {
  row: number;
  col: number;
  jimok: string;
  jimokCode: string;
  ownershipLabel: string;
  ownershipCode: string;
  label: string;
};

/** 가평 설악면 일대에 눌러 고를 수 있는 데모 필지 격자 */
const SEEDS: DemoSeed[] = [
  { row: 0, col: 0, jimok: "임야", jimokCode: "05", ownershipLabel: "개인", ownershipCode: "01", label: "임야 A" },
  { row: 0, col: 1, jimok: "임야", jimokCode: "05", ownershipLabel: "개인", ownershipCode: "01", label: "임야 B" },
  { row: 0, col: 2, jimok: "하천", jimokCode: "17", ownershipLabel: "국유", ownershipCode: "02", label: "하천" },
  { row: 1, col: 0, jimok: "전", jimokCode: "01", ownershipLabel: "개인", ownershipCode: "01", label: "밭" },
  { row: 1, col: 1, jimok: "잡종지", jimokCode: "28", ownershipLabel: "공유", ownershipCode: "03", label: "잡종지" },
  { row: 1, col: 2, jimok: "임야", jimokCode: "05", ownershipLabel: "법인", ownershipCode: "11", label: "임야 C" },
  { row: 2, col: 0, jimok: "도로", jimokCode: "14", ownershipLabel: "시유", ownershipCode: "06", label: "도로" },
  { row: 2, col: 1, jimok: "구거", jimokCode: "18", ownershipLabel: "국유", ownershipCode: "02", label: "구거" },
  { row: 2, col: 2, jimok: "임야", jimokCode: "05", ownershipLabel: "개인", ownershipCode: "01", label: "임야 D" },
  { row: -1, col: 0, jimok: "답", jimokCode: "02", ownershipLabel: "개인", ownershipCode: "01", label: "논" },
  { row: -1, col: 1, jimok: "유지", jimokCode: "19", ownershipLabel: "공유", ownershipCode: "03", label: "유지" },
  { row: 0, col: -1, jimok: "임야", jimokCode: "05", ownershipLabel: "개인", ownershipCode: "01", label: "임야 E" },
  { row: 1, col: -1, jimok: "목장용지", jimokCode: "04", ownershipLabel: "법인", ownershipCode: "11", label: "목장" },
  { row: 2, col: -1, jimok: "공원", jimokCode: "22", ownershipLabel: "군유", ownershipCode: "05", label: "공원" },
];

export const DEMO_CENTER = {
  lat: 37.8312,
  lng: 127.5104,
  label: "가평 설악면 일대",
};

const CELL_LAT = 0.00055;
const CELL_LNG = 0.0007;

function polygonFor(row: number, col: number): { geometry: ParcelGeometry; lat: number; lng: number; area: number } {
  const lat = DEMO_CENTER.lat + row * CELL_LAT;
  const lng = DEMO_CENTER.lng + col * CELL_LNG;
  // 필지마다 살짝 다른 모양으로 보이게 모서리를 비틀습니다.
  const wobble = ((row * 3 + col * 7) % 5) * 0.00002;
  const h = CELL_LAT * 0.42;
  const w = CELL_LNG * 0.42;
  const geometry: ParcelGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [lng - w + wobble, lat - h],
        [lng + w, lat - h + wobble],
        [lng + w - wobble, lat + h],
        [lng - w, lat + h - wobble],
        [lng - w + wobble, lat - h],
      ],
    ],
  };
  return { geometry, lat, lng, area: Math.round(780 + Math.abs(row * 40) + Math.abs(col * 55)) };
}

function toSummary(seed: DemoSeed): ParcelSummary {
  const { geometry, lat, lng, area } = polygonFor(seed.row, seed.col);
  const pnu = `4182025021${String(1000 + (seed.row + 5) * 10 + (seed.col + 5)).padStart(4, "0")}000`;
  return {
    id: pnu,
    pnu,
    address: `경기도 가평군 설악면 (${seed.label})`,
    lat,
    lng,
    geometry,
    jimok: seed.jimok,
    jimokCode: seed.jimokCode,
    ownershipLabel: seed.ownershipLabel,
    ownershipCode: seed.ownershipCode,
    area,
  };
}

const ALL_DEMO_PARCELS = SEEDS.map(toSummary);

function pointInBbox(
  lat: number,
  lng: number,
  west: number,
  south: number,
  east: number,
  north: number,
) {
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export function buildDemoParcelsInBbox(
  west: number,
  south: number,
  east: number,
  north: number,
): ParcelSummary[] {
  return ALL_DEMO_PARCELS.filter((p) => pointInBbox(p.lat, p.lng, west, south, east, north));
}

export function findDemoParcelByPnu(pnu: string): ParcelSummary | null {
  return ALL_DEMO_PARCELS.find((p) => p.pnu === pnu) ?? null;
}

export function findNearestDemoParcel(lat: number, lng: number): ParcelSummary {
  return ALL_DEMO_PARCELS.reduce((best, parcel) => {
    const d =
      (parcel.lat - lat) ** 2 + (parcel.lng - lng) ** 2;
    const bestD = (best.lat - lat) ** 2 + (best.lng - lng) ** 2;
    return d < bestD ? parcel : best;
  });
}

export function buildDemoParcelFromSummary(parcel: ParcelSummary): ParcelResult {
  const kind = classifyOwnership(parcel.ownershipCode, parcel.ownershipLabel);
  return {
    lat: parcel.lat,
    lng: parcel.lng,
    pnu: parcel.pnu,
    address: parcel.address,
    jimok: parcel.jimok,
    jimokCode: parcel.jimokCode,
    ownershipLabel: parcel.ownershipLabel,
    ownershipCode: parcel.ownershipCode,
    area: parcel.area,
    geometry: parcel.geometry,
    verdict: buildVerdict(kind, parcel.ownershipLabel, parcel.jimok),
    source: "demo",
    fetchedAt: new Date().toISOString(),
  };
}

export function buildDemoParcel(lat: number, lng: number, pnu?: string | null): ParcelResult {
  if (pnu) {
    const byPnu = findDemoParcelByPnu(pnu);
    if (byPnu) return buildDemoParcelFromSummary(byPnu);
  }
  return buildDemoParcelFromSummary(findNearestDemoParcel(lat, lng));
}
