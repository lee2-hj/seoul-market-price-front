/* eslint-disable react-hooks/refs -- useComboboxNavigation(아래)이 반환하는 객체에
   ref을 감싼 콜백(setContainerRef/setItemRef)이 하나라도 섞여 있으면, 실제로는
   effect/이벤트 핸들러 안에서만 .current를 읽고 쓰는데도 eslint-plugin-react-hooks
   v7의 "refs" 규칙이 그 객체의 모든 프로퍼티 접근을 "렌더 중 ref 접근"으로
   과탐지한다. 커스텀 훅으로 묶어 재사용하기 위해 이 파일에 한해 규칙을 끈다. */
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { Chart } from "react-google-charts";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Building2, Info, RotateCcw, Search, X } from "lucide-react";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { TRENDS_NAVIGATION } from "@/config/sectionNavigation";
import {
  getApartmentMarketTrendApi,
  getDongsApi,
  getSggsApi,
  searchApartmentAutocompleteApi,
  type ApartmentAutocompleteItem,
} from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EMPTY_VALUE = "__all__";
const TRENDS_SESSION_KEY = "market_trends_query";
const TRENDS_RELOAD_FLAG_KEY = "market_trends_is_reload";
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
// 컴포넌트 상태에 의존하지 않는 고정 옵션이라 모듈 스코프 상수로 두어,
// 리렌더와 무관하게 항상 같은 참조를 Chart에 전달한다.
const PIE_CHART_OPTIONS = {
  backgroundColor: "transparent",
  is3D: false,
  pieHole: 0.45,
  pieSliceBorderColor: "transparent",
  pieSliceText: "value",
  pieSliceTextStyle: { color: "#ffffff", fontSize: 12, bold: true },
  sliceVisibilityThreshold: 0,
  legend: "none",
  chartArea: { left: 5, top: 8, width: "90%", height: 190 },
  colors: PIE_COLORS,
  tooltip: { isHtml: true, trigger: "focus" },
};
const apartmentKey = (apt: ApartmentAutocompleteItem) =>
  `${apt.sggCd}-${apt.dongCd}-${apt.aptName}-${apt.mno}-${apt.sno}`;
const formatExclusiveArea = (
  exclusiveArea: string | number | null | undefined,
  pyeong: number | null | undefined,
) => {
  const areaValue = Number(exclusiveArea);
  if (!Number.isFinite(areaValue)) return "-";
  const pyeongValue = Number(pyeong);
  const roundedPyeong = pyeong != null && Number.isFinite(pyeongValue)
    ? Math.round(pyeongValue)
    : Math.round(areaValue / 3.3058);
  return `${areaValue.toFixed(2)}㎡ (${roundedPyeong}평)`;
};
const formatPyeongRange = (pyeong: number) =>
  pyeong < 10 ? "10평 미만" : `${Math.floor(pyeong / 10) * 10}평대`;
// row.pyeong은 타입상 number지만, 백엔드 응답이 느슨하게 검증되어 실제로는
// "", null, undefined가 섞여 들어올 수 있다. 매개변수를 unknown으로 받아
// 호출부에서 별도 캐스팅 없이(number -> unknown은 항상 안전한 암묵적 확장) 안전하게 검사한다.
const hasMeaningfulValue = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== "";
const formatMarketAmount = (amount: number | null | undefined) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) < 10_000) return `${value.toLocaleString()}만원`;

  const eok = Math.trunc(value / 10_000);
  const manwon = Math.abs(value % 10_000);
  return manwon === 0
    ? `${eok.toLocaleString()}억원`
    : `${eok.toLocaleString()}억 ${manwon.toLocaleString()}만원`;
};
const formatEokAmount = (amount: number | null | undefined) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "-";
  return `${(value / 10_000).toFixed(1)}억`;
};
// 건물 총 층수를 알 수 없으므로, 실제 거래에 등장한 최고층을 기준으로 저층/중층/고층을 3등분한다.
const getFloorBucket = (floor: number, maxFloor: number): "저층" | "중층" | "고층" => {
  if (maxFloor <= 0) return "중층";
  const ratio = floor / maxFloor;
  if (ratio <= 1 / 3) return "저층";
  if (ratio <= 2 / 3) return "중층";
  return "고층";
};
interface ApartmentTrendPeriod {
  biweekly_period?: string;
  period_label?: string;
  start_date?: string;
  end_date?: string;
  deal_count?: number | null;
  deal_cnt?: number | null;
  avg_price?: number | null;
  avg_trade_amount?: number | null;
}
const getApartmentFromSearchParams = (params: URLSearchParams): ApartmentAutocompleteItem | null => {
  const sggCd = params.get("sggCd") ?? "";
  const dongCd = params.get("dongCd") ?? "";
  const aptName = params.get("aptName") ?? "";
  const mno = params.get("mno") ?? "";
  const sno = params.get("sno") ?? "";
  return sggCd && dongCd && aptName && mno && sno
    ? { sggCd, dongCd, aptName, mno, sno, sggNm: "", dongNm: "" }
    : null;
};

function EmptyState({ message }: { message: string }) {
  return <div className="flex h-[240px] items-center justify-center text-[13px] text-[#64748B]">{message}</div>;
}

// ---- 검색 조건(구/동/아파트) 통합 상태 ----------------------------------------------
// sggCd/dongCd/keyword/guInput/dongInput/selectedApartment/submittedApartment는 서로
// 얽혀서 함께 바뀌는 경우가 많아(구를 바꾸면 동/아파트가 초기화되는 등) 개별 useState
// 대신 하나의 reducer로 묶어 연쇄 로직을 한곳에 모은다. 드롭다운 열림/하이라이트,
// "전체 실거래 내역" 팝업의 면적/층수 필터는 이 조건들과 성격이 달라(화면 표시용
// 상태일 뿐 조회 조건 자체가 아님) 그대로 개별 useState로 둔다.
interface SearchFormState {
  sggCd: string;
  dongCd: string;
  keyword: string;
  guInput: string;
  dongInput: string;
  selectedApartment: ApartmentAutocompleteItem | null;
  submittedApartment: ApartmentAutocompleteItem | null;
}
type SearchFormAction =
  // 구 입력창에 직접 타이핑: 이미 선택된 구와 다른 값이면 구/동 선택을 초기화한다.
  | { type: "SET_GU_INPUT"; value: string; selectedGuName: string }
  // 구를 선택/해제(자동완성 클릭·Enter, "선택 안 함"): 동·키워드·선택아파트를 초기화한다.
  | { type: "SELECT_GU"; sggCd: string; sggNm: string }
  // 동 입력창에 직접 타이핑
  | { type: "SET_DONG_INPUT"; value: string; selectedDongName: string }
  // 동을 선택/해제: 키워드·선택아파트를 초기화한다.
  | { type: "SELECT_DONG"; dongCd: string; dongNm: string }
  // 아파트명 입력창에 직접 타이핑: 이전에 선택돼 있던 아파트를 무효화한다.
  | { type: "SET_KEYWORD"; value: string }
  // 자동완성 목록에서 아파트 선택: 그 아파트가 속한 구/동으로 입력값을 역동기화한다.
  | { type: "SELECT_APARTMENT"; apartment: ApartmentAutocompleteItem }
  // "조회" 버튼: 선택된 아파트를 실제 조회 대상(submittedApartment)으로 확정한다.
  | { type: "SUBMIT_APARTMENT"; apartment: ApartmentAutocompleteItem }
  // 새로고침 복원: 세션에 저장해둔 검색 조건을 되돌린다.
  | { type: "RESTORE"; sggCd: string; dongCd: string; keyword: string; apartment: ApartmentAutocompleteItem | null }
  // "초기화" 버튼
  | { type: "RESET" };

