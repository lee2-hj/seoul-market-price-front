import { useEffect, useRef, useState } from "react";

import { DISTRICT_PRICES, formatPrice } from "@/features/region-map/data/regionMapData";
import { loadKakaoMap } from "@/shared/lib/loadKakaoMap";

type Position = [number, number];
type Ring = Position[];

interface SeoulFeature {
  properties: { name: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Ring[] | Ring[][];
  };
}

interface SeoulGeoJson {
  features: SeoulFeature[];
}

interface SeoulDistrictMapProps {
  selectedDistrict: string;
  preferredDistrict?: string | null;
  onSelect: (district: string) => void;
}

function getPolygons(feature: SeoulFeature): Ring[][] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Ring[]]
    : (feature.geometry.coordinates as Ring[][]);
}

function getRingArea(ring: Ring) {
  return Math.abs(
    ring.reduce((area, [x1, y1], index) => {
      const [x2, y2] = ring[(index + 1) % ring.length];
      return area + x1 * y2 - x2 * y1;
    }, 0) / 2,
  );
}

function getRingCenter(ring: Ring): Position {
  let signedArea = 0;
  let longitude = 0;
  let latitude = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    const cross = x1 * y2 - x2 * y1;
    signedArea += cross;
    longitude += (x1 + x2) * cross;
    latitude += (y1 + y2) * cross;
  }

  if (Math.abs(signedArea) < 0.000001) return ring[0];
  return [longitude / (3 * signedArea), latitude / (3 * signedArea)];
}

function applyLabelStyle(label: HTMLButtonElement, selected: boolean) {
  label.style.background = selected ? "#0B5E73" : "rgba(255,255,255,.88)";
  label.style.color = selected ? "#FFFFFF" : "#17252E";
}

function applyPreferredHeart(label: HTMLButtonElement, preferred: boolean) {
  const heart = label.querySelector<HTMLElement>("[data-preferred-heart]");
  if (heart) heart.style.display = preferred ? "inline" : "none";
}

function createLabel(name: string, price: number, selected: boolean, preferred: boolean) {
  const label = document.createElement("button");
  label.type = "button";
  label.style.cssText = [
    "border:0",
    "border-radius:10px",
    `background:${selected ? "#0B5E73" : "rgba(255,255,255,.88)"}`,
    `color:${selected ? "#FFFFFF" : "#17252E"}`,
    "padding:4px 7px",
    "font:800 11px/1.25 Pretendard, sans-serif",
    "text-align:center",
    "white-space:nowrap",
    "box-shadow:0 2px 7px rgba(18,48,71,.15)",
    "cursor:pointer",
  ].join(";");
  label.innerHTML = `<span data-preferred-heart style="display:none;color:#F43F5E;margin-right:3px" aria-label="선호지역">♥</span>${name}<br><span style="font-size:10px">${formatPrice(price)}</span>`;
  applyLabelStyle(label, selected);
  applyPreferredHeart(label, preferred);
  return label;
}

interface DistrictVisual {
  polygon: KakaoPolygon;
  label: HTMLButtonElement;
  overlay: KakaoCustomOverlay;
}

