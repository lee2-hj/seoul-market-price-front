import { useState } from "react";
import axios from "axios";

import PassAuth from "@/features/auth/components/PassAuth";

import styles from "./FindIdPage.module.css";

function FindIdPage() {
  /*
    STEP

    1 : 휴대폰 PASS 인증
    2 : 아이디 표시

  */

  const [step, setStep] = useState(1);

  /*
    휴대폰 번호

  */

  const [phone, setPhone] = useState("");

  /*
    PASS 인증 여부

  */

  const [passVerified, setPassVerified] = useState(false);

  /*
    찾은 아이디

  */

  const [userId, setUserId] = useState("");

  /*
    PASS 인증 성공

  */

  const handlePassSuccess = () => {
    setPassVerified(true);
  };

  /*
    아이디 조회

  */

  const handleFindId = async () => {
    if (!passVerified) {
      alert("PASS 인증을 완료해주세요.");

      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/find-id`,

        {
          phone,
        },
      );

      if (response.data.success) {
        setUserId(response.data.userId);

        setStep(2);
      } else {
        alert("등록된 회원 정보를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("아이디 찾기 오류", error);

      alert("아이디 찾기에 실패했습니다.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>

            <p>
              회원가입 시 등록한 휴대폰 번호로
              <br />
              아이디를 확인합니다.
            </p>

            <div className={styles.inputGroup}>
              <input
                type="tel"
                placeholder="휴대폰 번호 입력"
                value={phone}
                disabled={passVerified}
                onChange={(e) => setPhone(e.target.value)}
              />

              <PassAuth phone={phone} onSuccess={handlePassSuccess} />
            </div>

            {passVerified && <p className={styles.success}>✔ PASS 인증 완료</p>}

            <button type="button" onClick={handleFindId}>
              아이디 조회
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1>아이디 확인</h1>

            <p>가입된 아이디는</p>

            <div className={styles.userId}>{userId}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default FindIdPage;
