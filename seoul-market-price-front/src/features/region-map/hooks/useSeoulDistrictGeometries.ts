import { useQuery } from "@tanstack/react-query";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";

export interface DistrictProperties {
  name: string;
  code: string;
}

export interface DistrictFeature {
  type: "Feature";
  properties: DistrictProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface SeoulGeoJson {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

export interface DongProperties {
  COL_ADM_SE: string;
  EMD_CD: string;
  EMD_NM: string;
}

export interface DongFeature {
  type: "Feature";
  properties: DongProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface DongGeoJson {
  type: "FeatureCollection";
  features: DongFeature[];
}

export interface DistrictGeometry {
  name: string;
  path: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

export interface BasePathContext {
  basePath: ReturnType<typeof geoPath>;
}

interface RawSeoulGeoJsonData {
  districts: SeoulGeoJson;
  dongs: DongGeoJson;
}

interface SeoulDistrictGeometriesData {
  districtGeometries: DistrictGeometry[];
  basePathContext: BasePathContext;
  dongGeoData: DongGeoJson;
}

const WIDTH = 960;
const HEIGHT = 680;

async function fetchSeoulGeoJsonData(): Promise<RawSeoulGeoJsonData> {
  const [districtResponse, dongResponse] = await Promise.all([
    fetch("/seoul-municipalities.geo.json"),
    fetch("/geo/seoul-legal-dongs.geojson"),
  ]);
  if (!districtResponse.ok || !dongResponse.ok) {
    throw new Error("서울 행정구역 경계를 불러오지 못했습니다.");
  }
  const [districts, dongs] = await Promise.all([
    districtResponse.json() as Promise<SeoulGeoJson>,
    dongResponse.json() as Promise<DongGeoJson>,
  ]);
  return { districts, dongs };
}

// select 옵션에 전달하는 함수는 매 렌더 새로 생성되지 않는 모듈 스코프 참조여야
// React Query가 이전 계산 결과를 재사용한다(참조가 매번 바뀌면 데이터가 그대로여도
// 매 렌더 재계산됨). 투영(projection)/구 지오메트리(path·centroid·bounds) 연산을
// 이 안에서 한 번만 수행해, 25개 자치구 연산이 fetch당 정확히 1회만 일어나게 한다.
function selectSeoulDistrictGeometries(data: RawSeoulGeoJsonData): SeoulDistrictGeometriesData {
  const baseProjection = geoMercator().fitExtent(
    [[20, 20], [WIDTH - 20, HEIGHT - 20]],
    data.districts as unknown as GeoPermissibleObjects,
  );
  const basePath = geoPath(baseProjection);
  const basePathContext: BasePathContext = { basePath };

  const districtGeometries = data.districts.features.map((feature) => ({
    name: feature.properties.name,
    path: basePath(feature as unknown as GeoPermissibleObjects) ?? "",
    center: basePath.centroid(feature as unknown as GeoPermissibleObjects),
    bounds: basePath.bounds(feature as unknown as GeoPermissibleObjects),
  }));

  return { districtGeometries, basePathContext, dongGeoData: data.dongs };
}

export function useSeoulDistrictGeometries() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["seoulDistrictGeoJson"],
    queryFn: fetchSeoulGeoJsonData,
    staleTime: Infinity,
    gcTime: Infinity,
    select: selectSeoulDistrictGeometries,
  });

  return {
    districtGeometries: data?.districtGeometries ?? null,
    basePathContext: data?.basePathContext ?? null,
    dongGeoData: data?.dongGeoData ?? null,
    isLoading,
    error,
  };
}
