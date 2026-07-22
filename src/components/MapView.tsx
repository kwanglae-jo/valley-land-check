"use client";

import { useEffect } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { ParcelGeometry, ParcelResult } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "valley-marker",
  html: `<span class="valley-marker__dot"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function verdictColor(kind: ParcelResult["verdict"]["kind"]) {
  if (kind === "private") return "#c45c26";
  if (kind === "public") return "#1f7a5c";
  return "#6b7280";
}

type Props = {
  center: [number, number];
  zoom: number;
  selected: { lat: number; lng: number } | null;
  result: ParcelResult | null;
  onSelect: (lat: number, lng: number) => void;
};

export default function MapView({
  center,
  zoom,
  selected,
  result,
  onSelect,
}: Props) {
  const geometry = result?.geometry as ParcelGeometry | null;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController center={center} zoom={zoom} />
      <ClickHandler onSelect={onSelect} />
      {selected && <Marker position={[selected.lat, selected.lng]} icon={markerIcon} />}
      {geometry && (
        <GeoJSON
          key={`${result?.pnu ?? "g"}-${result?.fetchedAt ?? ""}`}
          data={
            {
              type: "Feature",
              properties: {},
              geometry,
            } as unknown as GeoJSON.GeoJsonObject
          }
          style={() => ({
            color: verdictColor(result?.verdict.kind ?? "unknown"),
            weight: 2,
            fillColor: verdictColor(result?.verdict.kind ?? "unknown"),
            fillOpacity: 0.28,
          })}
        />
      )}
    </MapContainer>
  );
}
