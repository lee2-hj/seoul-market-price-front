import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { AlertCircle, LoaderCircle } from "lucide-react";

import {
  fetchLegalDongGeoJson,
  getCachedDongGeoJson,
  rewindDongFeature,
  type DongGeoJson,
} from "@/features/main/utils/mainPopularDongMapUtils";
import { useDistrictLookup } from "@/hooks/useDistricts";

export interface MainPopularDongMapProps {
  districtName: string;
  dongName: string;
}

const SVG_WIDTH = 280;
const SVG_HEIGHT = 160;

export function MainPopularDongMap({ districtName, dongName }: MainPopularDongMapProps) {
  const [geoData, setGeoData] = useState<DongGeoJson | null>(() => getCachedDongGeoJson());
  const [isGeoLoading, setIsGeoLoading] = useState(() => !getCachedDongGeoJson());
  const [hasGeoError, setHasGeoError] = useState(false);
  const { getCodeByName, isLoading: isDistrictLoading, isError: isDistrictError } = useDistrictLookup();

  useEffect(() => {
    let isMounted = true;
    if (!getCachedDongGeoJson()) {
      fetchLegalDongGeoJson()
        .then((data) => {
          if (isMounted) {
            setGeoData(data);
            setIsGeoLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setHasGeoError(true);
            setIsGeoLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedDistrict = districtName.trim();
  const normalizedDong = dongName.trim();
  const districtCode = getCodeByName(normalizedDistrict);

  // 지도(GeoJSON) 로딩과 자치구 이름->코드 API 조회가 모두 끝나야 최종 상태를 판단할 수 있다.
  const isLoading = isGeoLoading || isDistrictLoading;
  const hasError = hasGeoError || isDistrictError;

  const mapCalculation = useMemo(() => {
    if (!geoData || !districtCode || !normalizedDong) return null;

    const districtFeatures = geoData.features
      .filter((f) => String(f.properties.COL_ADM_SE) === districtCode)
      .map(rewindDongFeature);

    if (districtFeatures.length === 0) return null;

    const matchedPopularFeature = districtFeatures.find(
      (f) => f.properties.EMD_NM === normalizedDong,
    );

    if (!matchedPopularFeature) return null;

    const featureCollection: GeoPermissibleObjects = {
      type: "FeatureCollection",
      features: districtFeatures,
    } as unknown as GeoPermissibleObjects;

    const projection = geoMercator().fitExtent(
      [[12, 12], [SVG_WIDTH - 12, SVG_HEIGHT - 12]],
      featureCollection,
    );

    const pathGenerator = geoPath(projection);

    const paths = districtFeatures.map((f) => {
      const isPopular = f.properties.EMD_NM === normalizedDong;
      const pathString = pathGenerator(f as unknown as GeoPermissibleObjects) ?? "";
      const centroid = isPopular
        ? pathGenerator.centroid(f as unknown as GeoPermissibleObjects)
        : null;

      return {
        code: f.properties.EMD_CD,
        name: f.properties.EMD_NM,
        isPopular,
        pathString,
        centroid,
      };
    });

    const popularItem = paths.find((p) => p.isPopular);

    return {
      paths,
      popularCentroid: popularItem?.centroid ?? null,
    };
  }, [geoData, districtCode, normalizedDong]);

  if (isLoading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-[#F8FAFC]">
        <LoaderCircle className="size-6 animate-spin text-[#0F8AA8]" aria-hidden="true" />
        <span className="text-xs font-semibold text-[#6B7280]">지도 데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (hasError || !mapCalculation) {
    return (
      <div className="flex min-h-[220px] flex-col justify-between rounded-xl bg-[#F8FAFC] p-4">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AlertCircle className="mb-2 size-6 text-[#94A3B8]" aria-hidden="true" />
          <p className="m-0 text-xs font-bold text-[#64748B]">
            해당 지역의 지도 정보를 표시할 수 없습니다.
          </p>
        </div>
        <div className="border-t border-[#E2E8F0] pt-3">
          <span className="text-xs font-bold text-[#6B7280]">{normalizedDistrict}</span>
          <p className="m-0 text-lg font-black text-[#123047]">{normalizedDong}</p>
        </div>
      </div>
    );
  }

  const { paths, popularCentroid } = mapCalculation;

  return (
    <div className="flex flex-col justify-between">
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_center,#F0F8FA_0%,#F8FAFC_100%)] p-2">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-auto max-h-[170px] w-full select-none drop-shadow-sm"
          role="img"
          aria-label={`${normalizedDistrict} ${normalizedDong} 인기지역 지도`}
        >
          <title>{`${normalizedDistrict} ${normalizedDong} 법정동 경계 지도`}</title>

          {/* 배경이 되는 자치구 내 일반 법정동 경계선 */}
          <g>
            {paths
              .filter((p) => !p.isPopular)
              .map((item) => (
                <path
                  key={item.code}
                  d={item.pathString}
                  fill="#EDF4F7"
                  stroke="#CADEE6"
                  strokeWidth="0.75"
                >
                  <title>{item.name}</title>
                </path>
              ))}
          </g>

          {/* 강조 표시되는 인기 법정동 */}
          <g>
            {paths
              .filter((p) => p.isPopular)
              .map((item) => (
                <path
                  key={item.code}
                  d={item.pathString}
                  fill="#0F8AA8"
                  stroke="#084E60"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  className="filter drop-shadow-[0_2px_4px_rgba(15,138,168,0.3)]"
                >
                  <title>{`${item.name} (인기지역)`}</title>
                </path>
              ))}
          </g>

          {/* 인기 법정동 중심 핀/포인트 표시 (정적 마커) */}
          {popularCentroid &&
            Number.isFinite(popularCentroid[0]) &&
            Number.isFinite(popularCentroid[1]) && (
              <g transform={`translate(${popularCentroid[0]}, ${popularCentroid[1]})`} className="pointer-events-none">
                <circle r="4" fill="#0F8AA8" opacity="0.25" />
                <circle r="2.5" fill="#FFFFFF" stroke="#084E60" strokeWidth="1.5" />
              </g>
            )}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#E8EFF2] pt-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-[#6B7280]">{normalizedDistrict}</span>
          <p className="m-0 truncate text-xl font-black tracking-[-0.02em] text-[#123047] sm:text-2xl">
            {normalizedDong}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E8F6F9] px-2.5 py-1 text-xs font-extrabold text-[#0F8AA8]">
          인기 법정동
        </span>
      </div>
    </div>
  );
}
