import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";


import apiMiddleware from "@/api/middleware";
import { getLoginUser } from "@/features/auth/utils/auth";

/* Q&A 상세 응답 타입 */


interface QnaDetailResponse {
  id: number;

  writerLoginId?: string | null;
  writerName?: string | null;

  title: string;

  /* 백엔드 QnaDetailResponse의 질문 본문 */

  questionContent?: string | null;

  /* 기존 프론트와의 호환 */

  content?: string | null;

  /* 답변 */

  answerContent?: string | null;
  answerAdminName?: string | null;

  answer?: string | null;

  /* 답변 상태 */

  answerStatus?: string | null;

  /* 첨부파일 */

  attachPath?: string | null;
  attachName?: string | null;

  attachmentAvailable?: boolean;

  attachmentUrl?: string | null;
  fileUrl?: string | null;

  originalFileName?: string | null;
  fileName?: string | null;

  /* 조회수 */

  viewCount?: number;
  views?: number;

  /* 공개 여부 */

  publicQuestion?: boolean;
  isPublic?: boolean;

  /* 날짜 */

  createdAt?: string | null;
  updatedAt?: string | null;
  answeredAt?: string | null;
}

/* 로그인 사용자 타입 */

interface LoginUser {
  id?: number | string;
  userId?: string;
  loginId?: string;
  memberId?: number | string;
  name?: string;
  username?: string;
  role?: string;
  authority?: string;
  authorities?: string[];
}

/* 로그인 사용자 ID 추출 */

const getLoginUserId = (user: LoginUser | null): string => {
  if (!user) {
    return "";
  }

  if (user.loginId !== undefined && user.loginId !== null) {
    return String(user.loginId);
  }

  if (user.userId !== undefined && user.userId !== null) {
    return String(user.userId);
  }

  return "";
};

/* 게시글 작성자 로그인 ID 추출 */

const getPostWriterId = (post: QnaDetailResponse | null): string => {
  if (!post) {
    return "";
  }

  if (post.writerLoginId !== undefined && post.writerLoginId !== null) {
    return String(post.writerLoginId);
  }

  return "";
};

/* 날짜 표시 */

