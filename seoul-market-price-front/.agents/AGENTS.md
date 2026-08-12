# Project Rules

## 1. 공용 파일 관리 및 팀원 전달 규칙 (`api.ts`, `Router.tsx` 등)
- **사전 검증 후 전달**:
  - 앞으로 `api.ts`나 `Router.tsx` 등 팀원 공용 파일에 추가/수정이 필요할 때는, 에이전트가 먼저 컴파일/빌드 검사를 실행하여 **오류(0 errors)가 없음을 확실하게 검증한 뒤**, 검증된 완성 코드만 사용자에게 전달한다.
- **공용 파일 임의 수정 금지**:
  - `api.ts`, `Router.tsx`는 웬만하면 직접 수정하지 않고, 팀원에게 전달할 스니펫을 검증하여 제공한다.
- **불필요한 자동 빌드 지양**:
  - 매 코드 수정 시마다 불필요하게 빌드를 남발하지 않으며, 오직 위와 같이 공용 파일 검증이나 사용자 요청 시에만 정밀하게 검증한다.

## 2. 작업 스코프 및 보안 규칙
- **담당 작업 영역 엄수**:
  - 사용자 담당 영역(게시판 `Board`, 마이페이지 `MyPage`, 비밀번호 찾기 `FindPassword` 등)에만 집중하며, 타 팀원 영역(`Qna` 등)은 절대 임의로 수정하지 않는다.
- **선제적 보안 (필수 적용)**:
  - 비로그인 접근 차단, URL 직접 접근 방어, 작성자 본인 검증, 회원 탈퇴 시 2중 보안 검증을 철저히 유지한다.

## 3. UI & Styling Guidelines
- **No Text Underlines (`no-underline`)**:
  - Always remove default browser underlines on all `<a>` tags, `<Link>` components, buttons, titles, dates, and navigation links (`no-underline`, `text-decoration: none`).
  - Maintain a clean, modern, premium UI look across all pages.
