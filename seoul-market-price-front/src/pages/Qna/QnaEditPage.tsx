import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, FileText } from "lucide-react";
import axios from "axios";
import apiMiddleware from "@/api/middleware";
import { getQnaAttachmentsApi, uploadQnaAttachmentsApi, deleteQnaAttachmentApi } from "@/api/api";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import type { AttachmentResponse } from "@/features/board/types/board.types";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 및 상수 정의 */
interface QnaDetailResponse {
  id: number; writerLoginId?: string; authorId?: string; userId?: string | number; title: string;
  questionContent?: string; content?: string; attachName?: string; attachPath?: string;
  attachments?: AttachmentResponse[]; attachedFiles?: AttachmentResponse[]; files?: AttachmentResponse[];
  fileList?: AttachmentResponse[]; attachmentList?: AttachmentResponse[]; publicQuestion?: boolean; isPublic?: boolean;
}

interface UpdateQnaDto { title: string; questionContent: string; content?: string; publicQuestion: boolean; isPublic?: boolean; }

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf", "webp", "doc", "docx", "xls", "xlsx", "hwp", "hwpx", "txt"];

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* 2. API 연동 함수 (백엔드 DB 연동) */
async function fetchQnaDetailApi(id: string): Promise<QnaDetailResponse> {
  const response = await apiMiddleware.get<QnaDetailResponse>(`/api/qnas/${id}`);
  if (response.data) return response.data;
  throw new Error("게시글을 찾을 수 없습니다.");
}

async function updateQnaApi(id: number, data: UpdateQnaDto) {
  const payload = { title: data.title, questionContent: data.questionContent, content: data.questionContent, publicQuestion: data.publicQuestion, isPublic: data.publicQuestion };
  try {
    const response = await apiMiddleware.patch(`/api/qnas/${id}`, payload);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.status === 405 || err.response?.status === 404)) {
      const putResponse = await apiMiddleware.put(`/api/qnas/${id}`, payload);
      return putResponse.data;
    }
    throw err;
  }
}

/* 3. 데이터 및 권한 조회 커스텀 훅 */
function useQnaEditData(id?: string) {
  return useQuery({ queryKey: ["qnaEdit", id], queryFn: () => { if (!id) throw new Error("게시글 번호가 올바르지 않습니다."); return fetchQnaDetailApi(id); }, enabled: !!id });
}

function useQnaEditAuth(post?: QnaDetailResponse) {
  const navigate = useNavigate();
  const isLoggedIn = isLogin();
  const currentUser = getLoginUser() as unknown as Record<string, unknown> | null;
  const currentUserId = String(currentUser?.userId || "").trim().toLowerCase();

  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!post || !currentUser) return;
    const role = String(currentUser.role || "").toUpperCase();
    if (role === "ADMIN" || role === "ROLE_ADMIN") return;

    const userKeys = [
      currentUser.userId,
      currentUser.id,
      currentUser.email,
      currentUser.name,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());

    const postKeys = [
      post.writerLoginId,
      post.authorId,
      post.userId,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());

    const isMatch = userKeys.some((uk) =>
      postKeys.some((pk) => uk === pk || uk.includes(pk) || pk.includes(uk)),
    );

    if (postKeys.length > 0 && !isMatch) {
      alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      navigate(`/qna/${post.id}`, { replace: true });
    }
  }, [post, currentUser, navigate]);

  return { isLoggedIn, currentUserId };
}

