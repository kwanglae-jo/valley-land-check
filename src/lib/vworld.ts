import {
  buildVerdict,
  classifyOwnership,
  jimokName,
  ownershipName,
} from "./ownership";
import type { ParcelGeometry, ParcelResult, ParcelSummary } from "./types";

/**
 * 브이월드 연동 방식은 k-skill(NomaDamas/k-skill)의 VWorld BYOK 패턴을 참고합니다.
 * - 호스트: api.vworld.kr (클라우드 환경에서는 https 핸드셰이크 실패가 있어 http를 우선 사용)
 * - 키는 서버 환경변수에만 두고 브라우저에 노출하지 않음
 * - domain은 키 발급 시 등록한 서비스 도메인과 맞춰야 함
 *
 * k-skill proxy는 검색(/req/search)·공동주택가격만 중계합니다.
 * 연속지적도·소유구분은 Data API(/req/data)와 WFS(/req/wfs)를 직접 호출합니다.
 */
const VWORLD_HOSTS = [
  "http://api.vworld.kr",
  "https://api.vworld.kr",
] as const;

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
  const lowerMap = new Map(
    Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = asString(lowerMap.get(key.toLowerCase()));
    if (value) return value;
  }
  return null;
}

function withDomain(params: Record<string, string>): Record<string, string> {
  const domain = getVWorldDomain();
  if (domain) return { ...params, domain };
  return params;
}

async function fetchJsonFromVWorld(
  path: "/req/data" | "/req/wfs" | "/req/search",
  params: Record<string, string>,
): Promise<unknown> {
  const query = withDomain(params);
  let lastError: Error | null = null;

  for (const host of VWORLD_HOSTS) {
    const url = new URL(path, `${host}/`);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!response.ok) {
        lastError = new Error(`VWorld HTTP ${response.status} @ ${host}`);
        continue;
      }
      const text = await response.text();
      if (!text.trim()) {
        lastError = new Error(`VWorld empty body @ ${host}`);
        continue;
      }
      return JSON.parse(text) as unknown;
    } catch (error) {
      lastError =
        error instanceof Error
          ? new Error(`${error.message} @ ${host}`)
          : new Error(`VWorld fetch failed @ ${host}`);
    }
  }

  throw lastError ?? new Error("VWorld 요청 실패");
}

