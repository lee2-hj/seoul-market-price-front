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

const mapRank = (item: TopAndBottomItemResponse, index: number): ApartmentPriceRank => ({
  code: `${item.stdg_cd}-${item.bldg_nm}-${index}`,
  name: item.bldg_nm,
  averagePrice: item.avg_thing_amt,
  dealCount: item.deal_cnt,
});

export async function getApartmentPriceRanking(
  guCode: string,
  dongCode: string,
): Promise<ApartmentPriceRanking> {
  const { data } = await apiMiddleware.get<TopAndBottomResponse>("/fastApi/topandbottom", {
    params: {
      guCode,
      dongCode,
      metricType: "thing_amt",
    },
  });

  return {
    baseDate: data.base_date,
    totalCount: data.total_count,
    top: (data.top ?? []).slice(0, 5).map(mapRank),
    bottom: (data.bottom ?? []).slice(0, 5).map(mapRank),
  };
}