/* 4. QnA 수정 폼 서브 컴포넌트 */
function QnaEditForm({ post }: { post: QnaDetailResponse }) {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ title: post.title ?? "", content: post.questionContent ?? post.content ?? "", publicQuestion: post.publicQuestion ?? post.isPublic ?? true });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

  const { data: serverAttachments = [] } = useQuery<AttachmentResponse[]>({ queryKey: ["qnaAttachments", post.id], queryFn: () => getQnaAttachmentsApi(post.id), enabled: !!post.id });

  const existingAttachments = useMemo(() => {
    const list: Array<{ id?: number; name: string; size?: number; url?: string }> = [];
    if (Array.isArray(serverAttachments) && serverAttachments.length > 0) {
      serverAttachments.forEach((att: any, idx) => {
        list.push({ id: att.id ?? att.attachmentId ?? idx + 1, name: att.originalName || att.originalFilename || att.fileName || att.name || `첨부파일 ${idx + 1}`, size: att.fileSize ?? att.size, url: att.downloadUrl || att.fileUrl });
      });
    }
    const postFiles = post?.attachments || post?.files || post?.attachedFiles || post?.fileList || post?.attachmentList;
    if (Array.isArray(postFiles) && postFiles.length > 0) {
      postFiles.forEach((fileObj: any, idx) => {
        const id = fileObj.id ?? fileObj.attachmentId ?? idx + 1;
        const name = fileObj.originalName || fileObj.originalFileName || fileObj.fileName || fileObj.name || `첨부파일 ${idx + 1}`;
        if (!list.some((item) => item.id === id || item.name === name)) {
          list.push({ id, name, size: fileObj.size ?? fileObj.fileSize, url: fileObj.downloadUrl || fileObj.fileUrl || fileObj.url });
        }
      });
    }
    if (post.attachName && !list.some((item) => item.name === post.attachName)) list.push({ id: 1, name: post.attachName, url: post.attachPath });
    return list.filter((att) => att.id === undefined || !deletedAttachmentIds.includes(att.id));
  }, [serverAttachments, post, deletedAttachmentIds]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateQnaApi(post.id, { title: form.title.trim(), questionContent: form.content.trim(), publicQuestion: form.publicQuestion });
      if (deletedAttachmentIds.length > 0) {
        for (const attId of deletedAttachmentIds) { try { await deleteQnaAttachmentApi(post.id, attId); } catch { /* 무시 */ } }
      }
      if (newFiles.length > 0) { try { await uploadQnaAttachmentsApi(post.id, newFiles); } catch { /* 무시 */ } }
    },
    onSuccess: () => {
      alert("게시글이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(post.id)] }); queryClient.invalidateQueries({ queryKey: ["qnas"] });
      navigate(`/qna/${post.id}`);
    },
    onError: () => alert("게시글 수정 중 오류가 발생했습니다."),
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []); if (!selected.length) return;
    if (existingAttachments.length + newFiles.length + selected.length > MAX_FILE_COUNT) return alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록 가능합니다.`);
    for (const f of selected) {
      if (!ALLOWED_FILE_EXTENSIONS.includes(getFileExtension(f.name))) return alert(`${f.name}\n허용되지 않는 파일 형식입니다.`);
      if (f.size > MAX_FILE_SIZE) return alert(`${f.name}\n파일 크기가 50MB를 초과했습니다.`);
    }
    setNewFiles((prev) => [...prev, ...selected]); e.target.value = "";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("제목을 입력해주세요.");
    if (!form.content.trim()) return alert("내용을 입력해주세요.");
    updateMutation.mutate();
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full justify-center bg-[#F5FAFC] px-4 py-8 md:px-8 md:py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center pb-6 border-b border-[#DCE8ED]"><span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">CUSTOMER CENTER</span><h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 수정</h1></div>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-4 sm:p-8 shadow-sm">
          <div><label className="block text-[13px] font-bold text-[#13202B] mb-2">제목 <span className="text-red-500">*</span></label><input type="text" name="title" value={form.title} onChange={handleChange} placeholder="제목을 입력하세요" maxLength={200} className="w-full h-11 px-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8]" /></div>
          <div className="flex items-center gap-3 p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px]"><input type="checkbox" id="publicQuestion" checked={form.publicQuestion} onChange={(e) => setForm((prev) => ({ ...prev, publicQuestion: e.target.checked }))} className="size-4 text-[#0F8AA8] rounded border-[#DCE8ED]" /><label htmlFor="publicQuestion" className="text-[13px] font-semibold text-[#13202B] cursor-pointer">공개글로 등록합니다. (체크 해제 시 비밀글로 등록)</label></div>
          <div><label className="block text-[13px] font-bold text-[#13202B] mb-2">내용 <span className="text-red-500">*</span></label><textarea name="content" value={form.content} onChange={handleChange} rows={10} maxLength={5000} className="w-full p-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8] resize-none" /></div>
          <div>
            <label className="block text-[13px] font-bold text-[#13202B] mb-2">첨부파일 관리</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.txt" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-[#F5FAFC] border border-[#DCE8ED] hover:bg-[#EBF5F8] rounded-[8px] text-[13px] font-bold text-[#0F8AA8] transition-colors"><Paperclip className="size-4" /><span>파일 추가 (최대 5개)</span></button>
            {(existingAttachments.length > 0 || newFiles.length > 0) && (
              <div className="mt-3 space-y-2">
                {existingAttachments.map((att, idx) => (
                  <div key={`exist-${idx}`} className="flex items-center justify-between p-2.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[6px] text-[13px]"><div className="flex items-center gap-2 truncate"><FileText className="size-4 text-[#0F8AA8] shrink-0" /><span className="font-semibold text-[#13202B] truncate">{att.name}</span><span className="text-[11px] text-[#6B7280]">(기존 파일)</span></div><button type="button" onClick={() => att.id && setDeletedAttachmentIds((prev) => [...prev, att.id!])} className="text-rose-500 font-bold hover:underline ml-2 shrink-0">삭제</button></div>
                ))}
                {newFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between p-2.5 bg-[#EBF5F8]/40 border border-[#7CC9D8]/50 rounded-[6px] text-[13px]"><div className="flex items-center gap-2 truncate"><FileText className="size-4 text-[#0F8AA8] shrink-0" /><span className="font-semibold text-[#13202B] truncate">{file.name}</span><span className="text-[11px] text-[#0F8AA8]">(새 파일)</span></div><button type="button" onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-500 font-bold hover:underline ml-2 shrink-0">삭제</button></div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#DCE8ED]">
            <button type="button" onClick={() => navigate(`/qna/${post.id}`)} className="px-6 py-3 border border-[#DCE8ED] bg-[#F5FAFC] hover:bg-[#EBF5F8] rounded-[8px] text-[14px] font-bold text-[#13202B] transition-colors">취소</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2 px-8 py-3 bg-[#0F8AA8] hover:bg-[#0D7893] rounded-[8px] text-[14px] font-bold text-white transition-colors disabled:opacity-50"><Upload className="size-4" /><span>{updateMutation.isPending ? "수정 중..." : "수정하기"}</span></button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* 5. 메인 QnA 수정 페이지 컴포넌트 */
export default function QnaEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, isError, error } = useQnaEditData(id);
  useQnaEditAuth(post);

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      {isLoading ? (
        <div className="p-12 text-center text-[#6B7280] font-medium bg-white rounded-2xl border border-[#E2E8F0] my-8">게시글 정보를 불러오는 중입니다...</div>
      ) : isError || !post ? (
        <div className="p-12 text-center text-rose-600 font-bold bg-white rounded-2xl border border-rose-200 my-8">{error instanceof Error ? error.message : "게시글 정보를 불러올 수 없습니다."}</div>
      ) : (
        <QnaEditForm post={post} />
      )}
    </SectionSidebarLayout>
  );
}