function searchFormReducer(state: SearchFormState, action: SearchFormAction): SearchFormState {
  switch (action.type) {
    case "SET_GU_INPUT": {
      const shouldClearSelection = Boolean(state.sggCd) && action.value !== action.selectedGuName;
      return {
        ...state,
        guInput: action.value,
        ...(shouldClearSelection ? { sggCd: "", dongCd: "", dongInput: "" } : {}),
      };
    }
    case "SELECT_GU":
      return {
        ...state,
        guInput: action.sggCd ? action.sggNm : "",
        sggCd: action.sggCd,
        dongCd: "",
        dongInput: "",
        keyword: "",
        selectedApartment: null,
        submittedApartment: null,
      };
    case "SET_DONG_INPUT": {
      const shouldClearSelection = Boolean(state.dongCd) && action.value !== action.selectedDongName;
      return {
        ...state,
        dongInput: action.value,
        ...(shouldClearSelection ? { dongCd: "" } : {}),
      };
    }
    case "SELECT_DONG":
      return {
        ...state,
        dongInput: action.dongCd ? action.dongNm : "",
        dongCd: action.dongCd,
        keyword: "",
        selectedApartment: null,
        submittedApartment: null,
      };
    case "SET_KEYWORD":
      return { ...state, keyword: action.value, selectedApartment: null };
    case "SELECT_APARTMENT":
      // 아파트를 검색/선택만으로도 그 아파트가 속한 구·동이 상단 입력값에 곧바로
      // 반영되도록 동기화한다. dongCd는 구/동 목록(getDongsApi)이 쓰는 "뒤 5자리"
      // 코드 형식과 맞춰야 selectedDongName 등 기존 매칭 로직이 정상 동작하므로
      // 동일하게 slice(-5)를 적용한다.
      return {
        ...state,
        selectedApartment: action.apartment,
        keyword: action.apartment.aptName,
        sggCd: action.apartment.sggCd,
        guInput: action.apartment.sggNm,
        dongCd: action.apartment.dongCd.slice(-5),
        dongInput: action.apartment.dongNm,
      };
    case "SUBMIT_APARTMENT":
      return { ...state, submittedApartment: action.apartment };
    case "RESTORE":
      return {
        ...state,
        sggCd: action.sggCd,
        dongCd: action.dongCd,
        keyword: action.keyword,
        selectedApartment: action.apartment,
        submittedApartment: action.apartment,
      };
    case "RESET":
      return {
        ...state,
        guInput: "",
        dongInput: "",
        sggCd: "",
        dongCd: "",
        keyword: "",
        selectedApartment: null,
        submittedApartment: null,
      };
    default:
      return state;
  }
}
const initialSearchFormState = (params: URLSearchParams): SearchFormState => {
  const apartment = getApartmentFromSearchParams(params);
  return {
    sggCd: params.get("sggCd") ?? "",
    dongCd: params.get("dongCd") ?? "",
    keyword: params.get("aptName") ?? "",
    guInput: "",
    dongInput: "",
    selectedApartment: apartment,
    submittedApartment: apartment,
  };
};

// ---- 구/동/아파트 콤보박스 공용 훅 ---------------------------------------------------
// 세 콤보박스(구/동/아파트) 모두 "열림 상태 + 하이라이트 인덱스 + 방향키 탐색 +
// 바깥 클릭 시 닫힘 + 하이라이트 항목 스크롤"이라는 동일한 패턴을 반복하므로 하나의
// 훅으로 뽑아 재사용한다. 실제 "선택된 값"은 콤보박스마다 의미가 달라 훅에 담지 않고
// 호출부(검색 조건 reducer)에서 관리한다.
function useComboboxNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (highlight >= 0 && itemRefs.current[highlight]) {
      itemRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlight]);

  // 바깥 영역 클릭 시 열림 상태만 닫는다. 하이라이트는 닫혀 있는 동안 화면에
  // 보이지 않고, 다음에 open()으로 다시 열릴 때 항상 초기화되므로 그대로 둬도 된다.
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setHighlight(-1);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setHighlight(-1);
  }, []);
  const setItemRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      itemRefs.current[index] = el;
    },
    [],
  );
  // containerRef 객체 자체를 훅 바깥으로 그대로 반환하면(다른 값들과 한 객체에
  // 묶여) 최신 eslint-plugin-react-hooks의 refs 규칙이 반환 객체 전체를 "렌더 중
  // ref 접근"으로 오탐지한다. 콜백 ref 형태로만 노출해 이를 피한다.
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);
  const handleKeyDown = <T,>(
    event: KeyboardEvent<HTMLInputElement>,
    list: T[],
    onSelect: (item: T, index: number) => void,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlight((index) => (list.length ? (index + 1) % list.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlight((index) => (list.length ? (index <= 0 ? list.length - 1 : index - 1) : -1));
    } else if (event.key === "Enter" && highlight >= 0 && list[highlight]) {
      event.preventDefault();
      onSelect(list[highlight], highlight);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setHighlight(-1);
    }
  };

  return { isOpen, setIsOpen, highlight, setHighlight, setContainerRef, setItemRef, open, close, handleKeyDown };
}

