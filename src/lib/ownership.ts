import type { LandVerdict, OwnershipKind } from "./types";

/** 소유구분 코드·명칭을 사유지/공공용지 판정으로 변환합니다. */
const PUBLIC_CODES = new Set([
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "2",
  "3",
  "4",
  "5",
]);

const PUBLIC_KEYWORDS = [
  "국유",
  "공유",
  "도유",
  "시유",
  "군유",
  "구유",
  "공용",
  "공공",
  "국가",
  "지방자치",
  "시·도",
  "시도",
];

const PRIVATE_CODES = new Set(["01", "1", "11"]);

const PRIVATE_KEYWORDS = ["개인", "법인", "사유지", "민유"];

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").trim();
}

export function classifyOwnership(
  ownershipCode: string | null | undefined,
  ownershipLabel: string | null | undefined,
): OwnershipKind {
  const code = normalize(ownershipCode);
  const label = normalize(ownershipLabel);

  if (code && PUBLIC_CODES.has(code)) return "public";
  if (code && PRIVATE_CODES.has(code)) return "private";

  if (PUBLIC_KEYWORDS.some((k) => label.includes(k))) return "public";
  if (PRIVATE_KEYWORDS.some((k) => label.includes(k))) return "private";

  return "unknown";
}

export function buildVerdict(
  kind: OwnershipKind,
  ownershipLabel: string | null,
  jimok: string | null,
): LandVerdict {
  const ownershipText = ownershipLabel ? `소유구분: ${ownershipLabel}` : "소유구분 정보 없음";
  const jimokText = jimok ? `지목: ${jimok}` : "지목 정보 없음";

  if (kind === "public") {
    return {
      kind,
      label: "공공용지 가능성 높음",
      summary: `${ownershipText} · ${jimokText}. 일반적으로 공공 관리 토지로 분류됩니다.`,
      caution:
        "최종 출입 가능 여부는 지자체·관리청 안내와 현장 표지를 함께 확인해 주세요. 본 서비스는 참고용입니다.",
    };
  }

  if (kind === "private") {
    return {
      kind,
      label: "사유지 가능성 높음",
      summary: `${ownershipText} · ${jimokText}. 무단 출입·취사는 분쟁 소지가 있습니다.`,
      caution:
        "사유지로 보이면 출입 전 소유자·관리자 동의를 받거나 다른 장소를 이용하세요. 본 서비스는 참고용입니다.",
    };
  }

  return {
    kind,
    label: "판정 보류",
    summary: `${ownershipText} · ${jimokText}. 공개 데이터만으로는 소유 성격을 확정하기 어렵습니다.`,
    caution:
      "지도 필지와 현장 안내판을 함께 확인하고, 불확실하면 출입을 자제해 주세요.",
  };
}

/** 흔한 지목 코드를 한글 명칭으로 변환 */
export function jimokName(code: string | null | undefined, fallback?: string | null): string | null {
  if (fallback && fallback.trim()) return fallback.trim();
  if (!code) return null;

  const map: Record<string, string> = {
    "01": "전",
    "02": "답",
    "03": "과수원",
    "04": "목장용지",
    "05": "임야",
    "06": "광천지",
    "07": "염전",
    "08": "대",
    "09": "공장용지",
    "10": "학교용지",
    "11": "주차장",
    "12": "주유소용지",
    "13": "창고용지",
    "14": "도로",
    "15": "철도용지",
    "16": "제방",
    "17": "하천",
    "18": "구거",
    "19": "유지",
    "20": "양어장",
    "21": "수도용지",
    "22": "공원",
    "23": "체육용지",
    "24": "유원지",
    "25": "종교용지",
    "26": "사적지",
    "27": "묘지",
    "28": "잡종지",
  };

  const normalized = code.padStart(2, "0");
  return map[normalized] ?? code;
}

export function ownershipName(
  code: string | null | undefined,
  fallback?: string | null,
): string | null {
  if (fallback && fallback.trim()) return fallback.trim();
  if (!code) return null;

  const map: Record<string, string> = {
    "01": "개인",
    "02": "국유",
    "03": "공유",
    "04": "도유",
    "05": "군유",
    "06": "시유",
    "07": "구유",
    "08": "읍유",
    "09": "면유",
    "10": "공공용",
    "11": "법인",
  };

  const normalized = code.padStart(2, "0");
  return map[normalized] ?? code;
}
