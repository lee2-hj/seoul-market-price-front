import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin, logout } from "@/features/auth/utils/auth";


/* 첨부파일 제한 */

const MAX_FILE_COUNT = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* 허용 확장자 */

const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf"];
/* 파일 크기 표시 */

const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/* 파일 확장자 조회 */

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* Q&A Write Page */

function QnaWritePage() {
  const navigate = useNavigate();

  /* 파일 input 접근용 Ref */

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* 로그인 사용자 (zustand 기반) */

  const currentUser = getLoginUser();

  const currentUserName = currentUser?.name || currentUser?.userId || "사용자";

  const isLoggedIn = isLogin();

  /* 작성 폼 */

  const [form, setForm] = useState({
    title: "",
    content: "",
    publicQuestion: true,
  });

  /* 첨부파일 */

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  /* 등록 상태 */

  const [loading, setLoading] = useState(false);

  /* 입력값 변경 */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* 파일 선택 버튼 */

  const handleFileButtonClick = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* 파일 선택 */

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    /* 기존 파일 + 새 파일 */

    const combinedFiles = [...attachedFiles, ...selectedFiles];

    /* 파일 개수 검사 */

    if (combinedFiles.length > MAX_FILE_COUNT) {
      alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있습니다.`);

      event.target.value = "";

      return;
    }

    /* 파일 검사 */

    for (const file of selectedFiles) {
      const extension = getFileExtension(file.name);

      /* 확장자 검사 */

      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        alert(
          `${file.name}\n허용되지 않는 파일 형식입니다.\n\n허용 형식: JPG, JPEG, PNG, GIF, PDF`,
        );

        event.target.value = "";

        return;
      }

      /* 파일 크기 검사 */

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}\n파일 크기가 10MB를 초과했습니다.`);

        event.target.value = "";

        return;
      }
    }

    /* 동일 파일 중복 검사 */

    const duplicateFile = selectedFiles.find((newFile) =>
      attachedFiles.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size &&
          existingFile.lastModified === newFile.lastModified,
      ),
    );

    if (duplicateFile) {
      alert(`${duplicateFile.name}\n이미 첨부된 파일입니다.`);

      event.target.value = "";

      return;
    }

    /* 첨부파일 상태 저장 */

    setAttachedFiles(combinedFiles);

    /* 같은 파일을 다시 선택할 수 있도록 초기화 */

    event.target.value = "";
  };

  /* 첨부파일 삭제 */

  const handleRemoveFile = (index: number) => {
    if (loading) {
      return;
    }

    setAttachedFiles((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  /* 입력값 검사 */

  const validateForm = (): boolean => {
    const title = form.title.trim();
    const content = form.content.trim();

    /* 제목 검사 */

    if (!title) {
      alert("제목을 입력해주세요.");

      return false;
    }

    /* 제목 길이 검사 */

    if (title.length > 200) {
      alert("제목은 200자 이내로 입력해주세요.");

      return false;
    }

    /* 내용 검사 */

    if (!content) {
      alert("내용을 입력해주세요.");

      return false;
    }

    /* 내용 길이 검사 */

    if (content.length > 5000) {
      alert("내용은 5,000자 이내로 입력해주세요.");

      return false;
    }

    return true;
  };

  /* 질의응답 등록 */

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    /* 등록 시점의 로그인 사용자 다시 확인 (zustand 기반) */

    const loginUser = getLoginUser();

    if (!loginUser?.userId) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");

      navigate("/login");

      return;
    }

    /* 입력값 검사 */

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /*
       * 백엔드 QnaCreateRequest와
       * 필드명을 정확하게 맞춘다.
       *
       * title
       * questionContent
       * publicQuestion
       *
       * 작성자 정보는 프론트에서 보내지 않는다.
       *
       * 백엔드에서
       * @AuthenticationPrincipal
       * CustomUserPrincipal을 통해
       * 로그인 회원 정보를 가져온다.
       */

      const requestData = {
        title: form.title.trim(),
        questionContent: form.content.trim(),
        publicQuestion: form.publicQuestion,
      };

      console.log("=================================");
      console.log("Q&A 등록 요청 시작");
      console.log("요청 URL:", "/api/qnas");
      console.log("요청 데이터:", requestData);
      console.log("현재 로그인 사용자:", loginUser);
      console.log("=================================");

      /*
       * api.ts를 수정하지 않고
       * apiMiddleware를 직접 사용한다.
       *
       * POST /api/qnas
       */

      const response = await apiMiddleware.post("/api/qnas", requestData);

      console.log("=================================");
      console.log("Q&A 등록 성공");
      console.log("응답 상태:", response.status);
      console.log("응답 데이터:", response.data);
      console.log("=================================");

      alert("질의응답이 등록되었습니다.");

      /*
       * 등록 성공 후 Q&A 목록으로 이동한다.
       *
       * QnaPage에서 다시
       * GET /api/qnas를 호출한다.
       */

      navigate("/qna");
    } catch (error) {
      console.error("=================================");
      console.error("Q&A 등록 실패");

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태:", error.response?.status);

        console.error("백엔드 응답:", error.response?.data);

        console.error("요청 URL:", error.config?.url);

        console.error("요청 데이터:", error.config?.data);
      } else {
        console.error(error);
      }

      console.error("=================================");

      /* Axios 오류 처리 */

      if (axios.isAxiosError(error)) {
        /* 400 Bad Request */

        if (error.response?.status === 400) {
          const responseData = error.response?.data;

          console.error("400 상세 오류:", responseData);

          /*
           * Spring Validation 오류 메시지가
           * 내려오는 경우 해당 메시지를 표시한다.
           */

          if (typeof responseData === "object" && responseData !== null) {
            const errorMessage = (
              responseData as {
                message?: string;
                error?: string;
              }
            ).message;

            if (errorMessage) {
              alert(`질의응답 등록 실패\n\n${errorMessage}`);

              return;
            }
          }

          alert("입력한 질의응답 내용을 확인해주세요.");

          return;
        }

        /* 401 Unauthorized */

        if (error.response?.status === 401) {
          alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");

          await logout();

          navigate("/login");

          return;
        }

        /* 403 Forbidden */

        if (error.response?.status === 403) {
          alert("질의응답을 등록할 권한이 없습니다.");

          return;
        }

        /* 404 Not Found */

        if (error.response?.status === 404) {
          alert(
            "Q&A 등록 API를 찾을 수 없습니다. 백엔드의 /api/qnas 경로를 확인해주세요.",
          );

          return;
        }

        /* 500 Internal Server Error */

        if (error.response?.status === 500) {
          alert("서버에서 질의응답 등록 중 오류가 발생했습니다.");

          return;
        }
      }

      alert("질의응답 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /* 로그인하지 않은 경우 */

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            CUSTOMER CENTER
          </span>
          <h1 className="text-[28px] font-black text-[#242b23]">로그인이 필요합니다.</h1>
          <p className="text-[15px] text-[#667065]">질의응답 글쓰기는 로그인한 회원만 이용할 수 있습니다.</p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-white border border-[#dce4da] text-[#5c665b] rounded-[7px] text-[14px] font-bold hover:bg-[#f0f5ef] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              style={{ textDecoration: "none" }}
            >
              목록으로 돌아가기
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-[#4c9b55] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#438b4b] cursor-pointer no-underline"
              onClick={() => navigate("/login")}
              style={{ textDecoration: "none" }}
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 로그인 상태 */

  return (
    <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 페이지 제목 */}

        <div className="flex items-center justify-between pb-6 border-b border-[#dce4da]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[32px] font-black text-[#242b23] tracking-tight">질의응답 작성</h1>
            <p className="text-[14px] text-[#667065] mt-1">궁금한 내용을 입력해 문의를 남겨주세요.</p>
          </div>

          <button
            type="button"
            className="px-4 py-2 bg-white border border-[#dce4da] text-[#5c665b] rounded-[7px] text-[14px] font-bold hover:bg-[#f0f5ef] transition-colors cursor-pointer no-underline"
            onClick={() => navigate("/qna")}
            disabled={loading}
            style={{ textDecoration: "none" }}
          >
            목록으로
          </button>
        </div>

        {/* 질의응답 작성 폼 */}

        <form className="bg-white border border-[#dce4da] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm" onSubmit={handleSubmit}>
          {/* 작성자 */}

          <div className="space-y-1.5">
            <label htmlFor="author" className="block text-[14px] font-bold text-[#343c33]">작성자</label>

            <input id="author" type="text" value={currentUserName} disabled className="w-full h-[44px] px-3.5 bg-[#f4f7f3] border border-[#dce4da] rounded-[7px] text-[14px] text-[#667065]" />

            <small className="text-[12px] text-[#8a9388]">현재 로그인한 회원 정보로 자동 등록됩니다.</small>
          </div>

          {/* 제목 */}

          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-[14px] font-bold text-[#343c33]">
              제목 <span className="text-rose-500">*</span>
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="문의 제목을 입력해주세요."
              maxLength={200}
              disabled={loading}
              autoFocus
              className="w-full h-[44px] px-3.5 bg-white border border-[#dce4da] rounded-[7px] text-[14px] text-[#242b23] focus:outline-none focus:border-[#4c9b55]"
            />

            <div className="flex justify-between text-[12px] text-[#8a9388]">
              <span>최대 200자까지 입력할 수 있습니다.</span>

              <span>{form.title.length} / 200</span>
            </div>
          </div>

          {/* 공개 여부 */}

          <div className="space-y-1.5">
            <label className="block text-[14px] font-bold text-[#343c33]">
              공개 여부 <span className="text-rose-500">*</span>
            </label>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-[14px] text-[#242b23] cursor-pointer">
                <input
                  type="radio"
                  name="publicQuestion"
                  checked={form.publicQuestion === true}
                  onChange={() => setForm((prev) => ({ ...prev, publicQuestion: true }))}
                  disabled={loading}
                  className="w-4 h-4 text-[#4c9b55] focus:ring-[#4c9b55]"
                />
                <span>🌐 공개글 (누구나 답변 및 질문 확인 가능)</span>
              </label>

              <label className="flex items-center gap-2 text-[14px] text-[#242b23] cursor-pointer">
                <input
                  type="radio"
                  name="publicQuestion"
                  checked={form.publicQuestion === false}
                  onChange={() => setForm((prev) => ({ ...prev, publicQuestion: false }))}
                  disabled={loading}
                  className="w-4 h-4 text-[#4c9b55] focus:ring-[#4c9b55]"
                />
                <span>🔒 비공개글 (작성자와 관리자만 확인 가능)</span>
              </label>
            </div>
          </div>

          {/* 내용 */}

          <div className="space-y-1.5">
            <label htmlFor="content" className="block text-[14px] font-bold text-[#343c33]">
              내용 <span className="text-rose-500">*</span>
            </label>

            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의 내용을 입력해주세요."
              rows={12}
              maxLength={5000}
              disabled={loading}
              className="w-full p-3.5 bg-white border border-[#dce4da] rounded-[7px] text-[14px] text-[#242b23] focus:outline-none focus:border-[#4c9b55] resize-y"
            />

            <div className="flex justify-between text-[12px] text-[#8a9388]">
              <span>최대 5,000자까지 입력할 수 있습니다.</span>

              <span>{form.content.length.toLocaleString()} / 5,000</span>
            </div>
          </div>

          {/* 첨부파일 */}

          <div className="space-y-2">
            <label htmlFor="file" className="block text-[14px] font-bold text-[#343c33]">첨부파일</label>

            <input
              ref={fileInputRef}
              id="file"
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              multiple
              onChange={handleFileChange}
              disabled={loading || attachedFiles.length >= MAX_FILE_COUNT}
            />

            <div className="flex items-center gap-4 p-4 bg-[#f8faf7] border border-[#dce4da] rounded-[8px]">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-[#dce4da] text-[#4c9b55] font-bold text-[13px] rounded-[6px] hover:bg-[#eef5ee] cursor-pointer no-underline"
                onClick={handleFileButtonClick}
                disabled={loading || attachedFiles.length >= MAX_FILE_COUNT}
                style={{ textDecoration: "none" }}
              >
                📎 파일 선택
              </button>

              <div className="text-[12px] text-[#667065] space-x-2">
                <span>최대 {MAX_FILE_COUNT}개 · 파일당 최대 10MB</span>
                <span>(JPG, JPEG, PNG, GIF, PDF)</span>
              </div>
            </div>

            {/* 선택된 파일 */}

            {attachedFiles.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-[13px] font-bold text-[#343c33]">
                  <span>선택된 파일</span>

                  <span>
                    {attachedFiles.length} / {MAX_FILE_COUNT}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {attachedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between p-2.5 bg-[#f4f7f3] rounded-[6px] text-[13px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>📎</span>

                        <span className="font-medium text-[#242b23] truncate" title={file.name}>
                          {file.name}
                        </span>

                        <span className="text-[#8a9388] text-[12px]">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>

                      <button
                        type="button"
                        className="text-rose-500 font-bold hover:text-rose-700 px-2 cursor-pointer no-underline"
                        onClick={() => handleRemoveFile(index)}
                        disabled={loading}
                        aria-label={`${file.name} 첨부파일 삭제`}
                        style={{ textDecoration: "none" }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 안내 문구 */}

          <div className="flex items-start gap-3 p-4 bg-[#e8f4e9] rounded-[8px] text-[13px] text-[#385e3c]">
            <span className="text-[16px]">💡</span>

            <div>
              <strong className="block font-bold mb-1">질의응답 이용 안내</strong>

              <p className="leading-relaxed text-[#436b48]">
                작성한 질의응답은 작성자 본인이 확인할 수 있으며, 관리자는 모든 질의응답 게시글을 확인하고 답변할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 버튼 */}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#dce4da]">
            <button
              type="button"
              className="px-6 py-2.5 bg-white border border-[#dce4da] text-[#5c665b] rounded-[7px] text-[14px] font-bold hover:bg-[#f0f5ef] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              disabled={loading}
              style={{ textDecoration: "none" }}
            >
              취소
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#4c9b55] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#438b4b] cursor-pointer no-underline"
              disabled={loading}
              style={{ textDecoration: "none" }}
            >
              {loading ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default QnaWritePage;
