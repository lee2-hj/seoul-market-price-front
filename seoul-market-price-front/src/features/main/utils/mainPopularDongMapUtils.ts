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

export const SEOUL_DISTRICT_CODE_MAP: Record<string, string> = {
  "종로구": "11110",
  "중구": "11140",
  "용산구": "11170",
  "성동구": "11200",
  "광진구": "11215",
  "동대문구": "11230",
  "중랑구": "11260",
  "성북구": "11290",
  "강북구": "11305",
  "도봉구": "11320",
  "노원구": "11350",
  "은평구": "11380",
  "서대문구": "11410",
  "마포구": "11440",
  "양천구": "11470",
  "강서구": "11500",
  "구로구": "11530",
  "금천구": "11545",
  "영등포구": "11560",
  "동작구": "11590",
  "관악구": "11620",
  "서초구": "11650",
  "강남구": "11680",
  "송파구": "11710",
  "강동구": "11740",
};

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
  if (cachedDongGeoJson) return cachedDongDong();
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

function cachedDongDong(): DongGeoJson {
  return cachedDongGeoJson as DongGeoJson;
}
