"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useTransition } from "react";
import { DEMO_CENTER } from "@/lib/demo-data";
import type {
  ParcelApiResponse,
  ParcelResult,
  ParcelsApiResponse,
  ParcelSummary,
} from "@/lib/types";
import ResultPanel from "./ResultPanel";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-skeleton" aria-hidden />,
});

type Selected = { lat: number; lng: number };

export default function ValleyApp() {
  const [center, setCenter] = useState<[number, number]>([
    DEMO_CENTER.lat,
    DEMO_CENTER.lng,
  ]);
  const [zoom, setZoom] = useState(16);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [selectedPnu, setSelectedPnu] = useState<string | null>(null);
  const [parcels, setParcels] = useState<ParcelSummary[]>([]);
  const [result, setResult] = useState<ParcelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [gpsHint, setGpsHint] = useState<string | null>(null);

  const fetchParcelDetail = useCallback(
    (lat: number, lng: number, pnu?: string) => {
      startTransition(async () => {
        setError(null);
        try {
          const query = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
          });
          if (pnu) query.set("pnu", pnu);
          const res = await fetch(`/api/parcel?${query.toString()}`);
          const json = (await res.json()) as ParcelApiResponse;
          if (!json.ok) {
            setResult(null);
            setError(json.error);
            return;
          }
          setResult(json.data);
          setSelectedPnu(json.data.pnu);
        } catch {
          setResult(null);
          setError("네트워크 오류로 필지를 불러오지 못했습니다.");
        }
      });
    },
    [],
  );

  const selectParcel = useCallback(
    (parcel: ParcelSummary) => {
      setSelected({ lat: parcel.lat, lng: parcel.lng });
      setSelectedPnu(parcel.pnu);
      setCenter([parcel.lat, parcel.lng]);
      fetchParcelDetail(parcel.lat, parcel.lng, parcel.pnu);
    },
    [fetchParcelDetail],
  );

  const loadParcels = useCallback(
    async (bounds: { west: number; south: number; east: number; north: number }) => {
      try {
        const query = new URLSearchParams({
          west: String(bounds.west),
          south: String(bounds.south),
          east: String(bounds.east),
          north: String(bounds.north),
        });
        const res = await fetch(`/api/parcels?${query.toString()}`);
        const json = (await res.json()) as ParcelsApiResponse;
        if (!json.ok) return;
        setParcels(json.data);
      } catch {
        // 필지 칸이 없어도 앱은 계속 쓸 수 있게 조용히 무시
      }
    },
    [],
  );

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsHint("이 기기에서는 위치 기능을 지원하지 않습니다. 필지를 눌러 확인하세요.");
      return;
    }

    setLocating(true);
    setGpsHint(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelected({ lat, lng });
        setCenter([lat, lng]);
        setZoom(17);
        // 내 위치에 가장 가까운 필지를 고릅니다.
        fetchParcelDetail(lat, lng);
        setGpsHint("내 위치 기준으로 가장 가까운 필지를 확인했습니다. 다른 필지도 눌러보세요.");
      },
      () => {
        setLocating(false);
        setGpsHint("위치 권한이 없거나 실패했습니다. 화면에 보이는 필지를 눌러 주세요.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [fetchParcelDetail]);

  return (
    <div className="app-shell">
      <div className="map-plane" aria-label="계곡 필지 지도">
        <MapView
          center={center}
          zoom={zoom}
          selected={selected}
          selectedPnu={selectedPnu}
          parcels={parcels}
          result={result}
          onParcelSelect={selectParcel}
          onBoundsChange={(bounds) => {
            void loadParcels(bounds);
          }}
          onEmptyClick={() => {
            setGpsHint("빈 곳이 아니라, 초록색 필지 칸을 눌러 주세요.");
          }}
        />
        <div className="map-veil" aria-hidden />
      </div>

      <header className="brand-bar">
        <div className="brand-mark">
          <span className="brand-mark__glyph" aria-hidden />
          <div>
            <p className="brand-name">계곡체크</p>
            <p className="brand-sub">지금 이 자리, 사유지일까?</p>
          </div>
        </div>
        <p className="brand-hint">초록색 필지를 눌러 사유지·공공용지를 확인하세요</p>
      </header>

      <div className="action-dock">
        <button
          type="button"
          className="primary-btn primary-btn--glow"
          onClick={locateMe}
          disabled={locating || isPending}
        >
          {locating ? "위치 찾는 중…" : "내 위치로 확인"}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            selected && fetchParcelDetail(selected.lat, selected.lng, selectedPnu ?? undefined)
          }
          disabled={!selected || isPending}
        >
          다시 조회
        </button>
      </div>

      {gpsHint && <p className="toast-hint">{gpsHint}</p>}

      <ResultPanel
        loading={isPending}
        error={error}
        result={result}
        onRecheck={() =>
          selected && fetchParcelDetail(selected.lat, selected.lng, selectedPnu ?? undefined)
        }
        onClose={() => {
          setResult(null);
          setError(null);
        }}
      />

      <footer className="legal-note">
        참고용 서비스입니다. 국토교통부 연속지적도·토지임야정보(브이월드) 기반으로
        안내하며, 출입·이용의 법적 책임은 이용자에게 있습니다.
      </footer>
    </div>
  );
}
