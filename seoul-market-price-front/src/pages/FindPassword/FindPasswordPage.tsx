import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import PassAuth from "@/features/auth/components/PassAuth";

import styles from "./FindPasswordPage.module.css";

function FindPasswordPage() {
  /*
    STEP

    1 : 아이디 + PASS 인증
    2 : 임시 비밀번호 표시

  */

  const [step, setStep] = useState(1);

  /*
    사용자 정보

  */

  const [userId, setUserId] = useState("");

  const [phone, setPhone] = useState("");

  /*
    PASS 인증 상태

  */

  const [passVerified, setPassVerified] = useState(false);

  /*
    요청 처리 상태

    중복 클릭 방지

  */

  const [loading, setLoading] = useState(false);

  /*
    임시 비밀번호

  */

  const [tempPassword, setTempPassword] = useState("");

  /*
    PASS 인증 성공 callback

  */

  const handlePassSuccess = () => {
    setPassVerified(true);
  };

  /*
    비밀번호 찾기 요청


    PASS 인증 완료 후 실행

  */

  const handleFindPassword = async () => {
    if (!userId) {
      alert("아이디를 입력해주세요.");

      return;
    }

    if (!passVerified) {
      alert("PASS 인증을 완료해주세요.");

      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/find-password`,

        {
          userId,

          phone,
        },
      );

      if (response.data.success) {
        setTempPassword(response.data.tempPassword);

        setStep(2);
      } else {
        alert("아이디와 휴대폰 정보가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error("비밀번호 찾기 오류", error);

      alert("비밀번호 찾기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* =====================
            STEP 1
            PASS 인증
        ====================== */}

        {step === 1 && (
          <>
            <h1>비밀번호 찾기</h1>

            <p>
              아이디와 휴대폰 인증 후
              <br />
              임시 비밀번호를 발급합니다.
            </p>

            {/* 아이디 */}

            <input
              type="text"
              placeholder="아이디"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />

            {/* 휴대폰 PASS 인증 */}

            <div className={styles.inputGroup}>
              <input
                type="tel"
                placeholder="휴대폰 번호"
                value={phone}
                disabled={passVerified}
                onChange={(e) => setPhone(e.target.value)}
              />

              <PassAuth phone={phone} onSuccess={handlePassSuccess} />
            </div>

            {passVerified && <p className={styles.success}>✔ PASS 인증 완료</p>}

            <button
              type="button"
              onClick={handleFindPassword}
              className={styles.findButton}
              disabled={loading}
            >
              {loading ? "확인중..." : "비밀번호 찾기"}
            </button>
          </>
        )}

        {/* =====================
            STEP 2
            임시 비밀번호
        ====================== */}

        {step === 2 && (
          <>
            <h1>임시 비밀번호 발급</h1>

            <p>
              아래 임시 비밀번호로
              <br />
              로그인해주세요.
            </p>

            <div className={styles.tempPassword}>{tempPassword}</div>

            <p>
              로그인 후
              <br />
              비밀번호 변경을 권장합니다.
            </p>

            <Link to="/" className={styles.loginLink}>
              로그인 페이지 이동
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default FindPasswordPage;
