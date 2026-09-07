import { useCallback, useEffect, useState } from "react";

export type PriceChangeDisplayMode = "rising" | "falling";

const AUTO_ROTATE_INTERVAL_MS = 5000;

/**
 * "서울시 가격 상승·하락 TOP 5" 카드의 표시 상태(상승/하락)를 관리한다.
 * - 5초 간격 자동 전환 + 사용자가 카드에 마우스를 올리고 있는 동안은 일시정지
 * - prefers-reduced-motion 설정 시 자동 전환 비활성화
 * - 배지/인디케이터 클릭으로 원하는 모드를 직접 선택(수동 선택 시에도 hover 중이면 자동 전환은 계속 정지 상태 유지)
 */
export function usePriceChangeDisplay() {
  const [displayMode, setDisplayMode] = useState<PriceChangeDisplayMode>("rising");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) return;
    }

    const intervalId = window.setInterval(() => {
      setDisplayMode((prev) => (prev === "rising" ? "falling" : "rising"));
    }, AUTO_ROTATE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isHovered]);

  const selectDisplayMode = useCallback((mode: PriceChangeDisplayMode) => {
    setDisplayMode(mode);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => (prev === "rising" ? "falling" : "rising"));
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return {
    displayMode,
    selectDisplayMode,
    toggleDisplayMode,
    handleMouseEnter,
    handleMouseLeave,
  };
}
