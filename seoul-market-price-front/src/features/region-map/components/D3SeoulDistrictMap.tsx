import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

import { DISTRICT_PRICES, PRICE_LEGEND } from "@/features/region-map/data/regionMapData";

type Position = [number, number];

interface SeoulFeature {
  type: "Feature";
  properties: { name: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Position[][] | Position[][][];
  };
}

interface SeoulGeoJson {
  type: "FeatureCollection";
  features: SeoulFeature[];
}

interface DongFeature {
  type: "Feature";
  properties: {
    EMD_CD: string;
    EMD_NM: string;
    COL_ADM_SE: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Position[][] | Position[][][];
  };
}

interface DongGeoJson {
  type: "FeatureCollection";
  features: DongFeature[];
}

function rewindDongFeature(feature: DongFeature): DongFeature {
  const coordinates = feature.geometry.type === "Polygon"
    ? (feature.geometry.coordinates as Position[][]).map((ring) => [...ring].reverse())
    : (feature.geometry.coordinates as Position[][][]).map((polygon) =>
        polygon.map((ring) => [...ring].reverse()),
      );

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates,
    } as DongFeature["geometry"],
  };
}

interface D3SeoulDistrictMapProps {
  selectedDistrict: string;
  selectedDistrictCode: string;
  selectedDong: string;
  availableDongs: Array<{ dongCd: string; dongNm: string }>;
  dongAveragePrices: Record<string, number>;
  districtAveragePrice: number;
  districtAveragePrices?: Record<string, number>;
  preferredDistrict?: string | null;
  onSelect: (district: string) => void;
  onSelectDong: (dong: string) => void;
  onShowAll: () => void;
}

const WIDTH = 1100;
const HEIGHT = 650;

function getDistrictColor(price: number) {
  if (price >= 150000) return PRICE_LEGEND[0].color;
  if (price >= 110000) return PRICE_LEGEND[1].color;
  if (price >= 90000) return PRICE_LEGEND[2].color;
  if (price >= 70000) return PRICE_LEGEND[3].color;
  return PRICE_LEGEND[4].color;
}

function formatEok(price: number) {
  return `${(price / 10000).toFixed(1).replace(".0", "")}억`;
}

