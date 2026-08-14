import { useMemo } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import apiMiddleware from "@/api/middleware";
import { getLoginUser } from "@/features/auth/utils/auth";

/* 타입 정의 */
interface QnaDetailResponse {
  id: number;
  writerLoginId?: string | null;
  writerName?: string | null;
  title: string;
  questionContent?: string | null;
  content?: string | null;
  answerContent?: string | null;
  answer?: string | null;
  answerStatus?: string | null;
  attachPath?: string | null;
  attachName?: string | null;
  attachmentUrl?: string | null;
  fileUrl?: string | null;
  originalFileName?: string | null;
  fileName?: string | null;
  viewCount?: number;
  views?: number;
  publicQuestion?: boolean;
  isPublic?: boolean;
  createdAt?: string | null;
  answeredAt?: string | null;
}

/* 날짜 포맷 함수 */
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* API 연동 함수: Q&A 상세 조회 */
async function fetchQnaDetailApi(id: string): Promise<QnaDetailResponse> {
  try {
    const response = await apiMiddleware.get<QnaDetailResponse>(`/api/qnas/${id}`);
    if (response.data) return response.data;
  } catch (err) {
    const stored = localStorage.getItem("qnaPosts");
    if (stored) {
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
      const found = localPosts.find((p) => String(p.id) === String(id));
      if (found) {
        return {
          id: found.id,
          writerLoginId: found.authorId,
          writerName: found.author,
          title: found.title ?? "",
          content: found.content,
          questionContent: found.content,
          answer: found.answer,
          views: found.views,
          createdAt: found.date,
          publicQuestion: found.publicQuestion ?? found.isPublic ?? true,
        };
      }
    }
    throw err;
  }
  throw new Error("게시글을 찾을 수 없습니다.");
}

/* API 연동 함수: Q&A 삭제 */
async function deleteQnaApi(id: number): Promise<void> {
  try {
    await apiMiddleware.delete(`/api/qnas/${id}`);
  } catch (err) {
    const stored = localStorage.getItem("qnaPosts");
    if (stored) {
      const localPosts = JSON.parse(stored) as Array<{ id: number }>;
      const remaining = localPosts.filter((p) => String(p.id) !== String(id));
      localStorage.setItem("qnaPosts", JSON.stringify(remaining));
      return;
    }
    throw err;
  }
}

/* 메인 컴포넌트 */
export default function QnaDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  /* 로그인 및 권한 정보 */
  const currentUser = getLoginUser();
  const currentUserId = currentUser?.userId || "";
  const isAdmin = useMemo(() => {
    const role = currentUser?.role?.toUpperCase();
    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [currentUser]);

  /* React Query: Q&A 상세 데이터 조회 */
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["qnaDetail", id],
    queryFn: () => {
      if (!id) throw new Error("잘못된 게시글 번호입니다.");
      return fetchQnaDetailApi(id);
    },
    enabled: !!id,
    retry: 1,
  });

  /* 권한 검사 */
  const isMyPost = useMemo(() => {
    if (!post || !currentUserId) return false;
    return String(currentUserId) === String(post.writerLoginId || "");
  }, [post, currentUserId]);

  const isPublic = post?.publicQuestion ?? post?.isPublic ?? true;
  const isSecretUnauthorized = !isPublic && !isMyPost && !isAdmin;

  /* React Query: Q&A 삭제 뮤테이션 */
  const deleteMutation = useMutation({
    mutationFn: (postId: number) => deleteQnaApi(postId),
    onSuccess: () => {
      alert("게시글이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      navigate("/qna");
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) return navigate("/login");
        if (err.response?.status === 403) return alert("삭제 권한이 없습니다.");
      }
      alert("게시글 삭제에 실패했습니다.");
    },
  });

  /* 이벤트 핸들러 */
  const handleBack = () => {
    const lastQuery = sessionStorage.getItem("qna_last_query");
    if (lastQuery) return navigate(`/qna?${lastQuery}`);
    const fromPage = (location.state as { fromPage?: number })?.fromPage;
    if (fromPage && fromPage > 1) return navigate(`/qna?page=${fromPage}`);
    navigate("/qna");
  };

  const handleEdit = () => {
    if (!post || !isMyPost) return alert("수정 권한이 없습니다.");
    navigate(`/qna/${post.id}/edit`);
  };

  const handleDelete = () => {
    if (!post || !isMyPost) return alert("삭제 권한이 없습니다.");
    if (window.confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate(post.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8 text-center text-[#6B7280]">
        게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (isError || !post || isSecretUnauthorized) {
    const errorMessage = isSecretUnauthorized
      ? "작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다."
      : (error instanceof Error ? error.message : "게시글을 불러올 수 없습니다.");

    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            CUSTOMER CENTER
          </span>
          <h2 className="text-[28px] font-black text-[#13202B]">게시글을 확인할 수 없습니다.</h2>
          <p className="text-[15px] text-[#6B7280]">{errorMessage}</p>
          <div className="pt-4">
            <button
              type="button"
              className="px-5 py-2.5 bg-[#0F8AA8] text-white rounded-[7px] text-[14px] font-bold hover:bg-[#0B5E73] cursor-pointer"
              onClick={handleBack}
            >
              Q&amp;A 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  const attachmentUrl = post.attachmentUrl || post.fileUrl || post.attachPath || "";
  const attachmentName = post.originalFileName || post.fileName || post.attachName || "첨부파일";
  const hasAttachment = Boolean(attachmentUrl || post.attachName);

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 상세</h1>
              {!isPublic && (
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
                  className="px-3 py-1.5 bg-white border border-[#DCE8ED] text-[#0F8AA8] text-[13px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[13px] font-bold rounded-[6px] hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-1.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[13px] font-bold rounded-[6px] hover:bg-[#EBF5F8] cursor-pointer"
            >
              목록
            </button>
          </div>
        </div>

        {/* 게시글 본문 카드 */}
        <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-6 md:p-8 space-y-6 shadow-sm">
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
              <span>{post.viewCount ?? post.views ?? 0}</span>
            </div>
          </div>

          {/* 질문 본문 */}
          <article className="min-h-[160px] text-[15px] text-[#13202B] leading-relaxed whitespace-pre-wrap py-2">
            {post.questionContent || post.content}
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
                  className="text-[#0F8AA8] hover:underline font-medium"
                >
                  {attachmentName}
                </a>
              ) : (
                <span className="text-[#6B7280]">{attachmentName}</span>
              )}
            </div>
          )}

          {/* 답변 영역 */}
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

        {/* 하단 액션 버튼 */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer"
            onClick={handleBack}
          >
            목록으로
          </button>

          {isMyPost && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="px-5 py-2.5 bg-[#0F8AA8] text-white text-[14px] font-bold rounded-[7px] hover:bg-[#0B5E73] cursor-pointer"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 text-[14px] font-bold rounded-[7px] hover:bg-rose-50 cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
