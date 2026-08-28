import apiMiddleware from "@/api/middleware";

interface TopAndBottomItemResponse {
  base_date: string;
  cgg_cd: string;
  cgg_nm: string;
  stdg_cd: string;
  stdg_nm: string;
  bldg_nm: string;
  latitude: number | null;
  longitude: number | null;
  is_exact_location: boolean;
  updated_at: string;
  deal_cnt: number;
  avg_thing_amt: number;
  avg_pyeong_amt: number;
}

interface TopAndBottomResponse {
  base_date: string;
  total_count: number;
  avg_thing_amt: number;
  avg_pyeong_amt: number;
  top: TopAndBottomItemResponse[];
  bottom: TopAndBottomItemResponse[];
}

export interface ApartmentPriceRank {
  code: string;
  name: string;
  averagePrice: number;
  dealCount: number;
}

export interface ApartmentPriceRanking {
  baseDate: string;
  totalCount: number;
  top: ApartmentPriceRank[];
  bottom: ApartmentPriceRank[];
}

export type PriceMetricType = "thing_amt" | "pyeong";

const mapRank = (
  item: TopAndBottomItemResponse,
  index: number,
  metricType: PriceMetricType,
): ApartmentPriceRank => ({
  code: `${item.stdg_cd}-${item.bldg_nm}-${index}`,
  name: item.bldg_nm,
  averagePrice: metricType === "pyeong" ? item.avg_pyeong_amt : item.avg_thing_amt,
  dealCount: item.deal_cnt,
});

export async function getApartmentPriceRanking(
  guCode: string,
  dongCode: string,
  metricType: PriceMetricType,
): Promise<ApartmentPriceRanking> {
  const { data } = await apiMiddleware.get<TopAndBottomResponse>("/fastApi/topandbottom", {
    params: {
      guCode,
      dongCode,
      metricType,
    },
  });
  const top = (data.top ?? []).slice(0, 5).map((item, index) => mapRank(item, index, metricType));
  const topNames = new Set(top.map((item) => item.name.trim()));
  const bottom = (data.bottom ?? [])
    .map((item, index) => mapRank(item, index, metricType))
    .filter((item) => !topNames.has(item.name.trim()))
    .slice(0, 5);

  return {
    baseDate: data.base_date,
    totalCount: data.total_count,
    top,
    bottom,
  };
}

interface FastApiListResponse {
  base_date?: string;
  groups?: Record<
    string,
    {
      code?: string;
      name?: string;
      total_count?: number;
      avg_thing_amt?: number;
      avg_pyeong_amt?: number;
    }
  >;
}

/**
 * 서울시 전체 구별 실제 평균 매매가 조회 (GET /fastApi/list)
 */
export async function getFastApiDistrictPrices(): Promise<Record<string, number>> {
  try {
    const { data } = await apiMiddleware.get<FastApiListResponse>("/fastApi/list");
    const result: Record<string, number> = {};
    if (data?.groups) {
      Object.values(data.groups).forEach((group) => {
        if (group.name && typeof group.avg_thing_amt === "number" && group.avg_thing_amt > 0) {
          result[group.name] = group.avg_thing_amt;
        }
      });
    }
    return result;
  } catch (err) {
    console.warn("FastAPI 구별 평균 매매가 조회 실패 (기본 데이터 유지):", err);
    return {};
  }
}

/**
 * 선택된 구의 동별 실제 평균 매매가 조회 (GET /fastApi/list?guCode=...)
 */
export async function getFastApiDongPrices(guCode: string): Promise<Record<string, number>> {
  if (!guCode) return {};
  try {
    const { data } = await apiMiddleware.get<FastApiListResponse>("/fastApi/list", {
      params: { guCode },
    });
    const result: Record<string, number> = {};
    if (data?.groups) {
      Object.values(data.groups).forEach((group) => {
        if (group.name && typeof group.avg_thing_amt === "number" && group.avg_thing_amt > 0) {
          result[group.name] = group.avg_thing_amt;
        }
      });
    }
    return result;
  } catch (err) {
    console.warn(`FastAPI 동별 평균 매매가 조회 실패 (guCode: ${guCode}):`, err);
    return {};
  }
}

