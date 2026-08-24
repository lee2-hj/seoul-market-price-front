import apiMiddleware from "@/api/middleware";
import { getDongs, getSggs } from "@/features/location/services/locationService";

export interface RegionPriceSummary {
  code: string;
  name: string;
  totalCount: number;
  averageTradePrice: number;
  averagePyeongPrice: number;
}

interface RegionPriceListResponse {
  base_date: string;
  groups: Record<string, {
    code: string;
    name: string;
    total_count: number;
    avg_thing_amt: number;
    avg_pyeong_amt: number;
  }>;
}

export interface ApartmentPriceSummary {
  name: string;
  dongName: string;
  dealCount: number;
  averageTradePrice: number;
  averagePyeongPrice: number;
}

export interface ApartmentTrendRegionData extends DongPriceAnalysis {
  guName: string;
  dongName: string;
  guCode: string;
  dongCode: string;
}

interface TopAndBottomResponse {
  base_date: string;
  total_count: number;
  avg_thing_amt: number;
  avg_pyeong_amt: number;
  top: Array<{
    bldg_nm: string;
    stdg_nm: string;
    deal_cnt: number;
    avg_thing_amt: number;
    avg_pyeong_amt: number;
  }>;
  bottom: Array<{
    bldg_nm: string;
    stdg_nm: string;
    deal_cnt: number;
    avg_thing_amt: number;
    avg_pyeong_amt: number;
  }>;
}

export interface DongPriceAnalysis {
  baseDate: string;
  totalCount: number;
  averageTradePrice: number;
  averagePyeongPrice: number;
  top: ApartmentPriceSummary[];
  bottom: ApartmentPriceSummary[];
}

export async function getRegionPriceList(guCode: string) {
  const { data } = await apiMiddleware.get<RegionPriceListResponse>("/fastApi/list", {
    params: { guCode },
  });

  return {
    baseDate: data.base_date,
    groups: Object.values(data.groups ?? {}).map((item) => ({
      code: item.code,
      name: item.name,
      totalCount: item.total_count,
      averageTradePrice: item.avg_thing_amt,
      averagePyeongPrice: item.avg_pyeong_amt,
    })),
  };
}

export async function getDongPriceAnalysis(guCode: string, dongCode: string): Promise<DongPriceAnalysis> {
  const { data } = await apiMiddleware.get<TopAndBottomResponse>("/fastApi/topandbottom", {
    params: { guCode, dongCode, metricType: "thing_amt" },
  });
  const mapItem = (item: TopAndBottomResponse["top"][number]): ApartmentPriceSummary => ({
    name: item.bldg_nm,
    dongName: item.stdg_nm,
    dealCount: item.deal_cnt,
    averageTradePrice: item.avg_thing_amt,
    averagePyeongPrice: item.avg_pyeong_amt,
  });

  return {
    baseDate: data.base_date,
    totalCount: data.total_count,
    averageTradePrice: data.avg_thing_amt,
    averagePyeongPrice: data.avg_pyeong_amt,
    top: (data.top ?? []).map(mapItem),
    bottom: (data.bottom ?? []).map(mapItem),
  };
}

export async function getApartmentTrendRegionData(
  guName: string,
  dongName: string,
): Promise<ApartmentTrendRegionData | null> {
  const sggs = await getSggs();
  const gu = sggs.find((item) => item.sggNm.trim() === guName.trim());
  if (!gu) return null;

  const dongs = await getDongs(gu.sggCd);
  const dong = dongs.find((item) => item.dongNm.trim() === dongName.trim());
  if (!dong) return null;

  const analysis = await getDongPriceAnalysis(gu.sggCd, dong.dongCd);
  return {
    ...analysis,
    guName: gu.sggNm,
    dongName: dong.dongNm,
    guCode: gu.sggCd,
    dongCode: dong.dongCd,
  };
}
