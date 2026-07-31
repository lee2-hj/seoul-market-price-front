import { useState } from "react";
import { Link } from "react-router-dom";

import styles from "./FindPasswordPage.module.css";

function FindPasswordPage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // 인증번호 요청

  const handleSendCode = () => {
    if (!phone) {
      alert("휴대폰 번호를 입력해주세요.");
      return;
    }
    alert("인증번호가 발송되었습니다.");
  };

  // 본인 인증

  const handleVerify = () => {
    if (!code) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    // 임시 비밀번호 생성

    const randomPassword = Math.random().toString(36).substring(2, 10);
    setTempPassword(randomPassword);
    setStep(2);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {step === 1 && (
          <>
            <h1>비밀번호 찾기</h1>

            <p>
              본인 인증 후<br />
              임시 비밀번호를 발급받습니다.
            </p>

            <div className={styles.inputGroup}>
              <input
                placeholder="휴대폰 번호"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button onClick={handleSendCode}>인증받기</button>
            </div>

            <input
              placeholder="인증번호"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <button className={styles.mainButton} onClick={handleVerify}>
              본인 인증
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1>임시 비밀번호 발급</h1>

            <p>
              아래 임시 비밀번호로
              <br />
              로그인해주세요.
            </p>

            <div className={styles.tempPassword}>{tempPassword}</div>

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
