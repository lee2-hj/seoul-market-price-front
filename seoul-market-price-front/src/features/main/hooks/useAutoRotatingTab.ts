import { useCallback, useEffect, useState } from "react";

const AUTO_ROTATE_INTERVAL_MS = 5000;

/**
 * 두 개의 상태(예: "dong" | "apartment")를 5초 간격으로 자동 순환시키는 훅.
 * PriceChangeTop5Card(usePriceChangeDisplay)와 동일한 동작:
 * - 카드에 마우스를 올리고 있는 동안만 일시정지, 마우스를 떼면 다시 순환 재개
 * - 버튼으로 직접 선택해도 그 순간의 화면만 바뀔 뿐, 자동 순환은 계속 이어진다
 *   (수동 선택 이후 자동 전환이 영구히 멈추지 않음)
 * - prefers-reduced-motion 설정 시 자동 전환 비활성화
 */
export function useAutoRotatingTab<T extends string>(modes: readonly [T, T]) {
  const [mode, setMode] = useState<T>(modes[0]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) return;
    }

    const intervalId = window.setInterval(() => {
      setMode((prev) => (prev === modes[0] ? modes[1] : modes[0]));
    }, AUTO_ROTATE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isHovered, modes]);

  const selectMode = useCallback((next: T) => {
    setMode(next);
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return { mode, selectMode, handleMouseEnter, handleMouseLeave };
}
