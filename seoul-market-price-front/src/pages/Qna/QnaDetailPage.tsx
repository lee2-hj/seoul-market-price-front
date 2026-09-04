import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Download, FileText } from "lucide-react";
import apiMiddleware from "@/api/middleware";
import { getLoginUser } from "@/features/auth/utils/auth";
import { downloadQnaAttachmentApi } from "@/api/api";
import type { AttachmentResponse } from "@/features/board/types/board.types";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";
import { cn } from "@/lib/utils";

/* 1. 타입 및 인터페이스 정의 */
interface QnaDetailResponse {
  id: number; writerLoginId?: string | null; writerName?: string | null; title: string;
  questionContent?: string | null; content?: string | null; answerContent?: string | null;
  answer?: string | null; answerStatus?: string | null; attachPath?: string | null;
  attachName?: string | null; attachmentUrl?: string | null; fileUrl?: string | null;
  originalFileName?: string | null; fileName?: string | null; viewCount?: number; views?: number;
  publicQuestion?: boolean; isPublic?: boolean; createdAt?: string | null; answeredAt?: string | null;
  attachments?: AttachmentResponse[] | null; files?: Array<{ id?: number; name?: string; size?: number; url?: string }> | null;
  attachedFiles?: Array<{ id?: number; name?: string; size?: number; url?: string }> | null;
}

interface QnaFullDetailResponse { detail: QnaDetailResponse; attachments: AttachmentResponse[]; }

/* 2. 날짜 포맷팅 헬퍼 함수 */
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

/* 3. API 요청 연동 함수 (백엔드 DB 연동) */
async function fetchQnaDetailApi(id: string): Promise<QnaFullDetailResponse> {
  const response = await apiMiddleware.get<QnaFullDetailResponse>(`/api/qnas/${id}/full`);
  if (response.data) return response.data;
  throw new Error("게시글을 찾을 수 없습니다.");
}

async function deleteQnaApi(id: number): Promise<void> {
  await apiMiddleware.delete(`/api/qnas/${id}`);
}