const formatDate = (dateString?: string | null): string => {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* 공개 여부 확인 */

const isPublicPost = (post: QnaDetailResponse): boolean => {
  if (typeof post.publicQuestion === "boolean") {
    return post.publicQuestion;
  }

  if (typeof post.isPublic === "boolean") {
    return post.isPublic;
  }

  return true;
};

/* 조회수 표시 */

const getViewCount = (post: QnaDetailResponse): number => {
  if (typeof post.viewCount === "number") {
    return post.viewCount;
  }

  if (typeof post.views === "number") {
    return post.views;
  }

  return 0;
};

/* 질문 본문 추출 */

const getQuestionContent = (post: QnaDetailResponse): string => {
  if (post.questionContent !== undefined && post.questionContent !== null) {
    return post.questionContent;
  }

  if (post.content !== undefined && post.content !== null) {
    return post.content;
  }

  return "";
};

/* 첨부파일 URL 추출 */

const getAttachmentUrl = (post: QnaDetailResponse): string => {
  return post.attachmentUrl || post.fileUrl || post.attachPath || "";
};

/* 첨부파일 이름 추출 */

const getAttachmentName = (post: QnaDetailResponse): string => {
  return (
    post.originalFileName || post.fileName || post.attachName || "첨부파일"
  );
};

/* QnaDetailPage */

function QnaDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams<{ id: string }>();

  const [post, setPost] = useState<QnaDetailResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [isMyPost, setIsMyPost] = useState(false);

  const currentUser = getLoginUser();
  const isAdmin = useMemo(() => {
    if (!currentUser?.role) return false;
    const role = currentUser.role.toUpperCase();
    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [currentUser]);

  /* 게시글 상세 조회 */

  useEffect(() => {
    const fetchQnaDetail = async () => {
      if (!id) {
        setErrorMessage("잘못된 게시글 번호입니다.");

        setIsLoading(false);

        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        /* 현재 로그인 사용자 확인 */

        const currentUser = getLoginUser();


        /*

          상세 조회 권한은 백엔드에서 판단한다.

          GET /api/qnas/{id}

          QnaController
          -> qnaService.getQna(id, principal.memberId())

          QnaService
          -> qnaQueryRepository.incrementViewCount(id, userId)
          -> qnaQueryRepository.findAccessibleById(id, userId)

          따라서 프론트에서는
          비공개 여부를 가지고 다시 접근을 차단하지 않는다.

          백엔드가 200을 반환하면
          해당 게시글을 정상적으로 표시한다.
        */

        const response = await apiMiddleware.get<QnaDetailResponse>(
          `/api/qnas/${id}`,
        );

        const detail = response.data;

        console.log("[QnaDetailPage] 상세 게시글:", detail);

        /*

          본인 여부는 접근 권한 판단이 아니라
          수정 / 삭제 버튼 표시를 위해서만 사용한다.
        */

        const currentUserId = getLoginUserId(currentUser);

        const writerId = getPostWriterId(detail);

        const mine =
          Boolean(currentUserId) &&
          Boolean(writerId) &&
          currentUserId === writerId;

        console.log("[QnaDetailPage] 현재 사용자 ID:", currentUserId);

        console.log("[QnaDetailPage] 게시글 작성자 ID:", writerId);

        console.log("[QnaDetailPage] 내 글 여부:", mine);

        setIsMyPost(mine);

        const isSecret = !isPublicPost(detail);
        if (isSecret && !mine && !isAdmin) {
          setErrorMessage("작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다.");
          return;
        }

        setPost(detail);
      } catch (error) {
        console.error("[QnaDetailPage] 게시글 상세 조회 실패:", error);

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          /* 로그인되지 않은 경우 */

          if (status === 401) {
            setErrorMessage("로그인이 필요합니다.");

            return;
          }

          /* 권한 없음 */

          if (status === 403) {
            setErrorMessage("이 게시글을 확인할 권한이 없습니다.");

            return;
          }

          /*
            백엔드의 findAccessibleById()에서
            접근할 수 없는 비공개 글도
            결과가 없으면 QnaNotFoundException이 발생한다.

            따라서 404는
            존재하지 않거나 접근할 수 없는 글로 처리한다.
          */

          if (status === 404) {
            /* localStorage 폴백: 백엔드에 없는 로컬 게시글 조회 */
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
                  publicQuestion?: boolean;
                  isPublic?: boolean;
                }>;
                console.log("[QnaDetailPage] localStorage 폴백 시도, id:", id, "posts count:", localPosts.length);
                const localPost = localPosts.find(
                  (p) => String(p.id) === String(id),
                );
                if (localPost) {
                  console.log("[QnaDetailPage] localStorage에서 게시글 발견:", localPost);
                  const localCurrentUser = getLoginUser();
                  const localCurrentUserId = getLoginUserId(localCurrentUser);
                  const localMine =
                    Boolean(localCurrentUserId) &&
                    Boolean(localPost.authorId) &&
                    localCurrentUserId === localPost.authorId;
                  const localAdmin = Boolean(
                    localCurrentUser?.role &&
                      (localCurrentUser.role.toUpperCase() === "ADMIN" ||
                        localCurrentUser.role.toUpperCase() === "ROLE_ADMIN"),
                  );

                  const isLocalSecret =
                    localPost.publicQuestion === false || localPost.isPublic === false;

                  if (isLocalSecret && !localMine && !localAdmin) {
                    setErrorMessage("작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다.");
                    return;
                  }

                  setPost({
                    id: localPost.id,
                    writerLoginId: localPost.authorId,
                    writerName: localPost.author,
                    title: localPost.title ?? "",
                    content: localPost.content,
                    questionContent: localPost.content,
                    answer: localPost.answer,
                    views: localPost.views,
                    createdAt: localPost.date,
                    publicQuestion: !isLocalSecret,
                  });
                  setIsMyPost(localMine);
                  return;
                }
              } catch {
                /* 파싱 실패 시 원래 에러 메시지 표시 */
              }
            }

            setErrorMessage("존재하지 않거나 확인할 수 없는 게시글입니다.");

            return;
          }

          /* 기타 서버 오류 */

          setErrorMessage(
            error.response?.data?.message ||
              "게시글을 불러오는 중 오류가 발생했습니다.",
          );

          return;
        }

        setErrorMessage("게시글을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQnaDetail();
  }, [id, isAdmin]);

  /* 목록으로 이동 */

  const handleBack = () => {
    // 1. sessionStorage에 저장된 최근 쿼리 스트링(검색어, 검색 조건, 페이지 번호)이 있으면 복원
    const lastQuery = sessionStorage.getItem("qna_last_query");
    if (lastQuery) {
      navigate(`/qna?${lastQuery}`);
      return;
    }

    // 2. location.state에 전달된 이전 페이지 정보가 있는 경우
    const fromPage = (location.state as { fromPage?: number })?.fromPage;
    if (fromPage && fromPage > 1) {
      navigate(`/qna?page=${fromPage}`);
      return;
    }

    // 3. 기본 Q&A 목록으로 이동
    navigate("/qna");
  };

  /* 수정 */

  const handleEdit = () => {
    if (!post) {
      return;
    }

    if (!isMyPost) {
      alert("수정 권한이 없습니다.");

      return;
    }

    navigate(`/qna/${post.id}/edit`);
  };

  /* 삭제 */

  const handleDelete = async () => {
    if (!post) {
      return;
    }

    if (!isMyPost) {
      alert("삭제 권한이 없습니다.");

      return;
    }

    const confirmed = window.confirm("정말 삭제하시겠습니까?");

    if (!confirmed) {
      return;
    }

    try {
      await apiMiddleware.delete(`/api/qnas/${post.id}`);

      alert("게시글이 삭제되었습니다.");

      navigate("/qna");
    } catch (error) {
      console.error("[QnaDetailPage] 게시글 삭제 실패:", error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          alert("로그인이 필요합니다.");

          navigate("/login");

          return;
        }

        if (status === 403) {
          alert("삭제 권한이 없습니다.");

          return;
        }

        /* localStorage 폴백: 백엔드에 없는 게시글 삭제 */
        if (status === 404) {
          const stored = localStorage.getItem("qnaPosts");
          if (stored) {
            try {
              const localPosts = JSON.parse(stored) as Array<{ id: number }>;
              const remaining = localPosts.filter(
                (p) => String(p.id) !== String(post.id),
              );
              localStorage.setItem("qnaPosts", JSON.stringify(remaining));
            } catch {
              /* 파싱 실패 무시 */
            }
          }
          alert("게시글이 삭제되었습니다.");
          navigate("/qna");
          return;
        }

        alert(error.response?.data?.message || "게시글 삭제에 실패했습니다.");

        return;
      }

      alert("게시글 삭제에 실패했습니다.");
    }
  };

  /* 로딩 */

  /* 로딩 */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center p-16 text-[#8a9388] text-[14px]">
          게시글을 불러오는 중입니다...
        </div>
      </div>
    );
  }

  /* 오류 */

  if (errorMessage || !post) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            CUSTOMER CENTER
          </span>
          <h2 className="text-[28px] font-black text-[#13202B]">게시글을 확인할 수 없습니다.</h2>
          <p className="text-[15px] text-[#6B7280]">{errorMessage || "게시글 정보가 존재하지 않습니다."}</p>
          <div className="pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer no-underline"
              onClick={handleBack}
              style={{ textDecoration: "none" }}
            >
              Q&A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 첨부파일 */

  const attachmentUrl = getAttachmentUrl(post);

  const attachmentName = getAttachmentName(post);

  const hasAttachment = Boolean(
    post.attachmentAvailable ||
    attachmentUrl ||
    post.originalFileName ||
    post.fileName ||
    attachmentName,
  );

  /* 상세 화면 */

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 상단 서브 헤더 */}

        <div className="flex items-center justify-between pb-4 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>

            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 상세</h1>

              {!isPublicPost(post) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  비공개
                </span>
              )}

              {post.answerStatus && (
                <span
                  className={
                    post.answerStatus.includes("완료")
                      ? "px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]"
                      : "px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]"
                  }
                >
                  {post.answerStatus}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMyPost && (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[13px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
                  style={{ textDecoration: "none" }}
                >
                  수정
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[13px] font-bold rounded-[6px] hover:bg-rose-50 cursor-pointer no-underline"
                  style={{ textDecoration: "none" }}
                >
                  삭제
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-1.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[13px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
              style={{ textDecoration: "none" }}
            >
              목록
            </button>
          </div>
        </div>

        {/* 게시글 본문 카드리뉴얼 */}

        <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm">
          {/* 제목 */}

          <h2 className="text-[22px] font-bold text-[#13202B] border-b border-[#DCE8ED] pb-4">
            {post.title}
          </h2>

          {/* 메타 정보 */}

          <div className="flex flex-wrap items-center gap-6 text-[13px] text-[#6B7280] bg-[#F5FAFC] p-3.5 rounded-[8px]">
            <div>
              <span className="font-bold text-[#13202B] mr-2">작성자</span>

              <span>{post.writerName || post.writerLoginId || "-"}</span>
            </div>

            <div>
              <span className="font-bold text-[#13202B] mr-2">작성일</span>

              <span>{formatDate(post.createdAt)}</span>
            </div>

            <div>
              <span className="font-bold text-[#13202B] mr-2">조회수</span>

              <span>{getViewCount(post)}</span>
            </div>
          </div>

          {/* 질문 본문 */}

          <article className="min-h-[160px] text-[15px] text-[#13202B] leading-relaxed whitespace-pre-wrap py-2">
            {getQuestionContent(post)}
          </article>

          {/* 첨부파일 */}

          {hasAttachment && (
            <div className="pt-4 border-t border-[#DCE8ED] flex items-center gap-3 text-[14px]">
              <span className="font-bold text-[#13202B]">📎 첨부파일</span>

              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0F8AA8] hover:underline font-medium no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {attachmentName}
                </a>
              ) : (
                <span className="text-[#6B7280]">{attachmentName}</span>
              )}
            </div>
          )}

          {/* 답변 */}

          {post.answer || post.answerContent ? (
            <section className="mt-8 p-5 bg-[#EBF5F8] border border-[#7CC9D8] rounded-[10px] space-y-3">
              <div className="flex items-center justify-between border-b border-[#7CC9D8] pb-2">
                <h3 className="text-[16px] font-bold text-[#0B5E73] flex items-center gap-2">
                  <span>↳</span> 답변
                </h3>

                {post.answeredAt && (
                  <span className="text-[12px] text-[#6B7280]">
                    {formatDate(post.answeredAt)}
                  </span>
                )}
              </div>

              <div className="text-[14px] text-[#13202B] leading-relaxed whitespace-pre-wrap pt-1">
                {post.answer || post.answerContent}
              </div>
            </section>
          ) : (
            <section className="mt-8 p-5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px] space-y-2">
              <div className="flex items-center gap-2 text-[#0B5E73] font-bold text-[14px]">
                <span className="text-[11px] text-[#6B7280] font-semibold">↳</span>
                <span className="inline-block px-2 py-0.5 rounded bg-[#F5FAFC] border border-[#DCE8ED] text-[#6B7280] text-[11px] font-extrabold">
                  답변 대기
                </span>
                <span>답변을 기다리는 중입니다.</span>
              </div>
              <p className="text-[13px] text-[#6B7280] pl-5">
                관리자가 문의 내용을 확인한 후 답변을 등록할 예정입니다.
              </p>
            </section>
          )}

        </div>

        {/* 하단 버튼 */}

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer no-underline"
            onClick={handleBack}
            style={{ textDecoration: "none" }}
          >
            목록으로
          </button>


          {isMyPost && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="px-5 py-2.5 bg-[#0F8AA8] text-white text-[14px] font-bold rounded-[7px] hover:bg-[#0B5E73] cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                수정
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 text-[14px] font-bold rounded-[7px] hover:bg-rose-50 cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                삭제
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default QnaDetailPage;