async function fetchVWorldFeatures(params: Record<string, string>): Promise<VWorldFeature[]> {
  const json = (await fetchJsonFromVWorld("/req/data", params)) as {
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

/**
 * 토지정보 기본도(WFS) — 지목·면적·소유구분명(owner_nm) 포함
 * 참고: lt_c_landinfobasemap
 */
async function fetchLandInfoByPointOrPnu(
  key: string,
  lat: number,
  lng: number,
  pnu?: string | null,
): Promise<Record<string, unknown> | null> {
  const pad = 0.00012;
  const attempts: Record<string, string>[] = [];

  if (pnu) {
    attempts.push({
      key,
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeName: "lt_c_landinfobasemap",
      output: "application/json",
      srsName: "EPSG:4326",
      maxFeatures: "5",
      pnu,
    });
  }

  attempts.push({
    key,
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: "lt_c_landinfobasemap",
    output: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "5",
    bbox: `${lng - pad},${lat - pad},${lng + pad},${lat + pad},EPSG:4326`,
  });

  for (const params of attempts) {
    try {
      const json = (await fetchJsonFromVWorld("/req/wfs", params)) as {
        features?: VWorldFeature[];
        totalFeatures?: number;
      };
      const feature = json.features?.[0];
      if (feature?.properties && Object.keys(feature.properties).length > 0) {
        return feature.properties;
      }
    } catch {
      // 다음 시도
    }
  }

  return null;
}

/** 좌표 주변 연속지적도 필지 조회 */
export async function fetchCadastralByPoint(
  key: string,
  lat: number,
  lng: number,
): Promise<VWorldFeature | null> {
  const filters = [
    `POINT(${lng} ${lat})`,
    (() => {
      const pad = 0.00018;
      return `BOX(${lng - pad},${lat - pad},${lng + pad},${lat + pad})`;
    })(),
  ];

  for (const geomFilter of filters) {
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
    if (features.length) return features[0] ?? null;
  }

  return null;
}

/** 토지임야/속성 정보 조회 — PNU 기준 Data API */
export async function fetchLandAttributeByPnu(
  key: string,
  pnu: string,
): Promise<Record<string, unknown> | null> {
  const datasetCandidates = [
    "LT_C_LHLDINFO",
    "LT_C_LANDINFO",
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

/** 화면 범위 안의 연속지적도 필지 목록 */
export async function fetchParcelsByBbox(
  key: string,
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<ParcelSummary[]> {
  const geomFilter = `BOX(${west},${south},${east},${north})`;
  const features = await fetchVWorldFeatures({
    service: "data",
    request: "GetFeature",
    data: "LP_PA_CBND_BUBUN",
    key,
    format: "json",
    size: "80",
    geometry: "true",
    attribute: "true",
    crs: "EPSG:4326",
    geomFilter,
  });

  return features.flatMap((feature, index) => {
    const props = feature.properties ?? {};
    const pnu = pick(props, ["pnu", "PNU", "pnu_cd", "PNU_CD"]);
    if (!pnu || !feature.geometry) return [];

    const address =
      pick(props, ["addr", "ADDRESS", "jibun", "JIBUN", "addr_kor"]) ??
      buildAddressFromParts(props);
    const center = estimateCenter(feature.geometry) ?? {
      lat: (south + north) / 2,
      lng: (west + east) / 2,
    };

    return [
      {
        id: `${pnu}-${index}`,
        pnu,
        address,
        lat: center.lat,
        lng: center.lng,
        geometry: feature.geometry,
        jimok: pick(props, ["jimok", "JIMOK", "lndcgrNm"]),
        jimokCode: null,
        ownershipLabel: pick(props, ["owner_nm", "ownerNm", "OWN_NM", "소유구분"]),
        ownershipCode: null,
        area: asNumber(
          pick(props, ["lndpclAr", "LNDPCL_AR", "area", "AREA", "parea"]),
        ),
      },
    ];
  });
}

function buildAddressFromParts(props: Record<string, unknown>): string | null {
  const parts = [
    pick(props, ["sido_nm", "sidoNm"]),
    pick(props, ["sgg_nm", "sggNm"]),
    pick(props, ["emd_nm", "emdNm"]),
    pick(props, ["ri_nm", "riNm"]),
    pick(props, ["jibun", "JIBUN"]),
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function estimateCenter(geometry: ParcelGeometry): { lat: number; lng: number } | null {
  try {
    const coords = geometry.coordinates as number[][][] | number[][][][];
    const ring =
      geometry.type === "MultiPolygon"
        ? (coords as number[][][][])[0]?.[0]
        : (coords as number[][][])[0];
    if (!ring?.length) return null;
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;
    for (const point of ring) {
      const lng = point[0];
      const lat = point[1];
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      sumLat += lat;
      sumLng += lng;
      count += 1;
    }
    if (!count) return null;
    return { lat: sumLat / count, lng: sumLng / count };
  } catch {
    return null;
  }
}

function extractOwnership(merged: Record<string, unknown>) {
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
      "owner_nm",
      "ownerNm",
      "OWN_NM",
      "posesnSe",
      "POSESN_SE",
      "ownerSeNm",
      "OWN_GBN_NM",
      "소유구분",
      "소유구분명",
    ]),
  );
  return { ownershipCode, ownershipLabel };
}

function extractJimok(merged: Record<string, unknown>) {
  const jimokCode = pick(merged, [
    "lndcgrCode",
    "LNDCGR_CD",
    "jimok",
    "JIMOK_CD",
    "lndcgr_cd",
  ]);
  // jimok 필드가 이미 한글 지목인 경우도 있음
  const rawJimok = pick(merged, ["lndcgrNm", "JIMOK", "jimokNm", "지목", "lndcgr_nm", "jimok"]);
  const looksLikeCode = Boolean(rawJimok && /^\d{1,2}$/.test(rawJimok));
  const jimokLabel = jimokName(jimokCode, looksLikeCode ? null : rawJimok);
  return { jimokCode, jimokLabel };
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
  const address =
    pick(props, ["addr", "ADDRESS", "jibun", "JIBUN", "addr_kor"]) ??
    buildAddressFromParts(props);

  const [landProps, wfsProps] = await Promise.all([
    pnu ? fetchLandAttributeByPnu(key, pnu) : Promise.resolve(null),
    fetchLandInfoByPointOrPnu(key, lat, lng, pnu),
  ]);

  const merged = {
    ...props,
    ...(landProps ?? {}),
    ...(wfsProps ?? {}),
  };

  const { jimokCode, jimokLabel } = extractJimok(merged);
  const { ownershipCode, ownershipLabel } = extractOwnership(merged);
  const area = asNumber(
    pick(merged, ["lndpclAr", "LNDPCL_AR", "area", "AREA", "parcel_area", "parea"]),
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

/** 브이월드 키 발급 시 등록한 도메인 (예: valley-land-check.vercel.app) */
export function getVWorldDomain(): string | null {
  const explicit = process.env.VWORLD_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return null;
}
