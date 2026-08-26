import { Chart } from "react-google-charts";

type PriceAxisTick = {
  v: number;
  f: string;
};

type TradeTrendChartValue = string | number | { v: number; f: string };

export type ApartmentTradeTrendChartProps = {
  data: TradeTrendChartValue[][];
  averagePriceAxisTicks?: PriceAxisTick[];
  height?: string;
};

/**
 * 아파트별 거래동향에서 사용하는 거래량·평균 거래가 차트의 표시 규칙입니다.
 * 조회와 데이터 가공은 각 화면이 담당하고, 이 컴포넌트는 시각화만 담당합니다.
 */
export function ApartmentTradeTrendChart({
  data,
  averagePriceAxisTicks,
  height = "240px",
}: ApartmentTradeTrendChartProps) {
  return (
    <div className="min-w-0 w-full max-w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full">
      <Chart
        chartType="ComboChart"
        width="100%"
        height={height}
        data={data}
        options={{
        backgroundColor: "transparent",
        chartArea: { left: 60, top: 15, width: "80%", height: "76%" },
        seriesType: "bars",
        series: {
          0: { type: "bars", targetAxisIndex: 0, color: "#2563eb" },
          1: { type: "line", targetAxisIndex: 1, color: "#16a34a", lineWidth: 3, pointSize: 6 },
        },
        vAxes: {
          0: { title: "거래량(건)", minValue: 0, format: "0", gridlines: { color: "#E2E8F0", count: 4 }, minorGridlines: { count: 0 } },
          1: { title: "평균 거래가(만원)", minValue: 0, ticks: averagePriceAxisTicks, gridlines: { color: "transparent" }, minorGridlines: { count: 0 } },
        },
        hAxis: { slantedText: false },
        legend: { position: "none" },
        }}
      />
    </div>
  );
}