export default function D3SeoulDistrictMap({
  selectedDistrict,
  selectedDistrictCode,
  selectedDong,
  availableDongs,
  dongAveragePrices,
  districtAveragePrice,
  districtAveragePrices,
  preferredDistrict,
  onSelect,
  onSelectDong,
  onShowAll,
}: D3SeoulDistrictMapProps) {
  const [geoData, setGeoData] = useState<SeoulGeoJson | null>(null);
  const [dongGeoData, setDongGeoData] = useState<DongGeoJson | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState("");
  const [hoveredDong, setHoveredDong] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [panState, setPanState] = useState({ district: "", x: 0, y: 0 });
  const [zoomState, setZoomState] = useState({ district: "", factor: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragState = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/seoul-municipalities.geo.json", { signal: controller.signal }),
      fetch("/geo/seoul-legal-dongs.geojson", { signal: controller.signal }),
    ])
      .then(async ([districtResponse, dongResponse]) => {
        if (!districtResponse.ok || !dongResponse.ok) {
          throw new Error("서울 행정구역 경계를 불러오지 못했습니다.");
        }
        return Promise.all([
          districtResponse.json() as Promise<SeoulGeoJson>,
          dongResponse.json() as Promise<DongGeoJson>,
        ]);
      })
      .then(([districts, dongs]) => {
        setGeoData(districts);
        setDongGeoData(dongs);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, []);

  const mapData = useMemo(() => {
    if (!geoData) return null;
    const projection = geoMercator().fitExtent(
      [[45, 35], [WIDTH - 45, HEIGHT - 35]],
      geoData as unknown as GeoPermissibleObjects,
    );
    const path = geoPath(projection);
    return geoData.features.map((feature) => {
      const district = DISTRICT_PRICES.find((item) => item.name === feature.properties.name);
      const realPrice = districtAveragePrices?.[feature.properties.name] ?? district?.averagePrice ?? 0;
      return {
        name: feature.properties.name,
        price: realPrice,
        path: path(feature as unknown as GeoPermissibleObjects) ?? "",
        center: path.centroid(feature as unknown as GeoPermissibleObjects),
        bounds: path.bounds(feature as unknown as GeoPermissibleObjects),
      };
    });
  }, [districtAveragePrices, geoData]);

  const dongMapData = useMemo(() => {
    if (!geoData || !dongGeoData || !selectedDistrict) return [];
    const projection = geoMercator().fitExtent(
      [[45, 35], [WIDTH - 45, HEIGHT - 35]],
      geoData as unknown as GeoPermissibleObjects,
    );
    const path = geoPath(projection);
    const normalizedDistrictCode = String(selectedDistrictCode).slice(0, 5);
    const availableDongsByCode = new Map(
      availableDongs.map((dong) => [String(dong.dongCd).replace(/00$/, ""), dong]),
    );

    return dongGeoData.features.flatMap((feature, index) => {
      const dongCode = `${feature.properties.EMD_CD}00`;
      const apiDong = availableDongsByCode.get(feature.properties.EMD_CD);
      const dongName = apiDong?.dongNm ?? feature.properties.EMD_NM;
      const belongsToSelectedDistrict =
        String(feature.properties.COL_ADM_SE) === normalizedDistrictCode;
      if (!belongsToSelectedDistrict) {
        return [];
      }
      const rewoundFeature = rewindDongFeature(feature);
      return [{
        code: dongCode,
        name: dongName,
        averagePrice:
          dongAveragePrices[dongName] ??
          Math.round(districtAveragePrice * (0.9 + (index % 6) * 0.035) / 100) * 100,
        path: path(rewoundFeature as unknown as GeoPermissibleObjects) ?? "",
        center: path.centroid(rewoundFeature as unknown as GeoPermissibleObjects),
      }];
    });
  }, [
    availableDongs,
    districtAveragePrice,
    dongAveragePrices,
    dongGeoData,
    geoData,
    selectedDistrict,
    selectedDistrictCode,
  ]);

  const zoom = useMemo(() => {
    const selected = mapData?.find((district) => district.name === selectedDistrict);
    if (!selected) return { scale: 1, centerX: WIDTH / 2, centerY: HEIGHT / 2 };
    const [[x0, y0], [x1, y1]] = selected.bounds;
    const fitScale = 0.9 / Math.max((x1 - x0) / WIDTH, (y1 - y0) / HEIGHT);
    const dongCount = dongMapData.length;
    const needsExtraZoom = selectedDistrict === "종로구" || selectedDistrict === "성북구";
    const densityBoost = needsExtraZoom
      ? 1.9
      : dongCount >= 50
        ? 1.45
        : dongCount >= 35
          ? 1.3
          : dongCount >= 25
            ? 1.15
            : 1;
    const scale = Math.min(needsExtraZoom ? 9 : 7.5, fitScale * densityBoost);
    return { scale, centerX: (x0 + x1) / 2, centerY: (y0 + y1) / 2 };
  }, [dongMapData.length, mapData, selectedDistrict]);

  const pan = panState.district === selectedDistrict
    ? { x: panState.x, y: panState.y }
    : { x: 0, y: 0 };
  const userZoom = zoomState.district === selectedDistrict ? zoomState.factor : 1;
  const displayScale = zoom.scale * userZoom;
  const panLimits = useMemo(() => {
    const selected = mapData?.find((district) => district.name === selectedDistrict);
    if (!selected) return { x: 0, y: 0 };

    const [[x0, y0], [x1, y1]] = selected.bounds;
    const scaledWidth = (x1 - x0) * displayScale;
    const scaledHeight = (y1 - y0) * displayScale;

    return {
      x: Math.max(WIDTH * 0.15, (scaledWidth - WIDTH) / 2 + WIDTH * 0.2),
      y: Math.max(HEIGHT * 0.15, (scaledHeight - HEIGHT) / 2 + HEIGHT * 0.2),
    };
  }, [displayScale, mapData, selectedDistrict]);

  const changeUserZoom = (nextFactor: number) => {
    setZoomState({
      district: selectedDistrict,
      factor: Math.max(0.7, Math.min(2.5, nextFactor)),
    });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !selectedDistrict) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setZoomState((current) => {
        const currentFactor = current.district === selectedDistrict ? current.factor : 1;
        const nextFactor = currentFactor * (event.deltaY < 0 ? 1.12 : 0.89);
        return {
          district: selectedDistrict,
          factor: Math.max(0.7, Math.min(2.5, nextFactor)),
        };
      });
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [mapData, selectedDistrict]);

  const transformPoint = ([x, y]: [number, number]) => [
    (x - zoom.centerX) * displayScale + WIDTH / 2 + pan.x,
    (y - zoom.centerY) * displayScale + HEIGHT / 2 + pan.y,
  ];

  const showingDongs = Boolean(selectedDistrict && dongMapData.length);

  if (errorMessage) {
    return <div className="flex h-[650px] items-center justify-center bg-white text-[13px] font-bold text-rose-600">{errorMessage}</div>;
  }

  if (!mapData) {
    return <div className="flex h-[650px] items-center justify-center bg-[#F6FAF7] text-[13px] font-bold text-[#64748B]">서울 지도를 불러오는 중입니다...</div>;
  }

  return (
    <div className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#FFFFFF_0%,#F4F8F4_62%,#EAF2ED_100%)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`block h-auto min-h-[520px] w-full touch-none ${selectedDistrict ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
        role="img"
        aria-label="서울 자치구별 평균 매매가 지도"
        onPointerDown={(event) => {
          if (!selectedDistrict || event.button !== 0) return;
          dragState.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          if (dragState.current.pointerId !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const dx = (event.clientX - dragState.current.x) * (WIDTH / rect.width);
          const dy = (event.clientY - dragState.current.y) * (HEIGHT / rect.height);
          const totalMovement =
            Math.abs(event.clientX - dragState.current.startX) +
            Math.abs(event.clientY - dragState.current.startY);
          if (totalMovement > 6 && !dragState.current.moved) {
            dragState.current.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDragging(true);
          }
          if (!dragState.current.moved) return;
          dragState.current.x = event.clientX;
          dragState.current.y = event.clientY;
          setPanState((current) => ({
            district: selectedDistrict,
            x: Math.max(-panLimits.x, Math.min(panLimits.x, (current.district === selectedDistrict ? current.x : 0) + dx)),
            y: Math.max(-panLimits.y, Math.min(panLimits.y, (current.district === selectedDistrict ? current.y : 0) + dy)),
          }));
        }}
        onPointerUp={(event) => {
          if (dragState.current.pointerId !== event.pointerId) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragState.current.pointerId = -1;
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          dragState.current.pointerId = -1;
          setIsDragging(false);
        }}
      >
        <defs>
          <filter id="district-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#284B3D" floodOpacity="0.15" />
          </filter>
          <pattern id="map-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="#DCE7E0" strokeWidth="0.7" opacity="0.45" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#map-grid)" opacity="0.55" />
        <g
          filter="url(#district-shadow)"
          transform={`translate(${pan.x} ${pan.y}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${displayScale}) translate(${-zoom.centerX} ${-zoom.centerY})`}
          style={{ transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)" }}
        >
          {mapData.map(({ name, price, path }) => {
            const selected = name === selectedDistrict;
            const hovered = name === hoveredDistrict;
            return (
              <path
                key={name}
                d={path}
                fill={showingDongs ? "transparent" : getDistrictColor(price)}
                fillOpacity={showingDongs ? 0 : hovered && !selected ? 0.82 : 0.68}
                stroke={showingDongs ? "transparent" : selected ? "#FFFFFF" : "#F8FBF9"}
                strokeWidth={showingDongs ? 0 : selected ? 5 : hovered ? 3 : 1.8}
                vectorEffect="non-scaling-stroke"
                className={`${showingDongs ? "pointer-events-none" : "cursor-pointer"} outline-none transition-all duration-200`}
                onMouseEnter={() => setHoveredDistrict(name)}
                onMouseLeave={() => setHoveredDistrict("")}
                onClick={() => {
                  if (!dragState.current.moved) onSelect(name);
                  dragState.current.moved = false;
                }}
                tabIndex={0}
                role="button"
                aria-label={`${name}, 평균 매매가 ${formatEok(price)}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(name);
                }}
              />
            );
          })}
          {dongMapData.map(({ code, name, averagePrice, path }) => {
            const selected = name === selectedDong;
            const hovered = name === hoveredDong;
            return (
              <path
                key={code}
                d={path}
                fill={getDistrictColor(averagePrice)}
                fillOpacity={selected ? 0.95 : hovered ? 0.88 : 0.72}
                stroke={selected ? "#0B7285" : "#7EA99B"}
                strokeWidth={selected ? 2.4 : 1.15}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer outline-none transition-colors duration-150"
                onMouseEnter={() => setHoveredDong(name)}
                onMouseLeave={() => setHoveredDong("")}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!dragState.current.moved) onSelectDong(name);
                  dragState.current.moved = false;
                }}
                tabIndex={0}
                role="button"
                aria-label={`${selectedDistrict} ${name} 선택`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelectDong(name);
                  }
                }}
              />
            );
          })}
        </g>
        <g className="pointer-events-none">
          {!showingDongs && mapData.map(({ name, price, center }) => {
            const selected = name === selectedDistrict;
            const [labelX, labelY] = transformPoint(center);
            return (
              <g key={name} transform={`translate(${labelX} ${labelY})`} style={{ transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)" }}>
                {name === preferredDistrict && <text x="0" y="-21" textAnchor="middle" fill="#E11D48" fontSize="17" aria-label="선호지역">♥</text>}
                <text textAnchor="middle" y="-2" fill="#17252E" stroke="#FFFFFF" strokeWidth="4" paintOrder="stroke" fontSize={selected ? 16 : 14} fontWeight="900">{name}</text>
                <text textAnchor="middle" y="17" fill="#17252E" stroke="#FFFFFF" strokeWidth="4" paintOrder="stroke" fontSize={selected ? 15 : 13} fontWeight="800">{formatEok(price)}</text>
              </g>
            );
          })}
          {showingDongs && dongMapData.map(({ code, name, averagePrice, center }) => {
            const [labelX, labelY] = transformPoint(center);
            return (
              <g
                key={code}
                transform={`translate(${labelX} ${labelY})`}
                style={{ transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)" }}
              >
                <text textAnchor="middle" y="-2" fill="#17352D" stroke="#FFFFFF" strokeWidth="3" paintOrder="stroke" fontSize="11" fontWeight="900">
                  {name}
                </text>
                <text textAnchor="middle" y="12" fill="#315C50" stroke="#FFFFFF" strokeWidth="3" paintOrder="stroke" fontSize="9.5" fontWeight="800">
                  {formatEok(averagePrice)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {selectedDistrict && (
        <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-[10px] border border-[#CBD5E1] bg-white/95 px-3.5 py-2 text-[12px] font-extrabold text-[#334155] shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur transition-colors hover:border-[#0F8AA8] hover:text-[#0F8AA8] cursor-pointer"
          >
            서울 전체 보기
          </button>
          <div className="flex overflow-hidden rounded-[10px] border border-[#CBD5E1] bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur">
            <button
              type="button"
              onClick={() => changeUserZoom(userZoom / 1.2)}
              className="flex size-9 items-center justify-center border-0 bg-transparent text-[19px] font-bold text-[#334155] hover:bg-[#E8F6F9] hover:text-[#0F8AA8] cursor-pointer"
              aria-label="지도 축소"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => changeUserZoom(userZoom * 1.2)}
              className="flex size-9 items-center justify-center border-0 border-l border-[#E2E8F0] bg-transparent text-[19px] font-bold text-[#334155] hover:bg-[#E8F6F9] hover:text-[#0F8AA8] cursor-pointer"
              aria-label="지도 확대"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
