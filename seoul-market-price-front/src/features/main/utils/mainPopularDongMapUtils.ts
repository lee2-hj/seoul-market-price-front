type Position = [number, number];

export interface DongFeature {
  type: "Feature";
  properties: {
    EMD_CD: string;
    EMD_NM: string;
    COL_ADM_SE: string;
    SGG_OID?: number;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Position[][] | Position[][][];
  };
}

export interface DongGeoJson {
  type: "FeatureCollection";
  features: DongFeature[];
}

export function rewindDongFeature(feature: DongFeature): DongFeature {
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

let cachedDongGeoJson: DongGeoJson | null = null;
let dongGeoJsonPromise: Promise<DongGeoJson> | null = null;

export function getCachedDongGeoJson(): DongGeoJson | null {
  return cachedDongGeoJson;
}

export async function fetchLegalDongGeoJson(): Promise<DongGeoJson> {
  if (cachedDongGeoJson) return cachedDongGeoJson;
  if (!dongGeoJsonPromise) {
    dongGeoJsonPromise = fetch("/geo/seoul-legal-dongs.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("법정동 지도 데이터를 불러오지 못했습니다.");
        return response.json() as Promise<DongGeoJson>;
      })
      .then((data) => {
        cachedDongGeoJson = data;
        return data;
      })
      .catch((error: unknown) => {
        dongGeoJsonPromise = null;
        throw error;
      });
  }
  return dongGeoJsonPromise;
}
