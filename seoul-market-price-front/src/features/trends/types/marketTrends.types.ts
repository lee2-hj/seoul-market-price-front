/**
 * 아파트별 거래동향(/trends) 페이지 필터 상태
 * 구(sggCd) -> 동(dongCd) -> 아파트명(keyword) 자동완성 검색으로 구성된다.
 */
export interface MarketTrendsFilterState {
  sggCd: string;
  dongCd: string;
  keyword: string;
}

/**
 * 거래동향 응답의 biweekly_trend 항목 프론트엔드 모델.
 * 백엔드 필드명이 avg_price/avg_trade_amount, deal_count/deal_cnt 등으로 혼재되어 있어
 * 두 형태를 모두 허용하는 형태로 정의한다.
 */
export interface ApartmentTrendPeriod {
  biweekly_period?: string;
  period_label?: string;
  start_date?: string;
  end_date?: string;
  deal_count?: number | null;
  deal_cnt?: number | null;
  avg_price?: number | null;
  avg_trade_amount?: number | null;
}
