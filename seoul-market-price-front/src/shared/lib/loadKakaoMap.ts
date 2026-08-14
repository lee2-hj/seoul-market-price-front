const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";

let kakaoMapPromise: Promise<void> | null = null;

export function loadKakaoMap() {
  const loadedMaps = window.kakao?.maps;
  if (loadedMaps) {
    return new Promise<void>((resolve) => loadedMaps.load(resolve));
  }

  if (kakaoMapPromise) return kakaoMapPromise;

  kakaoMapPromise = new Promise<void>((resolve, reject) => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY;

    if (!appKey) {
      reject(new Error("VITE_KAKAO_MAP_JAVASCRIPT_KEY가 설정되지 않았습니다."));
      return;
    }

    const finishLoading = () => {
      if (!window.kakao?.maps) {
        reject(new Error("카카오 지도 SDK를 초기화하지 못했습니다."));
        return;
      }
      window.kakao.maps.load(resolve);
    };

    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", finishLoading, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("카카오 지도 SDK를 불러오지 못했습니다.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onload = finishLoading;
    script.onerror = () => reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    kakaoMapPromise = null;
    throw error;
  });

  return kakaoMapPromise;
}
