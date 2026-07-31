import styles from "./SignupPage.module.css";
import SocialLogin from "../../features/auth/components/SocialLogin";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import {
  sendPhoneAuthApi,
  verifyPhoneAuthApi,
  signupApi,
  checkUserIdApi,
} from "@/api/api";

function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",

    userId: "",

    password: "",

    passwordCheck: "",

    phone: "",

    authNumber: "",
  });

  // 휴대폰 인증 여부

  const [phoneVerified, setPhoneVerified] = useState(false);

  // 인증번호 발송 상태

  const [sending, setSending] = useState(false);

  // 아이디 확인 여부

  const [idChecked, setIdChecked] = useState(false);

  // 아이디 확인 메시지

  const [idMessage, setIdMessage] = useState("");

  // 회원가입 진행 상태

  const [loading, setLoading] = useState(false);

  // 입력 변경

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  // 아이디 중복 확인

  const handleCheckUserId = async () => {
    if (!form.userId) {
      alert("아이디를 입력해주세요.");

      return;
    }

    try {
      const result = await checkUserIdApi(form.userId);

      if (result === true) {
        setIdChecked(true);

        setIdMessage("✔ 사용 가능한 아이디입니다.");
      } else {
        setIdChecked(false);

        setIdMessage("❌ 이미 사용중인 아이디입니다.");
      }
    } catch (error) {
      console.error(error);

      alert("아이디 확인 실패");
    }
  };

  // 인증번호 발송

  const handleSendAuth = async () => {
    if (!form.phone) {
      alert("휴대폰 번호를 입력해주세요.");

      return;
    }

    try {
      setSending(true);

      await sendPhoneAuthApi(form.phone);

      alert("인증번호가 발송되었습니다.");
    } catch (error) {
      console.error(error);

      alert("인증번호 발송 실패");
    } finally {
      setSending(false);
    }
  };

  // 인증번호 확인

  const handleVerifyAuth = async () => {
    if (!form.authNumber) {
      alert("인증번호를 입력해주세요.");

      return;
    }

    try {
      const result = await verifyPhoneAuthApi(form.phone, form.authNumber);

      if (result === true) {
        setPhoneVerified(true);

        alert("휴대폰 인증 완료");
      } else {
        setPhoneVerified(false);

        alert("인증번호가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error(error);

      alert("인증 확인 실패");
    }
  };

  // 회원가입

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idChecked) {
      alert("아이디 중복확인을 해주세요.");

      return;
    }

    if (!form.userId || !form.password) {
      alert("아이디와 비밀번호를 입력해주세요.");

      return;
    }

    if (form.password !== form.passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");

      return;
    }

    if (!phoneVerified) {
      alert("휴대폰 인증을 완료해주세요.");

      return;
    }

    try {
      setLoading(true);

      await signupApi({
        name: form.name,

        userId: form.userId,

        password: form.password,

        phone: form.phone,

        phoneVerified: true,
      });

      alert("회원가입 완료");

      navigate("/");
    } catch (error) {
      console.error(error);

      alert("회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupContainer}>
      <div className={styles.signupCard}>
        <h2>회원가입</h2>

        <p>
          싸.농 서비스를 이용하려면
          <br />
          회원가입이 필요합니다.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="이름"
            value={form.name}
            onChange={handleChange}
          />

          {/* 아이디 */}

          <div className={styles.idGroup}>
            <input
              type="text"
              name="userId"
              placeholder="아이디"
              value={form.userId}
              onChange={(e) => {
                handleChange(e);

                setIdChecked(false);

                setIdMessage("");
              }}
            />

            <button type="button" onClick={handleCheckUserId}>
              중복확인
            </button>
          </div>

          {idMessage && (
            <p
              style={{
                color: idChecked ? "green" : "red",

                textAlign: "center",
              }}
            >
              {idMessage}
            </p>
          )}

          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
          />

          <input
            type="password"
            name="passwordCheck"
            placeholder="비밀번호 확인"
            value={form.passwordCheck}
            onChange={handleChange}
          />

          {/* 휴대폰 */}

          <div className={styles.phoneGroup}>
            <input
              type="tel"
              name="phone"
              placeholder="휴대폰 번호"
              value={form.phone}
              onChange={handleChange}
            />

            <button type="button" onClick={handleSendAuth}>
              {sending ? "발송중..." : "인증받기"}
            </button>
          </div>

          <div className={styles.phoneGroup}>
            <input
              type="text"
              name="authNumber"
              placeholder="인증번호"
              value={form.authNumber}
              onChange={handleChange}
            />

            <button type="button" onClick={handleVerifyAuth}>
              인증확인
            </button>
          </div>

          {phoneVerified && (
            <p
              style={{
                color: "green",

                textAlign: "center",
              }}
            >
              ✔ 휴대폰 인증 완료
            </p>
          )}

          <button
            type="submit"
            className={styles.signupButton}
            disabled={loading}
          >
            {loading ? "가입중..." : "회원가입"}
          </button>
        </form>

        <SocialLogin mode="signup" />

        <div className={styles.loginLink}>
          이미 회원이신가요?
          <Link to="/">로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
