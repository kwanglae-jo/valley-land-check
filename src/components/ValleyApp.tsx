"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DEMO_CENTER } from "@/lib/demo-data";
import type { ParcelApiResponse, ParcelResult } from "@/lib/types";
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
  const [zoom, setZoom] = useState(14);
  const [selected, setSelected] = useState<Selected | null>({
    lat: DEMO_CENTER.lat,
    lng: DEMO_CENTER.lng,
  });
  const [result, setResult] = useState<ParcelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [gpsHint, setGpsHint] = useState<string | null>(null);

  const fetchParcel = useCallback((lat: number, lng: number) => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/parcel?lat=${lat}&lng=${lng}`);
        const json = (await res.json()) as ParcelApiResponse;
        if (!json.ok) {
          setResult(null);
          setError(json.error);
          return;
        }
        setResult(json.data);
      } catch {
        setResult(null);
        setError("네트워크 오류로 필지를 불러오지 못했습니다.");
      }
    });
  }, []);

  const selectPoint = useCallback(
    (lat: number, lng: number, nextZoom = 16) => {
      setSelected({ lat, lng });
      setCenter([lat, lng]);
      setZoom(nextZoom);
      fetchParcel(lat, lng);
    },
    [fetchParcel],
  );

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsHint("이 기기에서는 위치 기능을 지원하지 않습니다. 지도를 눌러 확인하세요.");
      return;
    }

    setLocating(true);
    setGpsHint(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        selectPoint(pos.coords.latitude, pos.coords.longitude, 17);
      },
      () => {
        setLocating(false);
        setGpsHint("위치 권한이 없거나 실패했습니다. 지도를 직접 눌러도 됩니다.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [selectPoint]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch(
          `/api/parcel?lat=${DEMO_CENTER.lat}&lng=${DEMO_CENTER.lng}`,
        );
        const json = (await res.json()) as ParcelApiResponse;
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error);
          return;
        }
        setResult(json.data);
      } catch {
        if (!cancelled) {
          setError("네트워크 오류로 필지를 불러오지 못했습니다.");
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="map-plane" aria-label="계곡 위치 지도">
        <MapView
          center={center}
          zoom={zoom}
          selected={selected}
          result={result}
          onSelect={(lat, lng) => selectPoint(lat, lng)}
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
        <p className="brand-hint">지도를 누르거나 내 위치로 바로 확인</p>
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
          onClick={() => selected && fetchParcel(selected.lat, selected.lng)}
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
        onRecheck={() => selected && fetchParcel(selected.lat, selected.lng)}
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
