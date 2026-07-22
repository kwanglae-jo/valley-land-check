"use client";

import { useEffect, useMemo } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { ParcelResult, ParcelSummary } from "@/lib/types";
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

function BoundsWatcher({
  onBounds,
}: {
  onBounds: (bounds: { west: number; south: number; east: number; north: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const publish = () => {
      const b = map.getBounds();
      onBounds({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    publish();
    map.on("moveend", publish);
    map.on("zoomend", publish);
    return () => {
      map.off("moveend", publish);
      map.off("zoomend", publish);
    };
  }, [map, onBounds]);

  return null;
}

function EmptyClickHint({ onEmptyClick }: { onEmptyClick: () => void }) {
  useMapEvents({
    click() {
      onEmptyClick();
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
  selectedPnu: string | null;
  parcels: ParcelSummary[];
  result: ParcelResult | null;
  onParcelSelect: (parcel: ParcelSummary) => void;
  onBoundsChange: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
  onEmptyClick: () => void;
};

export default function MapView({
  center,
  zoom,
  selected,
  selectedPnu,
  parcels,
  result,
  onParcelSelect,
  onBoundsChange,
  onEmptyClick,
}: Props) {
  const collection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: parcels.map((parcel) => ({
        type: "Feature" as const,
        properties: {
          pnu: parcel.pnu,
          address: parcel.address,
        },
        geometry: parcel.geometry,
      })),
    }),
    [parcels],
  );

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
      <BoundsWatcher onBounds={onBoundsChange} />
      <EmptyClickHint onEmptyClick={onEmptyClick} />

      <GeoJSON
        key={`parcels-${parcels.map((p) => p.pnu).join(",")}`}
        data={collection as unknown as GeoJSON.GeoJsonObject}
        style={(feature) => {
          const pnu = feature?.properties?.pnu as string | undefined;
          const active = Boolean(pnu && pnu === selectedPnu);
          if (active && result) {
            return {
              color: verdictColor(result.verdict.kind),
              weight: 3,
              fillColor: verdictColor(result.verdict.kind),
              fillOpacity: 0.4,
            };
          }
          return {
            color: active ? "#174833" : "#2f6b52",
            weight: active ? 3 : 1.5,
            fillColor: active ? "#2a7456" : "#7fb59a",
            fillOpacity: active ? 0.35 : 0.18,
          };
        }}
        onEachFeature={(feature, layer) => {
          const pnu = feature.properties?.pnu as string | undefined;
          layer.on({
            click: (event) => {
              L.DomEvent.stopPropagation(event);
              const parcel = parcels.find((p) => p.pnu === pnu);
              if (parcel) onParcelSelect(parcel);
            },
          });
        }}
      />

      {selected && <Marker position={[selected.lat, selected.lng]} icon={markerIcon} />}
    </MapContainer>
  );
}
