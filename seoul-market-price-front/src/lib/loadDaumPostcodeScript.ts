const DAUM_POSTCODE_SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let loadPromise: Promise<void> | null = null;

/* ===============================
   카카오(다음) 우편번호 서비스 스크립트를 1회만 로드한다.
   이미 로드되어 있거나 로딩 중이면 기존 Promise를 재사용한다.
=============================== */

export function loadDaumPostcodeScript(): Promise<void> {
  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${DAUM_POSTCODE_SCRIPT_SRC}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("주소 검색 스크립트를 불러오지 못했습니다."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = DAUM_POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("주소 검색 스크립트를 불러오지 못했습니다."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
