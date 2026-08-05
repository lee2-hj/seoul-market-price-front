import { useEffect, useRef } from "react";

import { loadDaumPostcodeScript } from "@/lib/loadDaumPostcodeScript";

type AddressSearchLayerProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (data: DaumPostcodeData) => void;
};

/* ===============================
   카카오(다음) 우편번호 서비스를 브라우저 기본 팝업 창으로 띄운다.

   onComplete/onClose는 상위(SignupPage)가 리렌더될 때마다 새 함수로
   전달되므로, ref에 최신 값만 보관해두고 스크립트 로딩/팝업 오픈
   이펙트는 open 값에만 반응하도록 분리한다.
=============================== */

function AddressSearchLayer({
  open,
  onClose,
  onComplete,
}: AddressSearchLayerProps) {
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  /*
    스크립트 로딩(네트워크 다운로드+파싱)이 "주소검색" 클릭 시점에야
    시작되면 그 지연이 그대로 팝업이 늦게 뜨는 체감 속도로 이어진다.
    컴포넌트가 마운트되는 시점(=폼이 화면에 보이는 시점)에 미리
    백그라운드로 로드해둔다. loadDaumPostcodeScript()는 이미 로드된
    스크립트를 재사용하므로 아래 open 이펙트에서 다시 호출해도
    중복 요청되지 않는다. 실패해도 사용자에게 보여줄 에러는 실제
    클릭(open) 시점의 이펙트에서 처리하므로 여기서는 조용히 무시한다.
  */
  useEffect(() => {
    loadDaumPostcodeScript().catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    loadDaumPostcodeScript()
      .then(() => {
        if (cancelled || !window.daum) {
          return;
        }

        new window.daum.Postcode({
          oncomplete: (data) => onCompleteRef.current(data),
          onclose: () => onCloseRef.current(),
        }).open();
      })
      .catch(() => {
        if (!cancelled) {
          alert(
            "주소 검색 기능을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          );
          onCloseRef.current();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return null;
}

export default AddressSearchLayer;
