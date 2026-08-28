import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { DISTRICT_PRICES, PRICE_LEGEND } from "@/features/region-map/data/regionMapData";

interface DistrictProperties {
  name: string;
  code: string;
}

interface DistrictFeature {
  type: "Feature";
  properties: DistrictProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface SeoulGeoJson {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

interface DongProperties {
  COL_ADM_SE: string;
  EMD_CD: string;
  EMD_NM: string;
}

interface DongFeature {
  type: "Feature";
  properties: DongProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface DongGeoJson {
  type: "FeatureCollection";
  features: DongFeature[];
}

function rewindRing(ring: number[][]): number[][] {
  let area = 0;
  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const p1 = ring[i];
    const p2 = ring[j];
    area += (p2[0] - p1[0]) * (p2[1] + p1[1]);
  }
  return area > 0 ? [...ring].reverse() : ring;
}

function rewindDongFeature(feature: DongFeature): DongFeature {
  if (feature.geometry.type === "Polygon") {
    const coordinates = (feature.geometry.coordinates as number[][][]).map(
      (ring, index) => {
        const rewound = rewindRing(ring);
        return index === 0 ? rewound : [...rewound].reverse();
      },
    );
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates,
      } as DongFeature["geometry"],
    };
  }

  const coordinates = (feature.geometry.coordinates as number[][][][]).map(
    (polygon) =>
      polygon.map((ring, index) => {
        const rewound = rewindRing(ring);
        return index === 0 ? rewound : [...rewound].reverse();
      }),
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

const WIDTH = 960;
const HEIGHT = 680;

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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
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
      [[20, 20], [WIDTH - 20, HEIGHT - 20]],
      geoData as unknown as GeoPermissibleObjects,
    );
    const path = geoPath(projection);
    return geoData.features.map((feature) => {
      const district = DISTRICT_PRICES.find((item: { name: string; averagePrice?: number }) => item.name === feature.properties.name);
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
      [[20, 20], [WIDTH - 20, HEIGHT - 20]],
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
    if (!selectedDistrict) {
      const scaledWidth = WIDTH * displayScale;
      const scaledHeight = HEIGHT * displayScale;
      return {
        x: Math.max(0, (scaledWidth - WIDTH) / 2 + WIDTH * 0.15),
        y: Math.max(0, (scaledHeight - HEIGHT) / 2 + HEIGHT * 0.15),
      };
    }

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

  const touchState = useRef({
    initialDist: 0,
    initialFactor: 1,
    isPinching: false,
  });

  const changeUserZoom = (nextFactor: number) => {
    setZoomState({
      district: selectedDistrict,
      factor: Math.max(0.6, Math.min(3.5, nextFactor)),
    });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const getTouchDist = (e: TouchEvent) => {
      if (e.touches.length < 2) return 0;
      return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e);
        touchState.current = {
          initialDist: dist,
          initialFactor: userZoom,
          isPinching: true,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.current.isPinching) {
        e.preventDefault();
        const dist = getTouchDist(e);
        if (touchState.current.initialDist > 0 && dist > 0) {
          const scaleRatio = dist / touchState.current.initialDist;
          const nextFactor = touchState.current.initialFactor * scaleRatio;
          changeUserZoom(nextFactor);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchState.current.isPinching = false;
      }
    };

    svg.addEventListener("touchstart", handleTouchStart, { passive: false });
    svg.addEventListener("touchmove", handleTouchMove, { passive: false });
    svg.addEventListener("touchend", handleTouchEnd);
    svg.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      svg.removeEventListener("touchstart", handleTouchStart);
      svg.removeEventListener("touchmove", handleTouchMove);
      svg.removeEventListener("touchend", handleTouchEnd);
      svg.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [mapData, userZoom, selectedDistrict]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      // PC에서 서울 전체 뷰(!selectedDistrict && !isMobile)일 때는 웹페이지 스크롤이 자연스럽게 내려가도록 휠 줌 비활성화
      if (!selectedDistrict && !isMobile) return;

      event.preventDefault();
      event.stopPropagation();
      setZoomState((current) => {
        const currentFactor = current.district === selectedDistrict ? current.factor : 1;
        const nextFactor = currentFactor * (event.deltaY < 0 ? 1.12 : 0.89);
        return {
          district: selectedDistrict,
          factor: Math.max(0.6, Math.min(3.5, nextFactor)),
        };
      });
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [isMobile, mapData, selectedDistrict]);

  const transformPoint = ([x, y]: [number, number]) => [
    (x - zoom.centerX) * displayScale + WIDTH / 2 + pan.x,
    (y - zoom.centerY) * displayScale + HEIGHT / 2 + pan.y,
  ];

  const showingDongs = Boolean(selectedDistrict && dongMapData.length);

  if (errorMessage) {
    return (
      <div className="flex h-[380px] sm:h-[540px] items-center justify-center bg-white text-[13px] font-bold text-rose-600">
        {errorMessage}
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex h-[380px] sm:h-[540px] items-center justify-center bg-[#F6FAF7] text-[13px] font-bold text-[#64748B]">
        서울 지도를 불러오는 중입니다...
      </div>
    );
  }

  const canPan = Boolean(selectedDistrict || userZoom > 1);

  return (
    <div className="relative h-[380px] xs:h-[420px] sm:h-[540px] md:h-[620px] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#FFFFFF_0%,#F4F8F4_62%,#EAF2ED_100%)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className={`block h-full w-full touch-none ${canPan ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
        role="img"
        aria-label="서울 자치구별 평균 매매가 지도"
        onPointerDown={(event) => {
          if (!canPan || event.button !== 0) return;
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
          setPanState((current) => {
            const currentPan = current.district === selectedDistrict
              ? { x: current.x, y: current.y }
              : { x: 0, y: 0 };
            return {
              district: selectedDistrict,
              x: Math.max(-panLimits.x, Math.min(panLimits.x, currentPan.x + dx)),
              y: Math.max(-panLimits.y, Math.min(panLimits.y, currentPan.y + dy)),
            };
          });
        }}
        onPointerUp={(event) => {
          if (dragState.current.pointerId !== event.pointerId) return;
          if (dragState.current.moved && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragState.current.pointerId = -1;
          dragState.current.moved = false;
          setIsDragging(false);
        }}
        onPointerCancel={(event) => {
          if (dragState.current.pointerId !== event.pointerId) return;
          if (dragState.current.moved && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragState.current.pointerId = -1;
          dragState.current.moved = false;
          setIsDragging(false);
        }}
      >
        <defs>
          <radialGradient id="seoulMapBase" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F6FAF7" />
            <stop offset="100%" stopColor="#EEF5F0" />
          </radialGradient>
          <filter id="seoulDistrictShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0F172A" floodOpacity="0.10" />
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.06" />
          </filter>
        </defs>

        <g
          className="map-layer transition-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) translate(${WIDTH / 2}px, ${HEIGHT / 2}px) scale(${displayScale}) translate(${-zoom.centerX}px, ${-zoom.centerY}px)`,
            transformOrigin: "0 0",
            transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)",
          }}
        >
          {/* 구 선택 전 서울 전체 뷰에서만 그림자 표시 */}
          {!selectedDistrict &&
            mapData.map(({ name, path }) => (
              <path
                key={`shadow-${name}`}
                d={path}
                fill="rgba(15, 23, 42, 0.08)"
                transform="translate(0 8)"
              />
            ))}

          {/* 구 선택 전 서울 전체 뷰에서만 구 다각형 표시 (구 선택 시 주변 구는 완전히 숨김) */}
          {!showingDongs &&
            mapData.map(({ name, price, path }) => {
              const fillColor = getDistrictColor(price);

              return (
                <path
                  key={name}
                  d={path}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.95}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => !selectedDistrict && setHoveredDistrict(name)}
                  onMouseLeave={() => !selectedDistrict && setHoveredDistrict("")}
                  onClick={() => {
                    if (!dragState.current.moved) {
                      onSelect(name);
                    }
                  }}
                />
              );
            })}

          {/* 선택되거나 호버된 구의 외곽선을 최상단에 렌더링하여 사방 균일한 두께 유지 */}
          {!showingDongs &&
            mapData
              .filter(({ name }) => name === selectedDistrict || name === hoveredDistrict)
              .map(({ name, path }) => {
                const isSelected = selectedDistrict === name;
                return (
                  <path
                    key={`highlight-district-${name}`}
                    d={path}
                    fill="none"
                    stroke={isSelected ? "#0F766E" : "#0EA5E9"}
                    strokeWidth={isSelected ? 2.6 : 2}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-none"
                  />
                );
              })}

          {/* 구 선택 시: 오직 해당 구의 동들만 단독 렌더링 */}
          {showingDongs &&
            dongMapData.map(({ code, name, averagePrice, path }) => {
              const fillColor = getDistrictColor(averagePrice);

              return (
                <path
                  key={code}
                  d={path}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.96}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredDong(name)}
                  onMouseLeave={() => setHoveredDong("")}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!dragState.current.moved) {
                      onSelectDong(name);
                    }
                  }}
                />
              );
            })}

          {/* 선택되거나 호버된 동의 외곽선을 최상단에 렌더링하여 사방 균일한 두께 유지 */}
          {showingDongs &&
            dongMapData
              .filter(({ name }) => name === selectedDong || name === hoveredDong)
              .map(({ code, name, path }) => {
                const isSelected = selectedDong === name;
                return (
                  <path
                    key={`highlight-${code}`}
                    d={path}
                    fill="none"
                    stroke={isSelected ? "#0F766E" : "#0284C7"}
                    strokeWidth={isSelected ? 2.4 : 1.8}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-none"
                  />
                );
              })}
        </g>

        <g
          className="labels-layer pointer-events-none select-none"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            pointerEvents: "none",
          }}
        >
          {!showingDongs &&
            mapData.map(({ name, price, center }) => {
              const isSelected = selectedDistrict === name;
              const isHovered = hoveredDistrict === name;
              const [labelX, labelY] = transformPoint(center as [number, number]);

              const districtNameSize = isMobile
                ? isSelected ? 16 : isHovered ? 15 : 13.5
                : isSelected ? 14 : isHovered ? 13 : 12;

              const districtPriceSize = isMobile
                ? isSelected ? 13 : 11.5
                : isSelected ? 11.5 : 10.5;

              return (
                <g
                  key={name}
                  transform={`translate(${labelX} ${labelY})`}
                  style={{
                    transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {name === preferredDistrict && (
                    <text
                      x="0"
                      y={isMobile ? "-23" : "-20"}
                      textAnchor="middle"
                      fill="#E11D48"
                      fontSize={isMobile ? 18 : 15}
                      aria-label="선호지역"
                      style={{
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        MozUserSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      ♥
                    </text>
                  )}
                  <text
                    textAnchor="middle"
                    y={isMobile ? "-5" : "-4"}
                    fill={isSelected ? "#042F2E" : "#0F172A"}
                    stroke="#FFFFFF"
                    strokeWidth={isMobile ? 3.2 : 2.2}
                    paintOrder="stroke"
                    fontSize={districtNameSize}
                    fontWeight="900"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {name}
                  </text>
                  <text
                    textAnchor="middle"
                    y={isMobile ? "14" : "12"}
                    fill={isSelected ? "#0F766E" : "#334155"}
                    stroke="#FFFFFF"
                    strokeWidth={isMobile ? 2.8 : 2}
                    paintOrder="stroke"
                    fontSize={districtPriceSize}
                    fontWeight="800"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {formatEok(price)}
                  </text>
                </g>
              );
            })}

          {showingDongs &&
            dongMapData.map(({ code, name, averagePrice, center }) => {
              const [labelX, labelY] = transformPoint(center as [number, number]);
              const isSelected = selectedDong === name;
              const dongCount = dongMapData.length;

              // PC(모니터)에서는 깔끔한 기본 크기, 모바일에서는 시원하게 큰 크기 적용
              const dongFontSize = isMobile
                ? dongCount >= 45 ? 13 : dongCount >= 25 ? 15.5 : 18
                : dongCount >= 45 ? 10.5 : dongCount >= 25 ? 11.5 : 12.5;

              const priceFontSize = isMobile
                ? dongCount >= 45 ? 11 : dongCount >= 25 ? 13 : 15
                : dongCount >= 45 ? 9 : dongCount >= 25 ? 9.5 : 10.5;

              return (
                <g
                  key={code}
                  transform={`translate(${labelX} ${labelY})`}
                  style={{
                    transition: isDragging ? "none" : "transform 520ms cubic-bezier(.22,.8,.3,1)",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  <text
                    textAnchor="middle"
                    y={isMobile ? (dongCount >= 45 ? "-3" : "-5") : "-3"}
                    fill={isSelected ? "#042F2E" : "#0F172A"}
                    stroke="#FFFFFF"
                    strokeWidth={isMobile ? 3.2 : 2.2}
                    paintOrder="stroke"
                    fontSize={isSelected ? dongFontSize + (isMobile ? 2 : 1) : dongFontSize}
                    fontWeight="900"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {name}
                  </text>
                  <text
                    textAnchor="middle"
                    y={isMobile ? (dongCount >= 45 ? "12" : "15") : "11"}
                    fill={isSelected ? "#0F766E" : "#0F766E"}
                    stroke="#FFFFFF"
                    strokeWidth={isMobile ? 2.8 : 2}
                    paintOrder="stroke"
                    fontSize={isSelected ? priceFontSize + (isMobile ? 1.5 : 1) : priceFontSize}
                    fontWeight="800"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {formatEok(averagePrice)}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>
      {(selectedDistrict || userZoom !== 1) && (
        <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-6 sm:top-6 z-20">
          <button
            type="button"
            onClick={() => {
              setZoomState({ district: "", factor: 1 });
              setPanState({ district: "", x: 0, y: 0 });
              onShowAll();
            }}
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