/* 4. 메인 QnA 상세 페이지 컴포넌트 */
export default function QnaDetailPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const currentUser = getLoginUser() as unknown as Record<string, unknown> | null;
  const isAdmin = useMemo(() => { const role = String(currentUser?.role || "").toUpperCase(); return role === "ADMIN" || role === "ROLE_ADMIN"; }, [currentUser]);

  const { data: fullDetail, isLoading, isError, error } = useQuery({
    queryKey: ["qnaDetail", id],
    queryFn: () => { if (!id) throw new Error("잘못된 게시글 번호입니다."); return fetchQnaDetailApi(id); },
    enabled: !!id, retry: 1,
  });

  const post = fullDetail?.detail;
  const rawAttachments = fullDetail?.attachments;

  const allAttachments = useMemo(() => {
    const list: Array<{ id?: number; name: string; size?: number; url?: string }> = [];
    if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
      rawAttachments.forEach((att: Record<string, unknown>, idx: number) => {
        list.push({
          id: Number(att.id ?? att.attachmentId ?? idx + 1),
          name: String(att.originalName || att.originalFilename || att.fileName || att.name || "첨부파일"),
          size: typeof att.fileSize === "number" ? att.fileSize : typeof att.size === "number" ? att.size : undefined,
          url: String(att.downloadUrl || att.fileUrl || ""),
        });
      });
    }
    const postRecord = post as unknown as Record<string, unknown> | undefined;
    const postFiles = (post?.attachments || post?.files || post?.attachedFiles || postRecord?.fileList || postRecord?.attachmentList) as unknown[] | undefined;
    if (Array.isArray(postFiles) && postFiles.length > 0) {
      postFiles.forEach((f: unknown, idx: number) => {
        const fileObj = f as Record<string, unknown>;
        const name = String(fileObj.originalFileName || fileObj.originalFilename || fileObj.fileName || fileObj.name || "첨부파일");
        if (!list.some((existing) => existing.name === name)) {
          list.push({
            id: Number(fileObj.id ?? fileObj.attachmentId ?? idx + 1),
            name,
            size: typeof fileObj.size === "number" ? fileObj.size : typeof fileObj.fileSize === "number" ? fileObj.fileSize : undefined,
            url: String(fileObj.downloadUrl || fileObj.fileUrl || fileObj.url || fileObj.attachPath || ""),
          });
        }
      });
    }
    const singleName = post?.originalFileName || post?.fileName || post?.attachName;
    const singleUrl = post?.attachmentUrl || post?.fileUrl || post?.attachPath;
    if (singleName && !list.some((existing) => existing.name === singleName)) list.push({ id: 1, name: singleName, url: singleUrl || undefined });
    return list;
  }, [rawAttachments, post]);

  const displayTitle = post?.title || "제목 없음";
  const displayAuthor = post?.writerName || post?.writerLoginId || "익명";
  const displayContent = post?.questionContent || post?.content || "내용이 없습니다.";
  const displayAnswer = post?.answerContent || post?.answer || "";
  const displayViews = post?.viewCount ?? post?.views ?? 0;
  const displayDate = formatDate(post?.createdAt);

  /* 작성자 본인 확인 (다양한 식별자 매칭) */
  const isMyPost = useMemo(() => {
    if (!currentUser || !post) return false;
    const userKeys = [
      currentUser.userId,
      currentUser.id,
      currentUser.email,
      currentUser.name,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());
    const postRecord = post as unknown as Record<string, unknown>;
    const postKeys = [
      post.writerLoginId,
      post.writerName,
      postRecord?.authorId,
      postRecord?.userId,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());
    return userKeys.some((uk) =>
      postKeys.some((pk) => uk === pk || uk.includes(pk) || pk.includes(uk)),
    );
  }, [currentUser, post]);

  const canEditOrDelete = isMyPost || isAdmin;

  const deleteMutation = useMutation({
    mutationFn: () => deleteQnaApi(Number(id)),
    onSuccess: () => {
      alert("문의글이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnas"] });
      navigate("/qna");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "삭제 중 오류가 발생했습니다.";
      alert(msg);
    },
  });

  const handleDelete = () => {
    if (window.confirm("정말 이 문의글을 삭제하시겠습니까?"))
      deleteMutation.mutate();
  };
  const handleEdit = () => {
    navigate(`/qna/${id}/edit`);
  };

  /* 첨부파일 다운로드 (DB 연동 API 호출) */
  const handleDownload = async (file: { id?: number; name: string; url?: string }) => {
    try {
      let downloadUrl = file.url;
      let downloadName = file.name || "download";

      if (id && file.id) {
        try {
          const res = await downloadQnaAttachmentApi(Number(id), Number(file.id));
          const returnedUrl = res?.url || (res as unknown as Record<string, string>)?.downloadUrl;
          if (returnedUrl) {
            downloadUrl = returnedUrl;
            downloadName = res.originalFilename || res.fileName || file.name || "download";
          }
        } catch (apiErr) {
          console.warn("downloadQnaAttachmentApi url fetch failed, checking fallback:", apiErr);
        }
      }

      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = downloadName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 만약 URL이 반환되지 않은 경우 직접 blob 다운로드 시도
      if (id && file.id) {
        const response = await apiMiddleware.get(
          `/api/qnas/${id}/attachments/${file.id}/download`,
          { responseType: "blob" },
        );
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      alert("다운로드할 수 있는 파일 경로를 찾을 수 없습니다.");
    } catch (err) {
      console.error("파일 다운로드 중 오류:", err);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      <div className="min-w-0 w-full bg-[#F8FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            <div className="mb-6"><h1 className="text-[26px] font-black text-[#13202B] tracking-tight">Q&A 문의 상세</h1><p className="mt-1 text-[14px] text-[#6B7280] font-medium">등록하신 문의 내용과 답변을 확인하실 수 있습니다.</p></div>
            {isLoading ? (
              <div className="p-12 text-center text-[#6B7280] font-medium bg-white rounded-2xl border border-[#E2E8F0]">문의글 정보를 불러오는 중입니다...</div>
            ) : isError ? (
              <div className="p-12 text-center text-rose-600 font-bold bg-white rounded-2xl border border-rose-200">{error instanceof Error ? error.message : "게시글을 불러올 수 없습니다."}</div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
                <div className="border-b border-[#E2E8F0] pb-5 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold", displayAnswer ? "bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]" : "bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]")}>{displayAnswer ? "답변완료" : "답변대기"}</span>
                  </div>
                  <h2 className="text-[22px] font-black text-[#13202B] leading-snug tracking-tight mb-3">{displayTitle}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#64748B] font-medium"><span>작성자: <strong>{displayAuthor}</strong></span><span>작성일: {displayDate}</span><span>조회수: {displayViews}</span></div>
                </div>
                {allAttachments.length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-[#F5FAFC] border border-[#DCE8ED]">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-[#13202B] mb-2.5"><Paperclip className="size-4 text-[#0F8AA8]" /><span>첨부파일 ({allAttachments.length}개)</span></div>
                    <div className="flex flex-col gap-2">
                      {allAttachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[13px]">
                          <div className="flex items-center gap-2 min-w-0"><FileText className="size-4 text-[#64748B] shrink-0" /><span className="font-medium text-[#13202B] truncate">{file.name}</span>{file.size && <span className="text-[11px] text-[#94A3B8]">({(file.size / 1024).toFixed(1)} KB)</span>}</div>
                          <button type="button" onClick={() => handleDownload(file)} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#EBF5F8] hover:bg-[#DCE8ED] text-[#0F8AA8] text-[12px] font-bold transition-colors shrink-0"><Download className="size-3.5" /><span>다운로드</span></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="min-h-[180px] text-[15px] leading-relaxed text-[#334155] whitespace-pre-wrap py-2 mb-8">{displayContent}</div>
                {displayAnswer && (
                  <div className="mt-8 pt-6 border-t border-[#E2E8F0] rounded-xl bg-[#EBF5F8]/50 p-5 border border-[#7CC9D8]/40">
                    <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-0.5 rounded bg-[#0F766E] text-white text-[11px] font-bold">관리자 답변</span><span className="text-[12px] text-[#64748B]">답변 완료</span></div>
                    <div className="text-[14px] leading-relaxed text-[#0F766E] font-medium whitespace-pre-wrap">{displayAnswer}</div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-6 border-t border-[#E2E8F0] mt-8">
                  <button type="button" onClick={() => navigate("/qna")} className="px-5 py-2.5 rounded-xl border border-[#DCE8ED] bg-[#F5FAFC] hover:bg-[#EBF5F8] text-[#13202B] text-[13px] font-bold transition-colors">목록으로</button>
                  {canEditOrDelete && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleEdit} className="px-5 py-2.5 rounded-xl bg-[#0F8AA8] hover:bg-[#0D7893] text-white text-[13px] font-bold transition-colors">수정하기</button>
                      <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition-colors disabled:opacity-50">{deleteMutation.isPending ? "삭제 중..." : "삭제하기"}</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