export default function SeoulDistrictMap({ selectedDistrict, preferredDistrict, onSelect }: SeoulDistrictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const selectedDistrictRef = useRef(selectedDistrict);
  const preferredDistrictRef = useRef(preferredDistrict);
  const districtVisualsRef = useRef(new Map<string, DistrictVisual>());
  const mapRef = useRef<KakaoMap | null>(null);
  const districtCentersRef = useRef(new Map<string, KakaoLatLng>());
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    selectedDistrictRef.current = selectedDistrict;
    districtVisualsRef.current.forEach(({ polygon, label, overlay }, districtName) => {
      const selected = districtName === selectedDistrict;
      polygon.setOptions({
        strokeWeight: selected ? 3 : 1,
        strokeColor: "#0B5E73",
        strokeOpacity: selected ? 1 : 0,
        fillOpacity: 0,
      });
      applyLabelStyle(label, selected);
      overlay.setZIndex(selected ? 5 : 2);
    });

    const selectedCenter = districtCentersRef.current.get(selectedDistrict);
    if (mapRef.current && selectedCenter) {
      mapRef.current.setLevel(6);
      mapRef.current.panTo(selectedCenter);
    }
  }, [selectedDistrict]);

  useEffect(() => {
    preferredDistrictRef.current = preferredDistrict;
    districtVisualsRef.current.forEach(({ label }, districtName) => {
      applyPreferredHeart(label, districtName === preferredDistrict);
    });
  }, [preferredDistrict]);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const polygons: KakaoPolygon[] = [];
    const overlays: KakaoCustomOverlay[] = [];
    const districtVisuals = districtVisualsRef.current;
    const districtCenters = districtCentersRef.current;
    let mapInstance: KakaoMap | null = null;
    let keepMapInsideSeoul: (() => void) | null = null;

    Promise.all([
      loadKakaoMap(),
      fetch("/seoul-municipalities.geo.json", { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error("서울 자치구 경계를 불러오지 못했습니다.");
        return response.json() as Promise<SeoulGeoJson>;
      }),
    ])
      .then(([, geoData]) => {
        if (disposed || !containerRef.current || !window.kakao) return;

        const { maps } = window.kakao;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(37.5665, 126.978),
          level: 8,
        });
        mapInstance = map;
        mapRef.current = map;
        const bounds = new maps.LatLngBounds();

        geoData.features.forEach((feature) => {
          const districtPrice = DISTRICT_PRICES.find((item) => item.name === feature.properties.name);
          const price = districtPrice?.averagePrice ?? 0;
          const selected = feature.properties.name === selectedDistrictRef.current;
          const districtPolygons = getPolygons(feature);
          const paths = districtPolygons.flatMap((polygon) =>
            polygon.map((ring) =>
              ring.map(([longitude, latitude]) => {
                const position = new maps.LatLng(latitude, longitude);
                bounds.extend(position);
                return position;
              }),
            ),
          );
          const polygon = new maps.Polygon({
            map,
            path: paths,
            strokeWeight: selected ? 3 : 1,
            strokeColor: "#0B5E73",
            strokeOpacity: selected ? 1 : 0,
            fillColor: "#FFFFFF",
            fillOpacity: 0,
          });
          const selectDistrict = () => onSelectRef.current(feature.properties.name);
          maps.event.addListener(polygon, "click", selectDistrict);
          polygons.push(polygon);

          const largestRing = districtPolygons
            .map((polygonData) => polygonData[0])
            .sort((ringA, ringB) => getRingArea(ringB) - getRingArea(ringA))[0];
          const [longitude, latitude] = getRingCenter(largestRing);
          districtCenters.set(
            feature.properties.name,
            new maps.LatLng(latitude, longitude),
          );
          const label = createLabel(
            feature.properties.name,
            price,
            selected,
            feature.properties.name === preferredDistrictRef.current,
          );
          label.addEventListener("click", selectDistrict);
          const overlay = new maps.CustomOverlay({
            map,
            position: new maps.LatLng(latitude, longitude),
            content: label,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: selected ? 5 : 2,
          });
          overlays.push(overlay);
          districtVisuals.set(feature.properties.name, { polygon, label, overlay });
        });

        map.setBounds(bounds, 45);
        map.setMinLevel(5);
        map.setMaxLevel(9);
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);

        let lastCenterInsideSeoul = map.getCenter();
        keepMapInsideSeoul = () => {
          const currentCenter = map.getCenter();
          if (bounds.contain(currentCenter)) {
            lastCenterInsideSeoul = currentCenter;
            return;
          }
          map.panTo(lastCenterInsideSeoul);
        };
        maps.event.addListener(map, "dragend", keepMapInsideSeoul);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
      });

    return () => {
      disposed = true;
      controller.abort();
      if (mapInstance && keepMapInsideSeoul && window.kakao) {
        window.kakao.maps.event.removeListener(mapInstance, "dragend", keepMapInsideSeoul);
      }
      polygons.forEach((polygon) => polygon.setMap(null));
      overlays.forEach((overlay) => overlay.setMap(null));
      districtVisuals.clear();
      districtCenters.clear();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-[560px] w-full bg-[#EAF2F4] sm:h-[650px]">
      <div ref={containerRef} className="size-full" aria-label="서울 자치구별 평균 매매가 지도" />
      {errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-5 text-center text-[13px] font-bold text-rose-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
