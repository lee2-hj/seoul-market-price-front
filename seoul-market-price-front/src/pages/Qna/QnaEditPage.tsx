import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin, logout } from "@/features/auth/utils/auth";

/* Q&A 상세 응답 */
interface QnaDetailResponse {
  id: number;
  writerLoginId?: string;
  writerName?: string;
  title: string;
  questionContent?: string;
  answerContent?: string;
  answerAdminName?: string;
  answerStatus?: string | number;
  attachName?: string;
  attachPath?: string;
  viewCount?: number;
  publicQuestion?: boolean;
  createdAt?: string;
  updatedAt?: string;
  answeredAt?: string;
}

/* 첨부파일 최대 용량 (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* 허용 확장자 */
const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "hwp",
  "hwpx",
  "txt",
];

/* 관리자 여부 */
const isAdminUser = (role?: string): boolean => {
  if (!role) {
    return false;
  }

  const normalized = role.toUpperCase();

  return normalized === "ADMIN" || normalized === "ROLE_ADMIN";
};

/* 파일 용량 표시 */
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/* 파일 확장자 확인 */
const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* Q&A 수정 페이지 */
function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 파일 input 참조 */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* 로그인 사용자 (zustand 기반) */
  const currentUser = getLoginUser();

  /* 로그인 사용자 ID */
  const currentUserId = useMemo(() => {
    return currentUser?.userId ?? "";
  }, [currentUser]);

  /* 로그인 사용자 여부 (zustand 기반) */
  const isLoggedIn = isLogin();

  /* 관리자 여부 */
  const isAdmin = useMemo(() => {
    return isAdminUser(currentUser?.role);
  }, [currentUser]);

  /* 게시글 */
  const [post, setPost] = useState<QnaDetailResponse | null>(null);

  /* 오류 메시지 */
  const [errorMessage, setErrorMessage] = useState("");

  /* 수정 Form */
  const [form, setForm] = useState({
    title: "",
    content: "",
    publicQuestion: true,
  });

  /* 기존 첨부파일 */
  const [currentAttachment, setCurrentAttachment] = useState<{
    name: string;
    path?: string;
  } | null>(null);

  /* 기존 첨부파일 삭제 여부 */
  const [attachmentDeleted, setAttachmentDeleted] = useState(false);

  /* 새 파일 */
  const [newFile, setNewFile] = useState<File | null>(null);

  /* 새 파일 표시 정보 */
  const [newAttachment, setNewAttachment] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  /* 전체 처리 중 */
  const [loading, setLoading] = useState(true);

  /* 작성자 여부 */
  const isAuthor = useMemo(() => {
    if (!post || !currentUserId) {
      return false;
    }

    return post.writerLoginId === currentUserId;
  }, [post, currentUserId]);

  /*
   * 수정 권한
   *
   * 작성자 본인만 Q&A 게시글 수정 가능
   */
  const canEdit = isAuthor;

  /* Q&A 상세 조회 */
  useEffect(() => {
    const fetchQnaDetail = async () => {
      if (!isLoggedIn || !currentUserId) {
        setLoading(false);
        return;
      }

      const qnaId = Number(id);

      if (!id || Number.isNaN(qnaId)) {
        setErrorMessage("잘못된 질의응답 게시글입니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await apiMiddleware.get<QnaDetailResponse>(
          `/api/qnas/${qnaId}`,
        );

        const data = response.data;

        if (!data || !data.id) {
          setErrorMessage("게시글 정보를 확인할 수 없습니다.");
          return;
        }

        /*
         * 작성자 본인만 수정 가능
         */
        const writerLoginId = data.writerLoginId ?? "";

        if (writerLoginId !== currentUserId) {
          alert("본인이 작성한 게시글만 수정할 수 있습니다.");

          navigate(`/qna/${data.id}`);

          return;
        }

        setPost(data);

        setForm({
          title: data.title ?? "",
          content: data.questionContent ?? "",
          publicQuestion: data.publicQuestion ?? true,
        });

        /* 기존 첨부파일 */
        if (data.attachName) {
          setCurrentAttachment({
            name: data.attachName,
            path: data.attachPath,
          });
        } else {
          setCurrentAttachment(null);
        }
      } catch (error) {
        console.error("Q&A 상세 조회 실패:", error);

        if (axios.isAxiosError(error)) {
          console.error("상태:", error.response?.status);
          console.error("응답:", error.response?.data);

          /* localStorage 폴백: 백엔드에 없는 로컬 게시글 상세 조회 및 권한 확인 */
          if (error.response?.status === 404) {
            const stored = localStorage.getItem("qnaPosts");
            if (stored) {
              try {
                const localPosts = JSON.parse(stored) as Array<{
                  id: number;
                  authorId?: string;
                  author?: string;
                  title?: string;
                  content?: string;
                  date?: string;
                  views?: number;
                  answer?: string;
                }>;
                const localPost = localPosts.find(
                  (p) => String(p.id) === String(id),
                );
                if (localPost) {
                  const localWriterId = localPost.authorId ?? "";
                  if (localWriterId !== currentUserId) {
                    alert("본인이 작성한 게시글만 수정할 수 있습니다.");
                    navigate(`/qna/${localPost.id}`);
                    return;
                  }
                  const localDetail = {
                    id: localPost.id,
                    writerLoginId: localPost.authorId,
                    writerName: localPost.author,
                    title: localPost.title ?? "",
                    questionContent: localPost.content,
                    publicQuestion: true,
                  };
                  setPost(localDetail);
                  setForm({
                    title: localDetail.title,
                    content: localDetail.questionContent ?? "",
                    publicQuestion: true,
                  });
                  setCurrentAttachment(null);
                  setLoading(false);
                  return;
                }
              } catch {
                /* 파싱 실패 시 원래 에러 메시지 표시 */
              }
            }
            setErrorMessage("게시글을 찾을 수 없습니다.");
            return;
          }
        }

        setErrorMessage("게시글 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchQnaDetail();
  }, [id, navigate, currentUserId, isAdmin, isLoggedIn]);

  /* 입력값 변경 */
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* 공개 여부 변경 */
  const handlePublicQuestionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((prev) => ({
      ...prev,
      publicQuestion: event.target.checked,
    }));
  };

  /*
   * 첨부파일 선택
   *
   * 현재 백엔드 QnaUpdateRequest에는
   * MultipartFile 필드가 없으므로
   * 실제 서버 업로드는 처리하지 않는다.
   *
   * 선택된 파일은 화면에서만 관리하고,
   * 실제 서버 반영은 별도 파일 업로드 API가 필요하다.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /* 파일 용량 확인 */
    if (file.size > MAX_FILE_SIZE) {
      alert("첨부파일은 최대 10MB까지 등록할 수 있습니다.");

      event.target.value = "";

      return;
    }

    /* 파일 확장자 확인 */
    const extension = getFileExtension(file.name);

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      alert(
        "첨부할 수 없는 파일 형식입니다.\n\n" +
          "허용 파일: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, TXT",
      );

      event.target.value = "";

      return;
    }

    setNewFile(file);

    setNewAttachment({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    /*
     * 새 파일을 선택하면
     * 기존 파일을 교체하는 것으로 처리한다.
     */
    setAttachmentDeleted(true);

    event.target.value = "";
  };

  /* 첨부파일 선택창 열기 */
  const handleFileSelect = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* 기존 첨부파일 삭제 */
  const handleCurrentAttachmentDelete = () => {
    if (loading) {
      return;
    }

    const deleteConfirm = window.confirm("현재 첨부파일을 삭제하시겠습니까?");

    if (!deleteConfirm) {
      return;
    }

    setCurrentAttachment(null);
    setAttachmentDeleted(true);
    setNewFile(null);
    setNewAttachment(null);
  };

  /* 새 첨부파일 삭제 */
  const handleNewAttachmentDelete = () => {
    if (loading) {
      return;
    }

    setNewFile(null);
    setNewAttachment(null);

    /*
     * 새 파일을 제거하면
     * 기존 첨부파일을 다시 표시한다.
     */
    if (post?.attachName) {
      setCurrentAttachment({
        name: post.attachName,
        path: post.attachPath,
      });

      setAttachmentDeleted(false);
    } else {
      setCurrentAttachment(null);
      setAttachmentDeleted(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 파일 변경 취소 */
  const handleAttachmentChangeCancel = () => {
    if (loading) {
      return;
    }

    setNewFile(null);
    setNewAttachment(null);

    if (post?.attachName) {
      setCurrentAttachment({
        name: post.attachName,
        path: post.attachPath,
      });

      setAttachmentDeleted(false);
    } else {
      setCurrentAttachment(null);
      setAttachmentDeleted(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* 입력값 검사 */
  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");

      return false;
    }

    /* 백엔드 title 최대 200자 */
    if (form.title.trim().length > 200) {
      alert("제목은 200자 이내로 입력해주세요.");

      return false;
    }

    if (!form.content.trim()) {
      alert("내용을 입력해주세요.");

      return false;
    }

    return true;
  };

  /*
   * Q&A 수정
   *
   * 백엔드 Controller:
   *
   * @PatchMapping("/{id}")
   * public ResponseEntity<QnaDetailResponse> updateQna(
   *      @PathVariable Long id,
   *      @AuthenticationPrincipal CustomUserPrincipal principal,
   *      @Valid @RequestBody QnaUpdateRequest request)
   *
   * 따라서 multipart/form-data가 아니라
   * JSON Body로 전송한다.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    /* 로그인 확인 */
    if (!isLoggedIn || !currentUser || !currentUserId) {
      alert("로그인 후 이용할 수 있습니다.");

      navigate("/login");

      return;
    }

    /* 게시글 확인 */
    if (!post) {
      alert("게시글을 찾을 수 없습니다.");

      navigate("/qna");

      return;
    }

    /* 수정 권한 확인 */
    if (!canEdit) {
      alert("Q&A를 수정할 권한이 없습니다.");

      navigate(`/qna/${post.id}`);

      return;
    }

    /* 입력값 검사 */
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /*
       * QnaUpdateRequest와 동일한 구조
       *
       * title
       * questionContent
       * publicQuestion
       * attachName
       * attachPath
       * attachmentChanged
       */
      const requestData = {
        title: form.title.trim(),
        questionContent: form.content.trim(),
        publicQuestion: form.publicQuestion,
        attachName:
          attachmentDeleted && !newFile
            ? null
            : newFile
              ? newFile.name
              : (currentAttachment?.name ?? null),
        attachPath:
          attachmentDeleted && !newFile
            ? null
            : newFile
              ? null
              : (currentAttachment?.path ?? null),
        attachmentChanged: attachmentDeleted || Boolean(newFile),
      };

      console.log("=================================");
      console.log("Q&A 수정 요청 시작");
      console.log("수정 URL:", `/api/qnas/${post.id}`);
      console.log("수정 데이터:", requestData);
      console.log("작성자:", isAuthor);
      console.log("관리자:", isAdmin);
      console.log("수정 가능:", canEdit);
      console.log("새 첨부파일:", newFile);
      console.log("=================================");

      /*
       * 현재 백엔드 @RequestBody QnaUpdateRequest에 맞춰
       * JSON으로 전송한다.
       */
      const response = await apiMiddleware.patch<QnaDetailResponse>(
        `/api/qnas/${post.id}`,
        requestData,
      );

      console.log("=================================");
      console.log("Q&A 수정 성공");
      console.log("응답 상태:", response.status);
      console.log("응답 데이터:", response.data);
      console.log("=================================");

      alert("Q&A가 수정되었습니다.");

      navigate(`/qna/${post.id}`);
    } catch (error) {
      console.error("=================================");
      console.error("Q&A 수정 실패");

      if (axios.isAxiosError(error)) {
        console.error("HTTP 상태:", error.response?.status);
        console.error("백엔드 응답:", error.response?.data);
        console.error("요청 URL:", error.config?.url);
      } else {
        console.error(error);
      }

      console.error("=================================");

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const responseData = error.response?.data;

          if (typeof responseData === "object" && responseData !== null) {
            const errorResponse = responseData as {
              message?: string;
              error?: string;
            };

            if (errorResponse.message) {
              alert(`Q&A 수정 실패\n\n${errorResponse.message}`);

              return;
            }
          }

          alert("입력한 Q&A 내용을 확인해주세요.");

          return;
        }

        if (error.response?.status === 401) {
          alert("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");

          await logout();

          navigate("/login");

          return;
        }

        if (error.response?.status === 403) {
          alert("Q&A를 수정할 권한이 없습니다.");

          return;
        }

        if (error.response?.status === 404) {
          /* localStorage 폴백: 백엔드에 없는 로컬 게시글 수정 */
          const stored = localStorage.getItem("qnaPosts");
          if (stored) {
            try {
              const localPosts = JSON.parse(stored) as Array<{
                id: number;
                authorId?: string;
                author?: string;
                title?: string;
                content?: string;
                date?: string;
                views?: number;
                answer?: string;
              }>;
              const idx = localPosts.findIndex(
                (p) => String(p.id) === String(post.id),
              );
              if (idx >= 0) {
                localPosts[idx] = {
                  ...localPosts[idx],
                  title: form.title.trim(),
                  content: form.content.trim(),
                };
                localStorage.setItem("qnaPosts", JSON.stringify(localPosts));
                alert("Q&A가 수정되었습니다.");
                navigate(`/qna/${post.id}`);
                return;
              }
            } catch {
              /* 파싱 실패 시 원래 에러 메시지 표시 */
            }
          }
          alert("수정할 Q&A 게시글을 찾을 수 없습니다.");
          navigate("/qna");
          return;
        }

        if (error.response?.status === 500) {
          alert(
            "서버에서 Q&A 수정 중 오류가 발생했습니다.\n\n" +
              "백엔드 로그를 확인해주세요.",
          );

          return;
        }
      }

      alert("Q&A 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /* 로딩 상태 */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center p-16 text-[#8a9388] text-[14px]">
          게시글 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  /* 오류 상태 */
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <div className="text-[32px]">⚠️</div>
          <h1 className="text-[28px] font-black text-[#242b23]">오류가 발생했습니다.</h1>
          <p className="text-[15px] text-[#6B7280]">{errorMessage}</p>
          <div className="pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] rounded-[7px] text-[14px] font-bold hover:bg-[#EBF5F8] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              style={{ textDecoration: "none" }}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 로그인하지 않은 경우 */
  if (!isLoggedIn || !currentUser || !currentUserId) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <div className="text-[32px]">🔒</div>
          <h1 className="text-[28px] font-black text-[#13202B]">로그인이 필요합니다.</h1>
          <p className="text-[15px] text-[#6B7280]">
            Q&A 게시글 수정은 로그인한 회원만 이용할 수 있습니다.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] rounded-[7px] text-[14px] font-bold hover:bg-[#EBF5F8] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              style={{ textDecoration: "none" }}
            >
              Q&A로 돌아가기
            </button>

            <button
              type="button"
              className="px-5 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer no-underline"
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

  /* 게시글이 없는 경우 */
  if (!post) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <div className="text-[32px]">❓</div>
          <h1 className="text-[28px] font-black text-[#13202B]">게시글을 찾을 수 없습니다.</h1>
          <p className="text-[15px] text-[#6B7280]">삭제되었거나 존재하지 않는 게시글입니다.</p>
          <div className="pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              style={{ textDecoration: "none" }}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * 수정 권한이 없는 경우
   *
   * 일반 사용자는 본인 게시글만 수정 가능
   * 관리자는 모든 게시글 수정 가능
   */
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <div className="text-[32px]">🔒</div>
          <h1 className="text-[28px] font-black text-[#13202B]">수정할 수 없는 게시글입니다.</h1>
          <p className="text-[15px] text-[#6B7280]">
            본인이 작성한 Q&A 게시글만 수정할 수 있습니다.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] rounded-[7px] text-[14px] font-bold hover:bg-[#EBF5F8] cursor-pointer no-underline"
              onClick={() => navigate(`/qna/${post.id}`)}
              style={{ textDecoration: "none" }}
            >
              게시글로 돌아가기
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer no-underline"
              onClick={() => navigate("/qna")}
              style={{ textDecoration: "none" }}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }


  /* 게시글 수정 화면 */
  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 페이지 제목 */}
        <div className="flex items-center justify-between pb-6 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>

            <h1 className="text-[32px] font-black text-[#13202B] tracking-tight">문의 수정</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              {isAdmin
                ? "관리자 권한으로 문의 내용을 수정할 수 있습니다."
                : "작성하신 문의 내용을 수정해주세요."}
            </p>
          </div>

          <button
            type="button"
            className="px-4 py-2 bg-white border border-[#DCE8ED] text-[#6B7280] rounded-[7px] text-[14px] font-bold hover:bg-[#EBF5F8] transition-colors cursor-pointer no-underline"
            onClick={() => navigate(`/qna/${post.id}`)}
            disabled={loading}
            style={{ textDecoration: "none" }}
          >
            돌아가기
          </button>
        </div>

        {/* 수정 Form */}
        <form className="bg-white border border-[#DCE8ED] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm" onSubmit={handleSubmit}>
          {/* 작성자 */}
          <div className="space-y-1.5">
            <label htmlFor="author" className="block text-[14px] font-bold text-[#13202B]">작성자</label>

            <input
              id="author"
              type="text"
              value={post.writerName || "사용자"}
              disabled
              className="w-full h-[44px] px-3.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[7px] text-[14px] text-[#6B7280]"
            />

            <small className="text-[12px] text-[#6B7280]">
              {isAdmin
                ? "관리자는 작성자를 변경할 수 없습니다."
                : "작성자는 변경할 수 없습니다."}
            </small>
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-[14px] font-bold text-[#13202B]">
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
              className="w-full h-[44px] px-3.5 bg-white border border-[#DCE8ED] rounded-[7px] text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8]"
            />

            <small className="text-[12px] text-[#6B7280]">최대 200자까지 입력할 수 있습니다.</small>
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <label htmlFor="content" className="block text-[14px] font-bold text-[#13202B]">
              내용 <span className="text-rose-500">*</span>
            </label>

            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의 내용을 입력해주세요."
              rows={12}
              disabled={loading}
              className="w-full p-3.5 bg-white border border-[#DCE8ED] rounded-[7px] text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8] resize-y"
            />
          </div>

          {/* 공개 여부 */}
          <div className="space-y-1.5">
            <label htmlFor="publicQuestion" className="block text-[14px] font-bold text-[#13202B]">공개 여부</label>

            <label className="inline-flex items-center gap-2 text-[14px] text-[#13202B] cursor-pointer">
              <input
                id="publicQuestion"
                type="checkbox"
                checked={form.publicQuestion}
                onChange={handlePublicQuestionChange}
                disabled={loading}
                className="w-4 h-4 accent-[#0F8AA8]"
              />
              공개 질문
            </label>

            <small className="block text-[12px] text-[#6B7280]">공개된 질문은 비로그인 사용자도 조회할 수 있습니다.</small>
          </div>

          {/* 첨부파일 */}
          <div className="space-y-2">
            <label htmlFor="attachment" className="block text-[14px] font-bold text-[#13202B]">첨부파일</label>

            <input
              ref={fileInputRef}
              id="attachment"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            {/* 기존 첨부파일 */}
            {currentAttachment && !attachmentDeleted && !newAttachment && (
              <div className="flex items-center justify-between p-3.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px]">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📎</span>

                  <div>
                    <strong className="block text-[14px] text-[#13202B] font-bold">{currentAttachment.name}</strong>

                    <span className="text-[12px] text-[#6B7280]">기존 첨부파일</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[12px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
                    onClick={handleFileSelect}
                    disabled={loading}
                    style={{ textDecoration: "none" }}
                  >
                    변경
                  </button>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[12px] font-bold rounded-[6px] hover:bg-rose-50 cursor-pointer no-underline"
                    onClick={handleCurrentAttachmentDelete}
                    disabled={loading}
                    style={{ textDecoration: "none" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* 기존 파일 삭제 상태 */}
            {attachmentDeleted && !newAttachment && (
              <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-[8px] text-[13px] text-rose-700 font-medium">
                <span>첨부파일이 삭제됩니다.</span>

                <button
                  type="button"
                  className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[12px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
                  onClick={handleFileSelect}
                  disabled={loading}
                  style={{ textDecoration: "none" }}
                >
                  새 파일 선택
                </button>
              </div>
            )}

            {/* 새 파일 */}
            {newAttachment && (
              <div className="flex items-center justify-between p-3.5 bg-[#EBF5F8] border border-[#7CC9D8] rounded-[8px]">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📎</span>

                  <div>
                    <strong className="block text-[14px] text-[#13202B] font-bold">{newAttachment.name}</strong>

                    <span className="text-[12px] text-[#0F766E]">
                      {formatFileSize(newAttachment.size)} · 새 첨부파일
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[12px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
                    onClick={handleFileSelect}
                    disabled={loading}
                    style={{ textDecoration: "none" }}
                  >
                    다시 변경
                  </button>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[12px] font-bold rounded-[6px] hover:bg-rose-50 cursor-pointer no-underline"
                    onClick={handleNewAttachmentDelete}
                    disabled={loading}
                    style={{ textDecoration: "none" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}

            {/* 첨부파일이 없는 경우 */}
            {!currentAttachment && !newAttachment && !attachmentDeleted && (
              <div className="flex items-center justify-between p-3.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px]">
                <span className="text-[13px] text-[#6B7280]">첨부된 파일이 없습니다.</span>

                <button
                  type="button"
                  className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[12px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
                  onClick={handleFileSelect}
                  disabled={loading}
                  style={{ textDecoration: "none" }}
                >
                  파일 선택
                </button>
              </div>
            )}

            <small className="block text-[12px] text-[#6B7280]">
              최대 10MB까지 선택할 수 있습니다. (JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, TXT)
            </small>

            {/* 새 파일 변경 취소 */}
            {newAttachment && currentAttachment && (
              <button
                type="button"
                className="mt-1 text-[12px] text-[#0F8AA8] font-bold hover:underline cursor-pointer bg-transparent border-none p-0 no-underline"
                onClick={handleAttachmentChangeCancel}
                disabled={loading}
                style={{ textDecoration: "none" }}
              >
                기존 첨부파일로 되돌리기
              </button>
            )}
          </div>

          {/* 안내 문구 */}
          <div className="flex items-center gap-2 p-3.5 bg-[#EBF5F8] rounded-[8px] text-[13px] text-[#0F766E]">
            <span>💡</span>

            <p>본인이 작성한 게시글만 수정할 수 있습니다.</p>

          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE8ED]">
            <button
              type="button"
              className="px-6 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] rounded-[7px] text-[14px] font-bold hover:bg-[#EBF5F8] cursor-pointer no-underline"
              onClick={() => navigate(`/qna/${post.id}`)}
              disabled={loading}
              style={{ textDecoration: "none" }}
            >
              취소
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer no-underline"
              disabled={loading}

              style={{ textDecoration: "none" }}
            >
              {loading ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QnaEditPage;