// 구/동/아파트 드롭다운 리스트 아이템에 반복되는 Tailwind 클래스. active는 하이라이트
// 중이거나 이미 선택된 상태를 의미한다. 아파트 목록만 좌우/상단 테두리 유틸리티
// (border-x-0/border-t-0)가 없는 기존 스타일이라 hasSideBorder로 구분해 그대로 유지한다.
const getDropdownItemClassName = (active: boolean, hasSideBorder = true) =>
  `h-auto w-full justify-between rounded-none ${hasSideBorder ? "border-x-0 border-b border-t-0" : "border-b"} border-[#F1F5F9] px-4 py-2.5 last:border-b-0 hover:bg-[#EFF6FF] ${active ? "bg-[#EFF6FF]" : ""}`;

export default function MarketTrendsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, dispatch] = useReducer(searchFormReducer, searchParams, initialSearchFormState);
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchForm.keyword);
  const [isTrendChartReady, setIsTrendChartReady] = useState(false);
  const [isPieChartReady, setIsPieChartReady] = useState(false);
  const [isRecentDealsModalOpen, setIsRecentDealsModalOpen] = useState(false);
  const [isAreaDealsModalOpen, setIsAreaDealsModalOpen] = useState(false);
  // "전체 실거래 내역" 팝업 안에서만 쓰는 면적/층수 필터. "전체"가 기본값이다.
  const [recentDealsAreaFilter, setRecentDealsAreaFilter] = useState("all");
  const [recentDealsFloorFilter, setRecentDealsFloorFilter] = useState("all");
  const guCombobox = useComboboxNavigation();
  const dongCombobox = useComboboxNavigation();
  const apartmentCombobox = useComboboxNavigation();

  // 새로고침(F5) 직전에만 플래그를 남겨, "새로고침"과 "다른 메뉴/탭으로 이동"을 구분한다.
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(TRENDS_RELOAD_FLAG_KEY, "1");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // 새로고침이 아니라 SPA 라우팅으로 이 페이지를 벗어나는 경우, 검색 상태가
      // 다음 방문까지 남아있지 않도록 세션에 저장해둔 검색 조건을 정리한다.
      if (sessionStorage.getItem(TRENDS_RELOAD_FLAG_KEY) !== "1") {
        sessionStorage.removeItem(TRENDS_SESSION_KEY);
      }
    };
  }, []);

  // 마운트 시 1회만: 새로고침으로 돌아온 경우에 한해 세션에 저장된 검색 조건을 복원한다.
  useEffect(() => {
    const isReload = sessionStorage.getItem(TRENDS_RELOAD_FLAG_KEY) === "1";
    sessionStorage.removeItem(TRENDS_RELOAD_FLAG_KEY);

    if (!isReload || searchParams.toString()) return;

    const savedQuery = sessionStorage.getItem(TRENDS_SESSION_KEY);
    if (!savedQuery) return;

    const restoredParams = new URLSearchParams(savedQuery);
    const restoredAptName = restoredParams.get("aptName") ?? "";
    const restoredApartment = getApartmentFromSearchParams(restoredParams);

    setSearchParams(restoredParams, { replace: true });
    // 이펙트 본문에서 setState를 동기 호출하면 렌더링이 연쇄적으로 발생하므로
    // 마이크로태스크로 미뤄 한 번에 배치 처리한다.
    queueMicrotask(() => {
      dispatch({
        type: "RESTORE",
        sggCd: restoredParams.get("sggCd") ?? "",
        dongCd: restoredParams.get("dongCd") ?? "",
        keyword: restoredAptName,
        apartment: restoredApartment,
      });
      setDebouncedKeyword(restoredAptName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 조건이 바뀔 때마다 새로고침 대비용으로 세션에 반영한다.
  // searchParams 객체 자체가 아니라 실제 값(문자열)에만 의존해, URL 내용은
  // 그대로인데 참조만 바뀌는 경우까지 불필요하게 재실행되지 않게 한다.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (searchParamsString) {
      sessionStorage.setItem(TRENDS_SESSION_KEY, searchParamsString);
    } else {
      sessionStorage.removeItem(TRENDS_SESSION_KEY);
    }
  }, [searchParamsString]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(searchForm.keyword), 300);
    return () => window.clearTimeout(id);
  }, [searchForm.keyword]);

  const { data: sggs = [] } = useQuery({ queryKey: ["trendSggs"], queryFn: getSggsApi, staleTime: 1800000 });
  const selectedGuName = sggs.find((sgg) => sgg.sggCd === searchForm.sggCd)?.sggNm ?? "";
  const filteredSggs = useMemo(() => {
    const query = searchForm.guInput.trim().toLowerCase();
    if (!query || query === selectedGuName.toLowerCase()) {
      return sggs;
    }
    return sggs.filter((item) => item.sggNm.toLowerCase().includes(query));
  }, [searchForm.guInput, selectedGuName, sggs]);
  const { data: dongs = [] } = useQuery({
    queryKey: ["trendDongs", searchForm.sggCd], queryFn: () => getDongsApi(searchForm.sggCd), enabled: Boolean(searchForm.sggCd), staleTime: 1800000,
  });
  const selectedDongName = dongs.find((item) => item.dongCd.slice(-5) === searchForm.dongCd)?.dongNm ?? "";
  const filteredDongs = useMemo(() => {
    const query = searchForm.dongInput.trim().toLowerCase();
    if (!query || query === selectedDongName.toLowerCase()) {
      return dongs;
    }
    return dongs.filter((item) => item.dongNm.toLowerCase().includes(query));
  }, [searchForm.dongInput, selectedDongName, dongs]);
  const autocomplete = useQuery({
    queryKey: ["trendAutocomplete", debouncedKeyword, searchForm.sggCd, searchForm.dongCd, searchForm.selectedApartment?.aptName],
    queryFn: () =>
      searchApartmentAutocompleteApi({
        aptName: debouncedKeyword === searchForm.selectedApartment?.aptName ? "" : debouncedKeyword,
        sggCd: searchForm.sggCd,
        dongCd: searchForm.dongCd,
      }),
    enabled: apartmentCombobox.isOpen || Boolean(debouncedKeyword),
    staleTime: 30000,
  });
  // 필수 식별자 중 하나라도 비어있으면(잘못 복원된 URL 쿼리 등) 요청 자체를 막는다.
  const isSubmittedApartmentComplete = Boolean(
    searchForm.submittedApartment?.sggCd &&
      searchForm.submittedApartment?.dongCd &&
      searchForm.submittedApartment?.aptName &&
      searchForm.submittedApartment?.mno &&
      searchForm.submittedApartment?.sno,
  );
  const trend = useQuery({
    queryKey: ["apartmentMarketTrend", searchForm.submittedApartment && apartmentKey(searchForm.submittedApartment)],
    queryFn: () => getApartmentMarketTrendApi({
      guCode: searchForm.submittedApartment!.sggCd, dongCode: searchForm.submittedApartment!.dongCd,
      aptName: searchForm.submittedApartment!.aptName, mno: searchForm.submittedApartment!.mno, sno: searchForm.submittedApartment!.sno,
    }),
    enabled: isSubmittedApartmentComplete,
    // 탭 이동 후 복귀(refetchOnWindowFocus) 시 동일 아파트 데이터를 불필요하게
    // 재요청하지 않도록 캐시 유효 기간을 둔다.
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // 기본값(3회, 지수 백오프)이면 외부 FastAPI가 느릴 때 체감 대기시간이
    // 3배로 늘어나므로, 다른 메인페이지 쿼리들과 동일하게 1회로 제한한다.
    // 재시도 전 2초를 둬서 서버가 이미 느린 상황에 바로 재요청이 몰리지 않게 한다.
    retry: 1,
    retryDelay: 2000,
  });
  const item = trend.data?.status === "success" && trend.data.count > 0 ? trend.data.data[0] : undefined;
  const updateUrl = (apt: ApartmentAutocompleteItem | null) => setSearchParams(apt ? {
    sggCd: apt.sggCd, dongCd: apt.dongCd, aptName: apt.aptName, mno: apt.mno, sno: apt.sno,
  } : {});

  // 구 선택/해제: EMPTY_VALUE 정규화 후 reducer에 반영하고, 동/아파트 콤보박스를
  // 함께 닫는다("선택 안 함" 버튼과 자동완성 선택 두 경로 모두 이 함수 하나로 처리).
  const chooseGu = (value: string, name = "") => {
    const code = value === EMPTY_VALUE ? "" : value;
    dispatch({ type: "SELECT_GU", sggCd: code, sggNm: name });
    guCombobox.close();
    dongCombobox.close();
    apartmentCombobox.close();
    setDebouncedKeyword("");
    setSearchParams(code ? { sggCd: code } : {});
  };
  const handleGuKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    guCombobox.handleKeyDown(event, filteredSggs, (sgg) => chooseGu(sgg.sggCd, sgg.sggNm));

  // 동 선택/해제: 구와 동일한 패턴.
  const chooseDong = (value: string, name = "") => {
    const code = value === EMPTY_VALUE ? "" : value;
    dispatch({ type: "SELECT_DONG", dongCd: code, dongNm: name });
    dongCombobox.close();
    apartmentCombobox.close();
    setDebouncedKeyword("");
    setSearchParams(searchForm.sggCd ? { sggCd: searchForm.sggCd, ...(code ? { dongCd: code } : {}) } : {});
  };
  const handleDongKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    dongCombobox.handleKeyDown(event, filteredDongs, (dong) => chooseDong(dong.dongCd.slice(-5), dong.dongNm));

  const handleApartmentKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    apartmentCombobox.handleKeyDown(event, autocomplete.data || [], selectApartment);

  const selectApartment = (apt: ApartmentAutocompleteItem) => {
    dispatch({ type: "SELECT_APARTMENT", apartment: apt });
    apartmentCombobox.close();
    guCombobox.close();
    dongCombobox.close();
  };

  const search = () => {
    if (!searchForm.selectedApartment) {
      apartmentCombobox.setIsOpen(true);
      void autocomplete.refetch();
      return;
    }
    setIsRecentDealsModalOpen(false);
    setIsAreaDealsModalOpen(false);
    setIsTrendChartReady(false);
    setIsPieChartReady(false);
    dispatch({ type: "SUBMIT_APARTMENT", apartment: searchForm.selectedApartment });
    updateUrl(searchForm.selectedApartment);
  };
  const reset = () => {
    setIsTrendChartReady(false);
    setIsPieChartReady(false);
    setIsRecentDealsModalOpen(false);
    setIsAreaDealsModalOpen(false);
    dispatch({ type: "RESET" });
    guCombobox.setHighlight(-1);
    dongCombobox.setHighlight(-1);
    apartmentCombobox.close();
    updateUrl(null);
  };
  const trendPeriods = useMemo(
    () => (item?.biweekly_trend ?? []) as ApartmentTrendPeriod[],
    [item],
  );
  const comboChartData = useMemo(() => [
    [
      "기간",
      "거래량",
      { role: "tooltip", type: "string", p: { html: true } },
      "평균 거래가",
      { role: "tooltip", type: "string", p: { html: true } },
    ],
    ...trendPeriods.map((row, index) => {
      const averagePrice = Number(row.avg_price ?? row.avg_trade_amount ?? 0);
      const axisLabel = `${index + 1}구간`;
      const dealCount = Number(row.deal_count ?? row.deal_cnt ?? 0);
      // 백엔드 응답은 구간별로 start_date/end_date를 따로 안 주고
      // biweekly_period("2026-06-09/2026-06-23" 형식) 하나로만 내려준다.
      const [periodStart = "", periodEnd = ""] = (row.biweekly_period ?? "").split("/");
      const dateRange = periodStart && periodEnd
        ? `${periodStart.slice(0, 10).replace(/-/g, ".")} ~ ${periodEnd.slice(0, 10).replace(/-/g, ".")}`
        : "";
      const tooltipHtml = `
        <div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:150px;pointer-events:none;">
          <div style="font-weight:800;color:#0F8AA8;font-size:13px;">${axisLabel}</div>
          ${dateRange ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">기간: ${dateRange}</div>` : ""}
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <span style="color:#64748B;font-size:11px;">거래량</span>
              <strong style="color:#2563EB;font-weight:700;">${dealCount.toLocaleString()}건</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#64748B;font-size:11px;">평균 거래가</span>
              <strong style="color:#16A34A;font-weight:700;">${formatMarketAmount(averagePrice)}</strong>
            </div>
          </div>
        </div>
      `.trim();

      return [
        axisLabel,
        dealCount,
        tooltipHtml,
        { v: averagePrice, f: formatEokAmount(averagePrice) },
        tooltipHtml,
      ];
    }),
  ], [trendPeriods]);
  const averagePriceAxisTicks = useMemo(() => {
    const maxAveragePrice = Math.max(
      0,
      ...trendPeriods.map((row) => Number(row.avg_price ?? row.avg_trade_amount ?? 0)),
    );
    if (maxAveragePrice === 0) return [{ v: 0, f: "0.0억" }];
    return Array.from({ length: 5 }, (_, index) => {
      const value = Math.round((maxAveragePrice * index) / 4);
      return { v: value, f: formatEokAmount(value) };
    });
  }, [trendPeriods]);
  // options 객체를 렌더마다 새로 만들면(리터럴) 구/동/아파트 드롭다운 하이라이트 등
  // 무관한 상태 변경으로 리렌더될 때마다 Chart가 새 options를 받아 다시 그려져
  // 애니메이션이 매끄럽지 않고 끊겨 보인다. averagePriceAxisTicks가 실제로
  // 바뀔 때만 새 객체가 되도록 메모이즈한다.
  const comboChartOptions = useMemo(() => ({
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
    tooltip: { isHtml: true, trigger: "focus" },
  }), [averagePriceAxisTicks]);
  // chartEvents도 options와 같은 이유(렌더마다 새 배열이면 무관한 리렌더에도
  // Chart가 다시 그려짐)로 고정된 참조를 유지한다. setState 함수 자체는
  // React가 항상 동일한 참조를 보장하므로 useCallback의 의존성 배열은 비워도 된다.
  const handleTrendChartReady = useCallback(() => setIsTrendChartReady(true), []);
  const handlePieChartReady = useCallback(() => setIsPieChartReady(true), []);
  const trendChartEvents = useMemo(
    () => [{ eventName: "ready" as const, callback: handleTrendChartReady }],
    [handleTrendChartReady],
  );
  const pieChartEvents = useMemo(
    () => [{ eventName: "ready" as const, callback: handlePieChartReady }],
    [handlePieChartReady],
  );
  const areaChartRows = useMemo(() => {
    const dealCounts = new Map<number, number>();
    (item?.area_deals ?? []).forEach((row) => {
      const pyeong = Number(row.pyeong);
      const count = Number(row.deal_count ?? 0);
      if (hasMeaningfulValue(row.pyeong) && Number.isFinite(pyeong) && pyeong > 0 && count > 0) dealCounts.set(pyeong, (dealCounts.get(pyeong) ?? 0) + count);
    });
    const totalCount = [...dealCounts.values()].reduce((sum, count) => sum + count, 0);
    return totalCount > 0
      ? [...dealCounts.entries()].sort(([a], [b]) => a - b).map(([pyeong, dealCount]) => ({ pyeong, dealCount, percentage: (dealCount / totalCount) * 100 }))
      : [];
  }, [item]);
  const areaRangeRows = useMemo(() => {
    const grouped = new Map<number, number>();
    areaChartRows.forEach((row) => {
      const range = Math.floor(row.pyeong / 10) * 10;
      grouped.set(range, (grouped.get(range) ?? 0) + row.dealCount);
    });
    const totalCount = [...grouped.values()].reduce((sum, count) => sum + count, 0);
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([pyeong, dealCount]) => ({
      pyeong,
      dealCount,
      percentage: totalCount > 0 ? (dealCount / totalCount) * 100 : 0,
    }));
  }, [areaChartRows]);
  const pieChartData = useMemo(() => [
    ["평형", "거래 건수", { role: "tooltip", type: "string", p: { html: true } }],
    ...areaRangeRows.map((row) => {
      const label = formatPyeongRange(row.pyeong);
      const tooltipHtml = `
        <div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:150px;pointer-events:none;">
          <div style="font-weight:800;color:#0F8AA8;font-size:13px;">${label}</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#64748B;font-size:11px;">거래량</span>
              <strong style="color:#2563EB;font-weight:700;">${row.dealCount.toLocaleString()}건</strong>
            </div>
          </div>
        </div>
      `.trim();
      return [label, { v: row.dealCount, f: `${row.dealCount}건` }, tooltipHtml];
    }),
  ], [areaRangeRows]);
  const totalAreaDealCount = useMemo(
    () => areaRangeRows.reduce((sum, row) => sum + row.dealCount, 0),
    [areaRangeRows],
  );
  const countChangeRate = item?.count_change_rate;
  const countChangeRateDisplay = countChangeRate == null
    ? "-"
    : countChangeRate > 0
      ? <span className="text-[#DC2626]">▲ {countChangeRate}%</span>
      : countChangeRate < 0
        ? <span className="text-[#2563EB]">▼ {Math.abs(countChangeRate)}%</span>
        : <span className="text-[#64748B]">0%</span>;
  // 카드 라벨은 한 번만 정의하고, item 유무에 따라 값만 채운다(둘 다 실제 값이
  // 필요 없는 로딩/빈 상태에는 "-"로 대체).
  const CARD_LABELS = ["총 거래 건수", "평균 거래가", "최고 거래가", "거래량 증감률"] as const;
  const cardValues: Array<string | React.ReactNode> = item
    ? [
        `${item.total_deal_count.toLocaleString()}건`,
        formatMarketAmount(item.average_deal_price),
        formatMarketAmount(item.max_deal_price),
        countChangeRateDisplay,
      ]
    : ["-", "-", "-", "-"];
  const cards = CARD_LABELS.map((label, index) => [label, cardValues[index]] as const);
  const searchPeriodLabel = trend.data?.search_period
    ? `(${trend.data.search_period.start_date.slice(0, 7).replace("-", ".")} ~ ${trend.data.search_period.end_date.slice(0, 7).replace("-", ".")})`
    : "";
  const todayFormatted = trend.data?.search_period?.end_date
    ? trend.data.search_period.end_date.replace(/-/g, ".")
    : new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  // 최근 거래/전용면적별 거래 현황 테이블 행 변환에 쓰는 원소 타입을 item(조회 결과)의
  // 실제 배열 타입에서 그대로 추출한다. 별도 인터페이스를 새로 선언하지 않아
  // API 응답 타입과 어긋날 일이 없다.
  type RecentDealRow = NonNullable<typeof item>["recent_deals"][number];
  type AreaDealRow = NonNullable<typeof item>["area_deals"][number];
  const toRecentDealRow = useCallback((r: RecentDealRow): Array<string | number> => [
    r.deal_date,
    formatExclusiveArea(r.exclusive_area, r.pyeong),
    `${r.floor}층`,
    formatMarketAmount(r.deal_amount),
  ], []);
  const toAreaDealRow = useCallback((r: AreaDealRow): Array<string | number> => [
    formatExclusiveArea(r.exclusive_area, r.pyeong),
    r.deal_count,
    formatMarketAmount(r.avg_deal_price),
  ], []);
  // item(거래동향 조회 결과)이 바뀔 때만 재계산되도록 메모이즈해, 콤보박스 호버 등으로
  // 상위 컴포넌트가 리렌더돼도 이 배열 참조가 유지되어 Rows가 다시 그려지지 않는다.
  const recentDealsRows = useMemo(
    () => (item?.recent_deals ?? []).map(toRecentDealRow),
    [item, toRecentDealRow],
  );
  const recentDealsSummaryRows = useMemo(
    () => recentDealsRows.slice(0, 5),
    [recentDealsRows],
  );
  // "전체 실거래 내역" 팝업의 면적 필터 선택지. 실제 거래에 등장한 평형만 나열한다.
  const recentDealsPyeongOptions = useMemo(() => {
    const pyeongSet = new Set<number>();
    (item?.recent_deals ?? []).forEach((r) => {
      if (Number.isFinite(r.pyeong)) pyeongSet.add(r.pyeong);
    });
    return [...pyeongSet].sort((a, b) => a - b);
  }, [item]);
  // 층수 필터(저층/중층/고층) 계산에 쓰이는 최고층. getFloorBucket 참고.
  const recentDealsMaxFloor = useMemo(
    () => Math.max(0, ...(item?.recent_deals ?? []).map((r) => r.floor ?? 0)),
    [item],
  );
  const filteredRecentDealsRows = useMemo(
    () =>
      (item?.recent_deals ?? [])
        .filter((r) => {
          const matchesArea =
            recentDealsAreaFilter === "all" || r.pyeong === Number(recentDealsAreaFilter);
          const matchesFloor =
            recentDealsFloorFilter === "all" ||
            getFloorBucket(r.floor, recentDealsMaxFloor) === recentDealsFloorFilter;
          return matchesArea && matchesFloor;
        })
        .map(toRecentDealRow),
    [item, recentDealsAreaFilter, recentDealsFloorFilter, recentDealsMaxFloor, toRecentDealRow],
  );
  const areaDealsRows = useMemo(
    () => (item?.area_deals ?? []).map(toAreaDealRow),
    [item, toAreaDealRow],
  );
  const areaDealsSummaryRows = useMemo(
    () => areaDealsRows.slice(0, 5),
    [areaDealsRows],
  );

  return <div className="tw-scope [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]"><SectionSidebarLayout sectionTitle={TRENDS_NAVIGATION.sectionTitle} menuItems={TRENDS_NAVIGATION.menuItems}>
    <div className="space-y-1"><h1 className="text-[24px] font-extrabold text-[#0F172A]">아파트별 거래동향</h1><p className="text-[13px] text-[#64748B]">관심 아파트의 실거래 추이와 가격 변화를 확인하세요.</p></div>
    <Card className="rounded-xl border-[#E2E8F0] shadow-none"><CardContent className="p-4 sm:p-5"><div className="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] lg:items-start">
      <div ref={guCombobox.setContainerRef} className="w-full"><Input value={searchForm.guInput || selectedGuName} onFocus={guCombobox.open} onClick={(e) => { guCombobox.open(); e.currentTarget.select(); }} onChange={(event) => { dispatch({ type: "SET_GU_INPUT", value: event.target.value, selectedGuName }); guCombobox.open(); }} onKeyDown={handleGuKeyDown} placeholder="구 선택" className="h-11 rounded-lg border-[#DCE8ED] bg-white focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20" />{guCombobox.isOpen && <div className="mt-2 max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm"><Button type="button" variant="ghost" onClick={() => chooseGu("")} className={getDropdownItemClassName(!searchForm.sggCd)}>선택 안 함</Button>{sggs.length === 0 ? <EmptyState message="구 목록을 불러오는 중입니다." /> : filteredSggs.length ? filteredSggs.map((item, index) => <Button key={item.sggCd} ref={guCombobox.setItemRef(index)} type="button" variant="ghost" onMouseEnter={() => guCombobox.setHighlight(index)} onClick={() => chooseGu(item.sggCd, item.sggNm)} className={getDropdownItemClassName(index === guCombobox.highlight || item.sggCd === searchForm.sggCd)}>{item.sggNm}</Button>) : <EmptyState message="검색 조건에 맞는 구가 없습니다." />}</div>}</div>
      <div ref={dongCombobox.setContainerRef} className="w-full"><Input disabled={!searchForm.sggCd} value={searchForm.dongInput || selectedDongName} onFocus={() => { if (searchForm.sggCd) dongCombobox.open(); }} onClick={(e) => { if (searchForm.sggCd) { dongCombobox.open(); e.currentTarget.select(); } }} onChange={(event) => { dispatch({ type: "SET_DONG_INPUT", value: event.target.value, selectedDongName }); dongCombobox.open(); }} onKeyDown={handleDongKeyDown} placeholder={searchForm.sggCd ? "동 선택" : "구를 먼저 선택해 주세요"} className="h-11 rounded-lg border-[#DCE8ED] bg-white focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20" />{dongCombobox.isOpen && searchForm.sggCd && <div className="mt-2 max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm"><Button type="button" variant="ghost" onClick={() => chooseDong("")} className={getDropdownItemClassName(!searchForm.dongCd)}>선택 안 함</Button>{filteredDongs.length ? filteredDongs.map((item, index) => <Button key={item.dongCd} ref={dongCombobox.setItemRef(index)} type="button" variant="ghost" onMouseEnter={() => dongCombobox.setHighlight(index)} onClick={() => chooseDong(item.dongCd.slice(-5), item.dongNm)} className={getDropdownItemClassName(index === dongCombobox.highlight || item.dongCd.slice(-5) === searchForm.dongCd)}>{item.dongNm}</Button>) : <EmptyState message="검색 조건에 맞는 동이 없습니다." />}</div>}</div>
      <div ref={apartmentCombobox.setContainerRef} className="w-full"><Input value={searchForm.keyword} onFocus={apartmentCombobox.open} onClick={(e) => { apartmentCombobox.open(); e.currentTarget.select(); }} onChange={(e) => { dispatch({ type: "SET_KEYWORD", value: e.target.value }); apartmentCombobox.open(); }} onKeyDown={handleApartmentKeyDown} placeholder="아파트명을 입력해 주세요" className="h-11 rounded-lg border-[#DCE8ED] bg-white focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20" />
        {apartmentCombobox.isOpen && <div className="mt-2 max-h-[260px] w-full overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm">{autocomplete.isLoading ? <EmptyState message="아파트를 검색하고 있습니다." /> : autocomplete.isError ? <EmptyState message="아파트 목록을 불러오지 못했습니다. 다시 시도해 주세요." /> : autocomplete.data?.length ? autocomplete.data.map((apt, index) => <Button key={apartmentKey(apt)} ref={apartmentCombobox.setItemRef(index)} type="button" variant="ghost" onMouseEnter={() => apartmentCombobox.setHighlight(index)} onClick={() => selectApartment(apt)} className={getDropdownItemClassName(index === apartmentCombobox.highlight || (searchForm.selectedApartment != null && apartmentKey(searchForm.selectedApartment) === apartmentKey(apt)), false)}><span>{apt.aptName}</span><span className="text-xs text-[#64748B]">{apt.sggNm} · {apt.dongNm}</span></Button>) : <EmptyState message="검색 조건에 맞는 아파트가 없습니다." />}</div>}</div>
      <Button type="button" onClick={search} className="h-11 bg-[#0F8AA8] px-6"><Search className="size-4" />조회하기</Button><Button type="button" variant="outline" onClick={reset} className="h-11"><RotateCcw className="size-4" />초기화</Button>
    </div>{searchForm.selectedApartment && <div className="mt-4 text-[13px] font-semibold text-[#334155]"><Building2 className="mr-1 inline size-4" />{searchForm.selectedApartment.aptName} · {searchForm.selectedApartment.sggNm || selectedGuName} {searchForm.selectedApartment.dongNm || selectedDongName}</div>}</CardContent></Card>
    {trend.isError && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-600"><AlertCircle className="size-4" />데이터를 불러오는 중 오류가 발생했습니다.</div>}
    {!item && <><Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border-b p-4 lg:border-b-0"><span className="text-[12px] text-[#6B7280]">{label}</span><div className="mt-2 text-[21px] font-extrabold">{value}</div></div>)}</Card><div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardContent className="p-5"><h2 className="mb-4 border-b border-[#E2E8F0] pb-3 font-semibold">거래량 및 평균 거래가 추이</h2><EmptyState message="아파트를 선택하면 거래 추이를 확인할 수 있습니다." /></CardContent></Card><Card><CardContent className="p-5"><h2 className="mb-4 border-b border-[#E2E8F0] pb-3 font-semibold">평형별 거래 비중</h2><EmptyState message="아파트를 선택하면 평형별 거래 비중을 확인할 수 있습니다." /></CardContent></Card></div><div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2"><Card className="h-full"><CardContent className="p-5"><h2 className="mb-3 border-b border-[#E2E8F0] pb-3 font-semibold">최근 거래 내역</h2><EmptyState message="아파트를 선택하면 최근 거래 내역을 확인할 수 있습니다." /></CardContent></Card><Card className="h-full"><CardContent className="p-5"><h2 className="mb-3 border-b border-[#E2E8F0] pb-3 font-semibold">전용면적(평수)별 거래 현황</h2><EmptyState message="아파트를 선택하면 전용면적별 거래 현황을 확인할 수 있습니다." /></CardContent></Card></div></>}
    {item && <><Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border-b p-4 lg:border-b-0"><span className="text-[12px] text-[#6B7280]">{label}</span><div className="mt-2 text-[21px] font-extrabold">{value}</div>{searchPeriodLabel && <p className="mt-2 text-[11px] text-[#94A3B8]">{searchPeriodLabel}</p>}</div>)}</Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3"><h2 className="text-[15px] font-semibold">거래량 및 평균 거래가 추이</h2><div className="flex gap-3 text-[12px] text-[#64748B]"><span>■ 거래량(건)</span><span className="text-[#16A34A]">● 평균 거래가(만원)</span></div></div>{comboChartData.length > 1 ? <><style>{`@keyframes trendsChartReveal { from { clip-path: inset(0 100% 0 0); opacity: 0; } to { clip-path: inset(0 0 0 0); opacity: 1; } } .trends-chart-reveal { clip-path: inset(0 100% 0 0); opacity: 0; } .trends-chart-reveal.is-ready { animation: trendsChartReveal 800ms ease-out forwards; } @media (prefers-reduced-motion: reduce) { .trends-chart-reveal, .trends-chart-reveal.is-ready { clip-path: none; opacity: 1; animation: none; } }`}</style><div className={`relative min-w-0 w-full max-w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full [&_.google-visualization-tooltip]:!pointer-events-none [&_.google-visualization-tooltip]:!select-none [&_.google-visualization-tooltip]:!z-50 [&_.google-visualization-tooltip]:!border-0 [&_.google-visualization-tooltip]:!bg-transparent [&_.google-visualization-tooltip]:!shadow-none [&_.google-visualization-tooltip]:!p-0 trends-chart-reveal ${isTrendChartReady ? "is-ready" : ""}`}><Chart chartType="ComboChart" width="100%" height="240px" data={comboChartData} chartEvents={trendChartEvents} options={comboChartOptions} /></div></> : <EmptyState message="거래 추이 데이터가 없습니다." />}</CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="mb-4 border-b border-[#E2E8F0] pb-3 text-[15px] font-semibold">평형별 거래 비중</h2>{pieChartData.length > 1 ? <><style>{`@keyframes donutFanReveal { 0% { opacity: 0; transform: scale(0.88); clip-path: polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%); } 25% { opacity: 1; clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%, 100% 50%, 100% 50%, 100% 50%); } 50% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 100%, 50% 100%); } 75% { clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 50%, 0% 50%); } 100% { opacity: 1; transform: scale(1); clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%); } } .pie-chart-reveal { opacity: 0; } .pie-chart-reveal.is-ready { animation: donutFanReveal 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards; } .pie-chart-reveal svg path { stroke: transparent !important; } @keyframes legendItemSlideIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } } .legend-item-reveal { opacity: 0; animation: legendItemSlideIn 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards; } @media (prefers-reduced-motion: reduce) { .pie-chart-reveal, .pie-chart-reveal.is-ready { clip-path: none; opacity: 1; transform: none; animation: none; } .legend-item-reveal { opacity: 1; animation: none; } }`}</style><div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center"><div className={`h-[278px] w-full sm:w-[58%] relative min-w-0 [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full [&_.google-visualization-tooltip]:!pointer-events-none [&_.google-visualization-tooltip]:!select-none [&_.google-visualization-tooltip]:!z-50 [&_.google-visualization-tooltip]:!border-0 [&_.google-visualization-tooltip]:!bg-transparent [&_.google-visualization-tooltip]:!shadow-none [&_.google-visualization-tooltip]:!p-0 [&_.google-visualization-tooltip]:!top-[204px] [&_.google-visualization-tooltip]:!left-1/2 [&_.google-visualization-tooltip]:!-translate-x-1/2 [&_.google-visualization-tooltip]:!translate-y-0 pie-chart-reveal ${isPieChartReady ? "is-ready" : ""}`}><Chart chartType="PieChart" width="100%" height="278px" data={pieChartData} chartEvents={pieChartEvents} options={PIE_CHART_OPTIONS} /></div><div className="w-full space-y-2 self-center text-[13px] sm:w-[42%]"><p className="border-b border-[#E2E8F0] pb-2 font-semibold text-[#0F172A]">총 거래 건수 {totalAreaDealCount.toLocaleString()}건</p>{areaRangeRows.map((row, index) => <div key={row.pyeong} className={`flex items-center justify-between gap-3 ${isPieChartReady ? "legend-item-reveal" : "opacity-0"}`} style={{ animationDelay: `${index * 80 + 350}ms` }}><span className="flex items-center gap-2 text-[#334155]"><i className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />{formatPyeongRange(row.pyeong)}</span><strong className="text-[#0F172A]">{row.percentage.toFixed(1)}%</strong></div>)}</div></div></> : <EmptyState message="평형별 거래 비중 데이터가 없습니다." />}</CardContent></Card></div>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2"><Card className="h-full"><CardContent className="p-5"><h2 className="mb-3 border-b border-[#E2E8F0] pb-3 text-[14px] font-semibold">최근 거래 내역</h2><Rows rows={recentDealsSummaryRows} headers={["계약일", "전용면적(평수)", "층", "거래가"]} />{item.recent_deals.length > 5 && <Button type="button" variant="outline" onClick={() => setIsRecentDealsModalOpen(true)} className="mt-4 h-10 w-full rounded-none border-x-0 border-b border-t-0 border-[#94A3B8] text-[12px] text-[#2563EB] hover:bg-[#F8FAFC] hover:text-[#1D4ED8]">전체 실거래 내역 보기 ›</Button>}</CardContent></Card><Card className="h-full"><CardContent className="p-5"><h2 className="mb-3 border-b border-[#E2E8F0] pb-3 text-[14px] font-semibold">전용면적(평수)별 거래 현황</h2><Rows rows={areaDealsSummaryRows} headers={["전용면적(평수)", "거래 건수", "평균 거래가"]} />{item.area_deals.length > 5 && <Button type="button" variant="outline" onClick={() => setIsAreaDealsModalOpen(true)} className="mt-4 h-10 w-full rounded-none border-x-0 border-b border-t-0 border-[#94A3B8] text-[12px] text-[#2563EB] hover:bg-[#F8FAFC] hover:text-[#1D4ED8]">전체 전용면적별 거래 현황 보기 ›</Button>}</CardContent></Card></div></>}
    {!searchForm.submittedApartment && <EmptyState message="구·동 조건을 선택하거나 아파트를 검색해 주세요." />}{searchForm.submittedApartment && !trend.isLoading && !item && <EmptyState message="조회된 거래동향 데이터가 없습니다." />}
    <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-4 text-[11px] text-[#94A3B8]">
      <div className="flex items-center gap-1.5">
        <Info className="size-3.5 shrink-0" />
        <span>
          본 정보는 서울시 열린데이터광장 부동산 실거래가 공개시스템 데이터를 기반으로 제공되며, 실제 거래가와 차이가 있을 수 있습니다.
        </span>
      </div>
      <span className="shrink-0">데이터 기준일: {todayFormatted}</span>
    </div>

    {/* 전체 실거래 내역 모달 */}
    {isRecentDealsModalOpen && item && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-24 pb-6"
        onClick={() => setIsRecentDealsModalOpen(false)}
      >
        <div
          className="flex max-h-[75vh] w-full max-w-[700px] flex-col rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3 border-b border-[#E2E8F0] p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-[15px] font-bold text-[#0F172A]">
                  {item.apt_name} 전체 실거래 내역
                </h3>
                <span className="shrink-0 rounded bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
                  총 {filteredRecentDealsRows.length}건
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRecentDealsModalOpen(false)}
                aria-label="닫기"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={recentDealsAreaFilter}
                onChange={(e) => setRecentDealsAreaFilter(e.target.value)}
                className="h-9 rounded-md border border-[#DCE8ED] bg-white px-2.5 text-[12px] text-[#334155] focus:outline-none focus:border-[#0F8AA8]"
              >
                <option value="all">면적 전체</option>
                {recentDealsPyeongOptions.map((pyeong) => (
                  <option key={pyeong} value={pyeong}>
                    {pyeong}평
                  </option>
                ))}
              </select>
              <select
                value={recentDealsFloorFilter}
                onChange={(e) => setRecentDealsFloorFilter(e.target.value)}
                className="h-9 rounded-md border border-[#DCE8ED] bg-white px-2.5 text-[12px] text-[#334155] focus:outline-none focus:border-[#0F8AA8]"
              >
                <option value="all">층수 전체</option>
                <option value="저층">저층</option>
                <option value="중층">중층</option>
                <option value="고층">고층</option>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRecentDealsAreaFilter("all");
                  setRecentDealsFloorFilter("all");
                }}
                className="h-9 px-3 text-[12px] cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                초기화
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto p-4">
            <Rows
              rows={filteredRecentDealsRows}
              headers={["계약일", "전용면적(평수)", "층", "거래가"]}
            />
          </div>
          <div className="flex justify-end border-t border-[#E2E8F0] p-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRecentDealsModalOpen(false)}
              className="h-9 px-4 text-[13px] cursor-pointer"
            >
              닫기
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* 전체 전용면적별 거래 현황 모달 */}
    {isAreaDealsModalOpen && item && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => setIsAreaDealsModalOpen(false)}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-[650px] flex-col rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[#0F172A]">
                {item.apt_name} 전용면적(평수)별 전체 거래 현황
              </h3>
              <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
                총 {item.area_deals.length}개 평형
              </span>
            </div>
          </div>
          <div className="overflow-y-auto p-4 max-h-[calc(85vh-120px)]">
            <Rows
              rows={areaDealsRows}
              headers={["전용면적(평수)", "거래 건수", "평균 거래가"]}
            />
          </div>
          <div className="flex justify-end border-t border-[#E2E8F0] p-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAreaDealsModalOpen(false)}
              className="h-9 px-4 text-[13px] cursor-pointer"
            >
              닫기
            </Button>
          </div>
        </div>
      </div>
    )}
  </SectionSidebarLayout></div>;
}

const Rows = memo(function Rows({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-[12px]"><thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px]"><tr>{headers.map((header, index) => <th key={header} className={`px-3 py-2.5 text-[#475569] ${index === 0 ? "text-left" : "text-right"}`}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-[#F1F5F9] last:border-b-0">{row.map((value, cell) => <td key={cell} className={`px-3 py-3 text-[#334155] ${cell === 0 ? "text-left font-medium" : "text-right"}`}>{value}</td>)}</tr>) : <tr><td className="p-8 text-center text-[#64748B]" colSpan={headers.length}>등록된 데이터가 없습니다.</td></tr>}</tbody></table></div>;
});
