const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/* 영문, 숫자, 특수문자만 허용하며 8자 이상 16자 이하 */
const PASSWORD_REGEX =
  /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
