import { Link } from "react-router-dom";
import { useState } from "react";

import { findIdApi } from "@/api/api";
import PassAuth from "@/features/auth/components/PassAuth";

import styles from "./FindIdPage.module.css";

/* =================================
   PASS 인증 결과 타입
================================= */

interface PassAuthResult {
  name: string;
  phoneNumber: string;
}

/* =================================
   아이디 찾기 페이지
================================= */

function FindIdPage() {
  /* =================================
     STEP
     1 : 이름 + 휴대폰 입력 / PASS 인증
     2 : 아이디 표시
  ================================= */

  const [step, setStep] = useState<1 | 2>(1);

  /* =================================
     사용자 입력
  ================================= */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  /* =================================
     PASS 인증 결과
  ================================= */

  const [verifiedName, setVerifiedName] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [passVerified, setPassVerified] = useState(false);

  /* =================================
     조회된 아이디
  ================================= */

  const [userId, setUserId] = useState("");

  /* =================================
     아이디 조회 로딩
  ================================= */

  const [isLoading, setIsLoading] = useState(false);

  /* =================================
     아이디 마스킹

     예:
     abcdef   -> abc***
     abc12345 -> abc12***
     ab       -> a*
     a        -> *
  ================================= */

  const maskUserId = (id: string) => {
    if (!id) {
      return "";
    }

    if (id.length === 1) {
      return "*";
    }

    if (id.length === 2) {
      return `${id.charAt(0)}*`;
    }

    const visibleLength = Math.max(3, Math.floor(id.length / 2));

    return id.slice(0, visibleLength) + "*".repeat(id.length - visibleLength);
  };

  /* =================================
     PASS 인증 성공

     PASS 인증 결과로 전달받은
     실제 이름과 휴대폰 번호를 저장한다.
  ================================= */

  const handlePassSuccess = (result: PassAuthResult) => {
    setVerifiedName(result.name);
    setVerifiedPhone(result.phoneNumber);
    setPassVerified(true);
  };

  /* =================================
     아이디 조회

     이름 + 휴대폰 번호를 백엔드로 전달한다.

     백엔드에서:
     1. 이름 일치 여부 확인
     2. 휴대폰 번호 일치 여부 확인
     3. 일반 회원인지 확인
     4. 일치하는 회원의 userId 반환
  ================================= */

  const handleFindId = async () => {
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!phone.trim()) {
      alert("휴대폰 번호를 입력해주세요.");
      return;
    }

    if (!passVerified) {
      alert("PASS 인증을 완료해주세요.");
      return;
    }

    if (!verifiedName || !verifiedPhone) {
      alert("PASS 인증 정보를 확인할 수 없습니다.");
      return;
    }

    /* =================================
       입력한 이름과 PASS 인증 이름 비교
    ================================= */

    if (name.trim() !== verifiedName.trim()) {
      alert("PASS 인증된 이름과 입력한 이름이 일치하지 않습니다.");
      return;
    }

    /* =================================
       입력한 휴대폰 번호와
       PASS 인증 휴대폰 번호 비교
    ================================= */

    if (phone.trim() !== verifiedPhone.trim()) {
      alert("PASS 인증된 휴대폰 번호와 입력한 번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsLoading(true);

      /* =================================
         백엔드 요청

         POST /api/members/find-id

         요청:
         {
           name: "조윤미",
           phone: "010-1234-5678"
         }

         응답:
         {
           userId: "joy123456"
         }
      ================================= */

      const response = await findIdApi(verifiedName, verifiedPhone);

      if (!response.userId) {
        alert("등록된 회원 정보를 찾을 수 없습니다.");
        return;
      }

      setUserId(response.userId);
      setStep(2);
    } catch (error) {
      console.error("아이디 찾기 오류:", error);

      alert(
        "입력하신 이름과 휴대폰 번호에 일치하는 회원 정보를 찾을 수 없습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =================================
     다시 아이디 찾기
  ================================= */

  const handleReset = () => {
    setStep(1);

    setName("");
    setPhone("");

    setVerifiedName("");
    setVerifiedPhone("");

    setPassVerified(false);

    setUserId("");

    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {/* =================================
           로고
        ================================= */}

        <Link to="/" className={styles.logoLink}>
          <img src="/ssanong.svg" alt="싸농 로고" className={styles.logo} />
        </Link>

        {/* =================================
           STEP 1
        ================================= */}

        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>

            <p className={styles.description}>
              가입 시 등록한 이름과 휴대폰 번호로
              <br />
              아이디를 확인할 수 있습니다.
            </p>

            {/* =================================
               이름
            ================================= */}

            <div className={styles.fieldGroup}>
              <label htmlFor="name">이름</label>

              <input
                id="name"
                type="text"
                placeholder="이름을 입력해주세요."
                value={name}
                disabled={passVerified}
                onChange={(e) => {
                  setName(e.target.value);
                  setPassVerified(false);
                  setVerifiedName("");
                  setVerifiedPhone("");
                }}
              />
            </div>

            {/* =================================
               휴대폰 번호
            ================================= */}

            <div className={styles.fieldGroup}>
              <label htmlFor="phone">휴대폰 번호</label>

              <div className={styles.inputGroup}>
                <input
                  id="phone"
                  type="tel"
                  placeholder="휴대폰 번호를 입력해주세요."
                  value={phone}
                  disabled={passVerified}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPassVerified(false);
                    setVerifiedName("");
                    setVerifiedPhone("");
                  }}
                />

                {!passVerified && (
                  <PassAuth phone={phone} onSuccess={handlePassSuccess} />
                )}
              </div>
            </div>

            {/* =================================
               PASS 인증 완료
            ================================= */}

            {passVerified && (
              <p className={styles.success}>✔ PASS 휴대폰 인증 완료</p>
            )}

            {/* =================================
               아이디 조회
            ================================= */}

            <button
              type="button"
              className={styles.mainButton}
              onClick={handleFindId}
              disabled={!passVerified || isLoading}
            >
              {isLoading ? "조회 중..." : "아이디 조회"}
            </button>
          </>
        )}

        {/* =================================
           STEP 2
        ================================= */}

        {step === 2 && (
          <>
            <h1>아이디 확인</h1>

            <p className={styles.description}>
              입력하신 정보와 일치하는
              <br />
              가입된 아이디입니다.
            </p>

            {/* =================================
               조회 결과
            ================================= */}

            <div className={styles.result}>
              <span className={styles.resultLabel}>가입된 아이디</span>

              <div className={styles.userId}>{maskUserId(userId)}</div>
            </div>

            {/* =================================
               로그인 / 비밀번호 찾기
            ================================= */}

            <div className={styles.actionGroup}>
              <Link to="/login" className={styles.loginButton}>
                로그인하기
              </Link>

              <Link to="/find-password" className={styles.passwordButton}>
                비밀번호 찾기
              </Link>
            </div>

            {/* =================================
               다시 찾기
            ================================= */}

            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
            >
              다시 찾기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default FindIdPage;
