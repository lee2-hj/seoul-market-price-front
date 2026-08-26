export interface DistrictPriceItem {
  rank: number;
  districtName: string;
  averageDealPrice: number;
  averagePyeongPrice: number;
}

export interface PriceChangeItem {
  rank: number;
  apartmentName: string;
  changeRate: number;
}

export interface MainPageViewData {
  periodStart: string;
  periodEnd: string;
  districts: DistrictPriceItem[];
  rising: PriceChangeItem[];
  falling: PriceChangeItem[];
}

export interface PreferencePriceTrendItem {
  periodLabel: string;
  startDate: string;
  endDate: string;
  averageDealPrice: number;
  averagePyeongPrice: number;
  dealCount: number;
}

export interface PreferenceTradingDongItem {
  rank: number;
  districtName: string;
  dongName: string;
  dealCount: number;
}

export interface PreferencePopularDongItem {
  districtName: string;
  dongName: string;
}

export interface PreferenceTradingApartmentItem {
  rank: number;
  apartmentName: string;
  recentDealPrice: number;
  dealCount: number;
}

export interface PreferenceDashboardData {
  priceTrend: PreferencePriceTrendItem[];
  topTradingDongs: PreferenceTradingDongItem[];
  popularDong: PreferencePopularDongItem | null;
  topTradingApartments: PreferenceTradingApartmentItem[];
}
