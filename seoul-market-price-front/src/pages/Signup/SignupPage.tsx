import styles from "./SignupPage.module.css";

import SocialLogin from "../../features/auth/components/SocialLogin";
import PassAuth from "@/features/auth/components/PassAuth";

import { Link, useNavigate } from "react-router-dom";

import { useState } from "react";

import { signupApi } from "@/api/api";

function SignupPage() {
  const navigate = useNavigate();

  /* ===============================
     회원 정보
  =============================== */

  const [form, setForm] = useState({
    name: "",

    userId: "",

    password: "",

    passwordCheck: "",

    phone: "",

    address: "",

    detailAddress: "",

    email: "",
  });

  /* ===============================
     이메일
  =============================== */

  const [emailId, setEmailId] = useState("");

  const [emailDomain, setEmailDomain] = useState("");

  const [directDomain, setDirectDomain] = useState(false);

  /* ===============================
     PASS 인증
  =============================== */

  const [phoneVerified, setPhoneVerified] = useState(false);

  /* ===============================
     입력 변경
  =============================== */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,

      [e.target.name]: e.target.value,
    }));
  };

  /* ===============================
     주소 검색
  =============================== */

  const handleAddressSearch = () => {
    alert("주소 검색 기능 연결 예정입니다.");
  };

  /* ===============================
     이메일 변경
  =============================== */

  const updateEmail = (id: string, domain: string) => {
    setForm((prev) => ({
      ...prev,

      email: id && domain ? `${id}@${domain}` : "",
    }));
  };

  const handleEmailDomain = (value: string) => {
    if (value === "직접입력") {
      setDirectDomain(true);

      setEmailDomain("");

      updateEmail(emailId, "");
    } else {
      setDirectDomain(false);

      setEmailDomain(value);

      updateEmail(emailId, value);
    }
  };

  /* ===============================
     회원가입
  =============================== */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.userId || !form.password) {
      alert("아이디와 비밀번호를 입력해주세요.");

      return;
    }

    if (form.password !== form.passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");

      return;
    }

    if (!phoneVerified) {
      alert("PASS 인증을 완료해주세요.");

      return;
    }

    try {
      await signupApi({
        name: form.name.trim(),

        userId: form.userId.trim(),

        password: form.password,

        phone: form.phone.trim(),

        address: form.address,

        detailAddress: form.detailAddress,

        email: form.email,

        phoneVerified: true,
      });

      alert("회원가입 완료");

      navigate("/");
    } catch (error) {
      console.error("회원가입 오류", error);

      alert("회원가입 실패");
    }
  };

  return (
    <div className={styles.signupContainer}>
      <div className={styles.signupCard}>
        <h2>회원가입</h2>

        <p className={styles.description}>
          싸.농 서비스를 이용하려면
          <br />
          회원가입이 필요합니다.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>아이디</label>

            <input
              type="text"
              name="userId"
              placeholder="아이디"
              value={form.userId}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>비밀번호</label>

            <input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>비밀번호 확인</label>

            <input
              type="password"
              name="passwordCheck"
              placeholder="비밀번호 확인"
              value={form.passwordCheck}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>이름</label>

            <input
              type="text"
              name="name"
              placeholder="이름"
              value={form.name}
              disabled={phoneVerified}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>전화번호</label>

            <div className={styles.phoneGroup}>
              <input
                type="tel"
                name="phone"
                placeholder="휴대폰 번호"
                value={form.phone}
                disabled={phoneVerified}
                onChange={handleChange}
              />

              <PassAuth
                onSuccess={(result) => {
                  setForm((prev) => ({
                    ...prev,

                    name: result.name,

                    phone: result.phoneNumber,
                  }));

                  setPhoneVerified(true);
                }}
              />
            </div>

            {phoneVerified && (
              <p className={styles.success}>✔ PASS 휴대폰 인증 완료</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelButtonRow}>
              <label>주소</label>

              <button
                type="button"
                className={styles.addressBtn}
                onClick={handleAddressSearch}
              >
                주소검색
              </button>
            </div>

            <input
              type="text"
              name="address"
              placeholder="주소"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="text"
              name="detailAddress"
              placeholder="상세주소"
              value={form.detailAddress}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>이메일</label>

            <div className={styles.emailGroup}>
              <input
                type="text"
                placeholder="아이디"
                value={emailId}
                onChange={(e) => {
                  setEmailId(e.target.value);

                  updateEmail(e.target.value, emailDomain);
                }}
              />

              <span>@</span>

              <input
                type="text"
                placeholder="도메인"
                disabled={!directDomain}
                value={emailDomain}
                onChange={(e) => {
                  setEmailDomain(e.target.value);

                  updateEmail(emailId, e.target.value);
                }}
              />

              <select
                value={directDomain ? "직접입력" : emailDomain}
                onChange={(e) => handleEmailDomain(e.target.value)}
              >
                <option value="">선택</option>

                <option value="naver.com">naver.com</option>

                <option value="gmail.com">gmail.com</option>

                <option value="daum.net">daum.net</option>

                <option value="직접입력">직접입력</option>
              </select>
            </div>
          </div>

          <button type="submit" className={styles.signupButton}>
            가입하기
          </button>
        </form>

        <div className={styles.socialBox}>
          <SocialLogin mode="signup" />
        </div>

        <div className={styles.loginLink}>
          이미 회원이신가요?
          <Link to="/">로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
