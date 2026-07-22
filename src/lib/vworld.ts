import {
  buildVerdict,
  classifyOwnership,
  jimokName,
  ownershipName,
} from "./ownership";
import type { ParcelGeometry, ParcelResult } from "./types";

const VWORLD_DATA_URL = "https://api.vworld.kr/req/data";

type VWorldFeature = {
  type?: string;
  id?: string;
  properties?: Record<string, unknown>;
  geometry?: ParcelGeometry;
};

type VWorldFeatureCollection = {
  type?: string;
  features?: VWorldFeature[];
};

function asString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pick(props: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(props[key]);
    if (value) return value;
  }
  // 대소문자 무시 매칭
  const lowerMap = new Map(
    Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = asString(lowerMap.get(key.toLowerCase()));
    if (value) return value;
  }
  return null;
}

async function fetchVWorldFeatures(params: Record<string, string>): Promise<VWorldFeature[]> {
  const url = new URL(VWORLD_DATA_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`VWorld 응답 오류 (${response.status})`);
  }

  const json = (await response.json()) as {
    response?: {
      status?: string;
      result?: { featureCollection?: VWorldFeatureCollection };
      error?: { text?: string; level?: string; code?: string };
    };
  };

  const status = json.response?.status;
  if (status && status !== "OK") {
    const message = json.response?.error?.text ?? `VWorld status: ${status}`;
    throw new Error(message);
  }

  return json.response?.result?.featureCollection?.features ?? [];
}

/** 좌표 주변 연속지적도 필지 조회 */
export async function fetchCadastralByPoint(
  key: string,
  lat: number,
  lng: number,
): Promise<VWorldFeature | null> {
  // 약 40m 버퍼의 작은 bbox로 해당 위치 필지를 찾습니다.
  const pad = 0.00018;
  const geomFilter = `BOX(${lng - pad},${lat - pad},${lng + pad},${lat + pad})`;

  const features = await fetchVWorldFeatures({
    service: "data",
    request: "GetFeature",
    data: "LP_PA_CBND_BUBUN",
    key,
    format: "json",
    size: "10",
    geometry: "true",
    attribute: "true",
    crs: "EPSG:4326",
    geomFilter,
  });

  if (!features.length) return null;

  // 포인트에 가장 가까운 중심의 피처를 우선 선택
  return features[0] ?? null;
}

/** 토지임야(속성) 정보 조회 — PNU 기준 */
export async function fetchLandAttributeByPnu(
  key: string,
  pnu: string,
): Promise<Record<string, unknown> | null> {
  // 브이월드 토지임야 관련 데이터셋 ID 후보를 순차 시도
  const datasetCandidates = [
    "LT_C_LHLDINFO",
    "LP_PA_CBND_BUBUN",
    "LT_C_ADEMD_INFO",
  ];

  for (const data of datasetCandidates) {
    try {
      const features = await fetchVWorldFeatures({
        service: "data",
        request: "GetFeature",
        data,
        key,
        format: "json",
        size: "1",
        geometry: "false",
        attribute: "true",
        crs: "EPSG:4326",
        attrFilter: `pnu:=:${pnu}`,
      });

      const props = features[0]?.properties;
      if (props && Object.keys(props).length > 0) {
        return props;
      }
    } catch {
      // 다음 데이터셋 시도
    }
  }

  return null;
}

export async function lookupParcelLive(
  key: string,
  lat: number,
  lng: number,
): Promise<ParcelResult> {
  const cadastral = await fetchCadastralByPoint(key, lat, lng);
  if (!cadastral?.properties) {
    throw new Error("해당 좌표의 지적 필지를 찾지 못했습니다.");
  }

  const props = cadastral.properties;
  const pnu = pick(props, ["pnu", "PNU", "pnu_cd", "PNU_CD"]);
  const address = pick(props, ["addr", "ADDRESS", "jibun", "JIBUN", "addr_kor"]);

  let landProps: Record<string, unknown> | null = null;
  if (pnu) {
    landProps = await fetchLandAttributeByPnu(key, pnu);
  }

  const merged = { ...props, ...(landProps ?? {}) };

  const jimokCode = pick(merged, [
    "lndcgrCode",
    "LNDCGR_CD",
    "jimok",
    "JIMOK_CD",
    "lndcgr_cd",
  ]);
  const jimokLabel = jimokName(
    jimokCode,
    pick(merged, ["lndcgrNm", "JIMOK", "jimokNm", "지목", "lndcgr_nm"]),
  );

  const ownershipCode = pick(merged, [
    "posesnSeCode",
    "POSESN_SE_CD",
    "ownerSe",
    "OWN_GBN",
    "own_gbn",
    "소유구분코드",
  ]);
  const ownershipLabel = ownershipName(
    ownershipCode,
    pick(merged, [
      "posesnSe",
      "POSESN_SE",
      "ownerSeNm",
      "OWN_GBN_NM",
      "소유구분",
      "소유구분명",
    ]),
  );

  const area = asNumber(
    pick(merged, ["lndpclAr", "LNDPCL_AR", "area", "AREA", "parcel_area"]),
  );

  const kind = classifyOwnership(ownershipCode, ownershipLabel);

  return {
    lat,
    lng,
    pnu,
    address,
    jimok: jimokLabel,
    jimokCode,
    ownershipLabel,
    ownershipCode,
    area,
    geometry: cadastral.geometry ?? null,
    verdict: buildVerdict(kind, ownershipLabel, jimokLabel),
    source: "live",
    fetchedAt: new Date().toISOString(),
  };
}

export function hasVWorldKey(): boolean {
  return Boolean(process.env.VWORLD_API_KEY?.trim());
}

export function getVWorldKey(): string | null {
  return process.env.VWORLD_API_KEY?.trim() || null;
}
