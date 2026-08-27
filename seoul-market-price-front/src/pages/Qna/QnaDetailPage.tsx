import { useMemo } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Download, FileText } from "lucide-react";

import apiMiddleware from "@/api/middleware";
import { getLoginUser } from "@/features/auth/utils/auth";
import {
  downloadQnaAttachmentApi,
} from "@/api/api";
import type { AttachmentResponse } from "@/features/board/types/board.types";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";

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
  attachments?: AttachmentResponse[] | null;
  files?: Array<{ id?: number; name?: string; size?: number; url?: string }> | null;
  attachedFiles?: Array<{ id?: number; name?: string; size?: number; url?: string }> | null;
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
interface QnaFullDetailResponse {
  detail: QnaDetailResponse;
  attachments: AttachmentResponse[];
}

async function fetchQnaDetailApi(id: string): Promise<QnaFullDetailResponse> {
  try {
    const response = await apiMiddleware.get<QnaFullDetailResponse>(`/api/qnas/${id}/full`);
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
        attachName?: string;
        attachPath?: string;
        files?: Array<{ id?: number; name?: string; size?: number; url?: string }>;
        attachments?: AttachmentResponse[];
      }>;
      const found = localPosts.find((p) => String(p.id) === String(id));
      if (found) {
        return { detail: {
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
          attachName: found.attachName,
          attachPath: found.attachPath,
          files: found.files,
          attachments: found.attachments,
        }, attachments: found.attachments || [] };
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
  const isAdmin = useMemo(() => {
    const role = currentUser?.role?.toUpperCase();
    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [currentUser]);

  /* React Query: Q&A 상세 데이터 조회 */
  const { data: fullDetail, isLoading, isError, error } = useQuery({
    queryKey: ["qnaDetail", id],
    queryFn: () => {
      if (!id) throw new Error("잘못된 게시글 번호입니다.");
      return fetchQnaDetailApi(id);
    },
    enabled: !!id,
    retry: 1,
  });

  /* React Query: Q&A 첨부파일 목록 조회 */
  const post = fullDetail?.detail;
  const apiAttachments = fullDetail?.attachments ?? [];

  /* 첨부파일 통합 계산 (API 첨부파일 + 본문 내 첨부파일 필드 + 로컬 스토리지) */
  const allAttachments = useMemo(() => {
    const list: Array<{
      id?: number;
      name: string;
      size?: number;
      url?: string;
    }> = [];

    // 1. 첨부파일 전용 API 결과
    if (Array.isArray(apiAttachments) && apiAttachments.length > 0) {
      apiAttachments.forEach((att, idx) => {
        const attObj = att as {
          id?: number;
          attachmentId?: number;
          originalName?: string;
          originalFilename?: string;
          fileName?: string;
          name?: string;
          size?: number;
          fileSize?: number;
          downloadUrl?: string;
          fileUrl?: string;
        };
        list.push({
          id: attObj.id ?? attObj.attachmentId ?? idx + 1,
          name:
            attObj.originalName ||
            attObj.originalFilename ||
            attObj.fileName ||
            attObj.name ||
            "첨부파일",
          size: attObj.fileSize ?? attObj.size,
          url: attObj.downloadUrl || attObj.fileUrl,
        });
      });
    }

    // 2. 게시글 객체 내 파일 배열 (attachments / files / attachedFiles / fileList / attachmentList)
    const postFiles =
      post?.attachments ||
      post?.files ||
      post?.attachedFiles ||
      (post as { fileList?: unknown[] })?.fileList ||
      (post as { attachmentList?: unknown[] })?.attachmentList;

    if (Array.isArray(postFiles) && postFiles.length > 0) {
      postFiles.forEach((f: unknown, idx: number) => {
        const fileObj = f as {
          id?: number;
          attachmentId?: number;
          originalFileName?: string;
          originalFilename?: string;
          fileName?: string;
          name?: string;
          fileSize?: number;
          size?: number;
          fileUrl?: string;
          url?: string;
          downloadUrl?: string;
          attachPath?: string;
        };
        const name =
          fileObj.originalFileName ||
          fileObj.originalFilename ||
          fileObj.fileName ||
          fileObj.name ||
          "첨부파일";
        if (!list.some((existing) => existing.name === name)) {
          list.push({
            id: fileObj.id ?? fileObj.attachmentId ?? idx,
            name,
            size: fileObj.size ?? fileObj.fileSize,
            url:
              fileObj.downloadUrl ||
              fileObj.fileUrl ||
              fileObj.url ||
              fileObj.attachPath,
          });
        }
      });
    }

    // 3. 단일 첨부파일 필드 (attachName, attachPath, originalFileName, attachmentUrl, fileUrl)
    const singleName =
      post?.originalFileName || post?.fileName || post?.attachName;
    const singleUrl =
      post?.attachmentUrl || post?.fileUrl || post?.attachPath;

    if (singleName && !list.some((existing) => existing.name === singleName)) {
      list.push({
        id: 1,
        name: singleName,
        size:
          (post as { fileSize?: number; size?: number })?.fileSize ??
          (post as { fileSize?: number; size?: number })?.size,
        url: singleUrl || undefined,
      });
    } else if (!singleName && singleUrl && list.length === 0) {
      list.push({
        id: 1,
        name: "첨부파일",
        url: singleUrl,
      });
    }

    // 4. 로컬 스토리지 데이터 병합 (서버 응답 누락 대비)
    if (list.length === 0 && id) {
      try {
        const stored = localStorage.getItem("qnaPosts");
        if (stored) {
          const localPosts = JSON.parse(stored) as Array<{
            id: number | string;
            title?: string;
            files?: Array<{ id?: number; name?: string; size?: number; url?: string }>;
            attachName?: string;
            attachPath?: string;
          }>;
          const match = localPosts.find(
            (p) => String(p.id) === String(id) || (post?.title && p.title === post.title),
          );
          if (match) {
            if (Array.isArray(match.files)) {
              match.files.forEach((lf, idx) => {
                if (lf.name && !list.some((e) => e.name === lf.name)) {
                  list.push({
                    id: lf.id ?? idx + 1,
                    name: lf.name,
                    size: lf.size,
                    url: lf.url,
                  });
                }
              });
            }
            if (match.attachName && !list.some((e) => e.name === match.attachName)) {
              list.push({
                id: 1,
                name: match.attachName,
                url: match.attachPath,
              });
            }
          }
        }
      } catch {
        /* 무시 */
      }
    }

    return list;
  }, [apiAttachments, post, id]);

  // 첨부파일 다운로드 핸들러
  const handleDownload = async (attachment: {
    id?: number;
    name: string;
    url?: string;
  }) => {
    try {
      if (id && attachment.id) {
        // 1. JSON 형태의 presigned URL 다운로드 시도
        try {
          const res = await downloadQnaAttachmentApi(
            Number(id),
            Number(attachment.id),
          );
          const downloadLink =
            (res as { downloadUrl?: string; url?: string; fileUrl?: string })?.downloadUrl ||
            (res as { downloadUrl?: string; url?: string; fileUrl?: string })?.url ||
            (res as { downloadUrl?: string; url?: string; fileUrl?: string })?.fileUrl ||
            (typeof res === "string" ? res : null);

          if (downloadLink) {
            const a = document.createElement("a");
            a.href = downloadLink;
            a.download = (res as { originalFilename?: string })?.originalFilename || attachment.name || "download";
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }
        } catch (apiErr) {
          console.warn("Pre-signed URL 다운로드 실패, 파일 스트림(Blob) 다운로드 시도:", apiErr);
        }

        // 2. 컨트롤러가 파일 바이너리(Blob/Resource)를 직접 반환하는 경우
        try {
          const blobResponse = await apiMiddleware.get(
            `/api/qnas/${id}/attachments/${attachment.id}/download`,
            { responseType: "blob" },
          );
          if (blobResponse.data) {
            const blobUrl = window.URL.createObjectURL(new Blob([blobResponse.data]));
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = attachment.name || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        } catch (blobErr) {
          console.warn("Blob 다운로드 실패:", blobErr);
        }
      }

      // 3. 첨부파일 객체에 직접 url이 있는 경우
      if (attachment.url) {
        const a = document.createElement("a");
        a.href = attachment.url;
        a.download = attachment.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      alert("다운로드 링크를 찾을 수 없습니다.");
    } catch (err) {
      console.error("다운로드 실패:", err);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  /* 권한 검사 */
  const isMyPost = useMemo(() => {
    if (!post) return false;
    if (isAdmin) return true;

    const u = currentUser;
    if (!u) return false;

    const userIdentifiers = [
      u.userId,
      u.name,
      (u as { loginId?: string }).loginId,
      (u as { id?: string | number }).id,
    ].filter(Boolean).map(String);

    const postWriters = [
      post.writerLoginId,
      post.writerName,
      (post as { authorId?: string | number }).authorId,
      (post as { author?: string }).author,
      (post as { writerId?: string | number }).writerId,
      (post as { userId?: string | number }).userId,
    ].filter(Boolean).map(String);

    let localMatch = false;
    try {
      const stored = localStorage.getItem("qnaPosts");
      if (stored && id) {
        const localPosts = JSON.parse(stored) as Array<{ id: number | string; authorId?: string }>;
        const found = localPosts.find((p) => String(p.id) === String(id));
        if (found) localMatch = true;
      }
    } catch {
      /* 무시 */
    }

    const directMatch = userIdentifiers.some((uid) => postWriters.includes(uid));

    return directMatch || localMatch;
  }, [post, currentUser, isAdmin, id]);

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
      <SectionSidebarLayout
        sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
        menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
      >
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8 text-center text-[#6B7280]">
        게시글을 불러오는 중입니다...
      </div>
      </SectionSidebarLayout>
    );
  }

  if (isError || !post || isSecretUnauthorized) {
    const errorMessage = isSecretUnauthorized
      ? "작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다."
      : (error instanceof Error ? error.message : "게시글을 불러올 수 없습니다.");

    return (
      <SectionSidebarLayout
        sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
        menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
      >
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
      </SectionSidebarLayout>
    );
  }

  return (
    <SectionSidebarLayout
      sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
      menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
    >
    <div className="flex min-h-[calc(100vh-200px)] w-full justify-center bg-[#F5FAFC] px-4 py-8 md:px-8 md:py-12">
      <div className="w-full max-w-4xl space-y-8">
        {/* 상단 헤더 (가운데 정렬) */}
        <div className="text-center pb-6 border-b border-[#DCE8ED]">
          <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
            CUSTOMER CENTER
          </span>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 상세</h1>
            {!isPublic && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                비공개
              </span>
            )}
          </div>
        </div>

        {/* 게시글 본문 카드 */}
        <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-4 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE8ED] pb-4">
            <h2 className="text-[18px] sm:text-[22px] font-bold text-[#13202B]">
              {post.title}
            </h2>
            {isMyPost && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-3 py-1.5 bg-[#0F8AA8] text-white text-[12px] sm:text-[13px] font-bold rounded-[6px] hover:bg-[#0B5E73] cursor-pointer"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-[12px] sm:text-[13px] font-bold rounded-[6px] hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                </button>
              </div>
            )}
          </div>

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

          {/* 첨부파일 목록 */}
          {allAttachments.length > 0 && (
            <div className="pt-4 border-t border-[#DCE8ED] space-y-2.5">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0B5E73]">
                <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
                <span>첨부파일 ({allAttachments.length}개)</span>
              </div>
              <div className="space-y-2">
                {allAttachments.map((file, idx) => {
                  const fileSize = file.size ?? 0;
                  return (
                    <div
                      key={`qna-att-${file.id ?? idx}`}
                      className="flex items-center justify-between p-3 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px] text-[13px] gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#0F8AA8] shrink-0" />
                        <span className="font-semibold text-[#13202B] truncate">
                          {file.name}
                        </span>
                        {fileSize > 0 && (
                          <span className="text-[11px] text-[#6B7280] shrink-0">
                            ({(fileSize / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[12px] font-bold rounded-[6px] transition-colors cursor-pointer shrink-0 shadow-xs border-none"
                      >
                        <Download className="w-3.5 h-3.5" /> 다운로드
                      </button>
                    </div>
                  );
                })}
              </div>
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
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 pt-2">
          <button
            type="button"
            className="px-4 sm:px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[13px] sm:text-[14px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer"
            onClick={handleBack}
          >
            목록으로
          </button>

          {isMyPost && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 sm:px-5 py-2.5 bg-[#0F8AA8] text-white text-[13px] sm:text-[14px] font-bold rounded-[7px] hover:bg-[#0B5E73] cursor-pointer"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 sm:px-5 py-2.5 bg-white border border-rose-200 text-rose-600 text-[13px] sm:text-[14px] font-bold rounded-[7px] hover:bg-rose-50 cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </SectionSidebarLayout>
  );
}
