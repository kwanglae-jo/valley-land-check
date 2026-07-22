export type OwnershipKind = "private" | "public" | "unknown";

export type LandVerdict = {
  kind: OwnershipKind;
  label: string;
  summary: string;
  caution: string;
};

export type ParcelGeometry = {
  type: string;
  coordinates: unknown;
};

export type ParcelResult = {
  lat: number;
  lng: number;
  pnu: string | null;
  address: string | null;
  jimok: string | null;
  jimokCode: string | null;
  ownershipLabel: string | null;
  ownershipCode: string | null;
  area: number | null;
  geometry: ParcelGeometry | null;
  verdict: LandVerdict;
  source: "live" | "demo";
  fetchedAt: string;
};

export type ParcelApiResponse =
  | { ok: true; data: ParcelResult }
  | { ok: false; error: string; hint?: string };
