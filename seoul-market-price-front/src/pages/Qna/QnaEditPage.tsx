import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, FileText, X } from "lucide-react";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import {
  getQnaAttachmentsApi,
  uploadQnaAttachmentsApi,
  deleteQnaAttachmentApi,
} from "@/api/api";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import type { AttachmentResponse } from "@/features/board/types/board.types";

/* 타입 정의 */
interface QnaDetailResponse {
  id: number;
  writerLoginId?: string;
  authorId?: string;
  userId?: string | number;
  title: string;
  questionContent?: string;
  content?: string;
  attachName?: string;
  attachPath?: string;
  attachments?: AttachmentResponse[];
  attachedFiles?: AttachmentResponse[];
  files?: AttachmentResponse[];
  fileList?: AttachmentResponse[];
  attachmentList?: AttachmentResponse[];
  publicQuestion?: boolean;
  isPublic?: boolean;
}

interface UpdateQnaDto {
  title: string;
  questionContent: string;
  content?: string;
  publicQuestion: boolean;
  isPublic?: boolean;
}

/* 상수 정의 */
const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "pdf", "webp",
  "doc", "docx", "xls", "xlsx", "hwp", "hwpx", "txt"
];

/* 확장자 추출 헬퍼 함수 */
const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* API 연동 함수: Q&A 상세 조회 */
async function fetchQnaDetailApi(id: string): Promise<QnaDetailResponse> {
  try {
    const response = await apiMiddleware.get<QnaDetailResponse>(`/api/qnas/${id}`);
    if (response.data) return response.data;
  } catch (err) {
    // 로컬 스토리지 데이터 폴백
    const stored = localStorage.getItem("qnaPosts");
    if (stored) {
      const localPosts = JSON.parse(stored) as Array<{
        id: number;
        authorId?: string;
        title?: string;
        content?: string;
        publicQuestion?: boolean;
        isPublic?: boolean;
      }>;
      const found = localPosts.find((p) => String(p.id) === String(id));
      if (found) {
        return {
          id: found.id,
          writerLoginId: found.authorId,
          title: found.title ?? "",
          questionContent: found.content,
          content: found.content,
          publicQuestion: found.publicQuestion ?? found.isPublic ?? true,
        };
      }
    }
    throw err;
  }
  throw new Error("게시글을 찾을 수 없습니다.");
}

/* API 연동 함수: Q&A 수정 */
async function updateQnaApi(id: number, data: UpdateQnaDto) {
  const payload = {
    title: data.title,
    questionContent: data.questionContent,
    content: data.questionContent,
    publicQuestion: data.publicQuestion,
    isPublic: data.publicQuestion,
  };

  try {
    // PATCH 요청 우선 시도
    const response = await apiMiddleware.patch(`/api/qnas/${id}`, payload);
    return response.data;
  } catch (err) {
    // PATCH 미지원 시 PUT으로 폴백
    if (axios.isAxiosError(err) && (err.response?.status === 405 || err.response?.status === 404)) {
      const putResponse = await apiMiddleware.put(`/api/qnas/${id}`, payload);
      return putResponse.data;
    }
    throw err;
  }
}

/* 커스텀 훅: 게시글 데이터 조회 */
function useQnaEditData(id?: string) {
  return useQuery({
    queryKey: ["qnaEdit", id],
    queryFn: () => {
      if (!id) throw new Error("게시글 번호가 올바르지 않습니다.");
      return fetchQnaDetailApi(id);
    },
    enabled: !!id,
  });
}

/* 커스텀 훅: 로그인 및 작성자 권한 검증 */
function useQnaEditAuth(writerLoginId?: string, postId?: number) {
  const navigate = useNavigate();
  const isLoggedIn = isLogin();
  const currentUser = getLoginUser();
  const currentUserId = currentUser?.userId || "";

  // 로그인 여부 확인
  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  // 본인 작성글 여부 확인
  useEffect(() => {
    if (writerLoginId && currentUserId && writerLoginId !== currentUserId) {
      alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      navigate(`/qna/${postId}`, { replace: true });
    }
  }, [writerLoginId, currentUserId, navigate, postId]);

  return { isLoggedIn, currentUserId };
}

/* 수정 폼 컴포넌트 */
interface QnaEditFormProps {
  post: QnaDetailResponse;
}

function QnaEditForm({ post }: QnaEditFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 폼 입력 상태
  const [form, setForm] = useState({
    title: post.title ?? "",
    content: post.questionContent ?? post.content ?? "",
    publicQuestion: post.publicQuestion ?? post.isPublic ?? true,
  });

  // 새로 추가할 첨부파일 목록
  const [newFiles, setNewFiles] = useState<File[]>([]);
  // 삭제할 기존 첨부파일 ID 목록
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

  // 서버로부터 기존 첨부파일 목록 조회
  const { data: serverAttachments = [] } = useQuery<AttachmentResponse[]>({
    queryKey: ["qnaAttachments", post.id],
    queryFn: () => getQnaAttachmentsApi(post.id),
    enabled: !!post.id,
  });

  // 기존 첨부파일 파싱 (서버 API 응답 + 게시글 객체 내 필드 + 폴백)
  const existingAttachments = useMemo(() => {
    const list: Array<{
      id?: number;
      name: string;
      size?: number;
      url?: string;
    }> = [];

    // 1. 서버 전용 API 첨부파일 목록
    if (Array.isArray(serverAttachments) && serverAttachments.length > 0) {
      serverAttachments.forEach((att, idx) => {
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
            `첨부파일 ${idx + 1}`,
          size: attObj.fileSize ?? attObj.size,
          url: attObj.downloadUrl || attObj.fileUrl,
        });
      });
    }

    // 2. 게시글 객체 내 첨부파일 배열
    const postFiles =
      post?.attachments ||
      post?.files ||
      post?.attachedFiles ||
      post?.fileList ||
      post?.attachmentList;

    if (Array.isArray(postFiles) && postFiles.length > 0) {
      postFiles.forEach((f: unknown, idx: number) => {
        const fileObj = f as {
          id?: number;
          attachmentId?: number;
          originalFileName?: string;
          originalFilename?: string;
          originalName?: string;
          fileName?: string;
          name?: string;
          fileSize?: number;
          size?: number;
          fileUrl?: string;
          url?: string;
        };
        const id = fileObj.id ?? fileObj.attachmentId ?? idx + 1;
        const name =
          fileObj.originalName ||
          fileObj.originalFileName ||
          fileObj.originalFilename ||
          fileObj.fileName ||
          fileObj.name ||
          `첨부파일 ${idx + 1}`;
        if (!list.some((existing) => (existing.id && existing.id === id) || existing.name === name)) {
          list.push({
            id,
            name,
            size: fileObj.fileSize ?? fileObj.size,
            url: fileObj.fileUrl || fileObj.url,
          });
        }
      });
    }

    // 3. 단일 파일 필드 폴백
    if (post.attachName && !list.some((existing) => existing.name === post.attachName)) {
      list.push({
        id: 1,
        name: post.attachName,
        url: post.attachPath,
      });
    }

    // 삭제 목록에 있는 파일 제외
    return list.filter((att) => !att.id || !deletedAttachmentIds.includes(att.id));
  }, [serverAttachments, post, deletedAttachmentIds]);

  // 총 첨부파일 수 (기존 유지 파일 + 새로 선택한 파일)
  const totalFileCount = existingAttachments.length + newFiles.length;

  // 수정 요청 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (dto: UpdateQnaDto) => {
      // 1. 기존 삭제 대상 첨부파일 API 호출
      for (const attId of deletedAttachmentIds) {
        try {
          await deleteQnaAttachmentApi(post.id, attId);
        } catch (delErr) {
          console.warn(`첨부파일 ID ${attId} 삭제 실패 (무시하고 계속):`, delErr);
        }
      }

      // 2. 새 첨부파일이 있으면 업로드
      if (newFiles.length > 0) {
        await uploadQnaAttachmentsApi(post.id, newFiles);
      }

      // 3. 게시글 텍스트 수정
      return await updateQnaApi(post.id, dto);
    },
    onSuccess: () => {
      // 로컬 스토리지 동기화
      const stored = localStorage.getItem("qnaPosts");
      if (stored) {
        try {
          const localPosts = JSON.parse(stored) as Array<{
            id: number;
            title?: string;
            content?: string;
            publicQuestion?: boolean;
          }>;
          const updated = localPosts.map((p) =>
            String(p.id) === String(post.id)
              ? {
                  ...p,
                  title: form.title.trim(),
                  content: form.content.trim(),
                  publicQuestion: form.publicQuestion,
                }
              : p
          );
          localStorage.setItem("qnaPosts", JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }

      alert("질의응답이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(post.id)] });
      queryClient.invalidateQueries({ queryKey: ["qnaAttachments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      navigate(`/qna/${post.id}`);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
          return navigate("/login");
        }
        if (err.response?.status === 403) {
          return alert("수정 권한이 없습니다.");
        }
        if (err.response?.status === 500) {
          alert("서버 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
          return;
        }
      }
      alert("질의응답 수정에 실패했습니다.");
    },
  });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, publicQuestion: e.target.checked }));
  }, []);

  // 새 파일 선택 핸들러
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (totalFileCount + files.length > MAX_FILE_COUNT) {
      alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지만 등록할 수 있습니다.`);
      e.target.value = "";
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" 파일이 50MB 제한을 초과했습니다.`);
        e.target.value = "";
        return;
      }
      const ext = getFileExtension(file.name);
      if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
        alert(`"${file.name}" 파일은 허용되지 않는 파일 형식입니다.`);
        e.target.value = "";
        return;
      }
      validFiles.push(file);
    }

    setNewFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  }, [totalFileCount]);

  // 기존 파일 삭제 핸들러
  const handleDeleteExistingAttachment = useCallback((attId?: number) => {
    if (!attId) return;
    if (window.confirm("이 첨부파일을 삭제하시겠습니까? (수정 완료 시 반영됩니다)")) {
      setDeletedAttachmentIds((prev) => [...prev, attId]);
    }
  }, []);

  // 새로 추가된 파일 제거 핸들러
  const handleRemoveNewFile = useCallback((index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCancelForm = useCallback(() => {
    navigate(`/qna/${post.id}`);
  }, [navigate, post.id]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) return alert("제목을 입력해주세요.");
    if (title.length > 200) return alert("제목은 200자 이내로 입력해주세요.");
    if (!content) return alert("내용을 입력해주세요.");
    if (content.length > 5000) return alert("내용은 5,000자 이내로 입력해주세요.");

    updateMutation.mutate({
      title,
      questionContent: content,
      publicQuestion: form.publicQuestion,
    });
  }, [form, updateMutation]);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-6 md:p-8 shadow-sm"
    >
      {/* 제목 입력 */}
      <div>
        <label className="block text-[13px] font-bold text-[#13202B] mb-2">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="제목을 입력하세요 (200자 이내)"
          maxLength={200}
          className="w-full h-11 px-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8]"
        />
      </div>

      {/* 공개 여부 설정 */}
      <div className="flex items-center gap-3 p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px]">
        <input
          type="checkbox"
          id="publicQuestion"
          checked={form.publicQuestion}
          onChange={handleCheckboxChange}
          className="size-4 text-[#0F8AA8] rounded border-[#DCE8ED] focus:ring-[#0F8AA8]"
        />
        <label
          htmlFor="publicQuestion"
          className="text-[13px] font-semibold text-[#13202B] cursor-pointer select-none"
        >
          공개글로 등록합니다. (체크 해제 시 비밀글로 등록)
        </label>
      </div>

      {/* 질문 내용 입력 */}
      <div>
        <label className="block text-[13px] font-bold text-[#13202B] mb-2">
          질문 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="content"
          value={form.content}
          onChange={handleChange}
          placeholder="문의하실 내용을 입력하세요."
          rows={10}
          maxLength={5000}
          className="w-full p-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8] resize-y"
        />
      </div>

      {/* 첨부파일 영역 */}
      <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[12px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F8AA8]">
            <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
            <span>첨부파일 ({totalFileCount}/{MAX_FILE_COUNT})</span>
          </div>
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={totalFileCount >= MAX_FILE_COUNT}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4F2] hover:bg-[#d0ece8] text-[#0F766E] text-[13px] font-bold rounded-[8px] transition-colors cursor-pointer border-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>파일 선택</span>
          </button>
        </div>

        <p className="text-[12px] text-[#6B7280]">
          최대 {MAX_FILE_COUNT}개, 파일당 50MB까지 첨부할 수 있습니다.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf,.webp,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.txt"
          className="hidden"
        />

        {/* 파일 목록 렌더링 */}
        {(existingAttachments.length > 0 || newFiles.length > 0) && (
          <div className="pt-2 border-t border-[#DCE8ED]/60 space-y-2">
            {/* 1. 기존 유지 첨부파일 */}
            {existingAttachments.map((att, idx) => (
              <div
                key={`existing-${att.id ?? idx}`}
                className="flex items-center justify-between px-3 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#0F8AA8] shrink-0" />
                  <span className="truncate text-[#13202B] font-medium max-w-[450px]">
                    {att.name}
                  </span>
                  {att.size && (
                    <span className="text-[11px] text-[#6B7280] shrink-0">
                      ({(att.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                  <span className="text-[11px] text-[#0F8AA8] bg-[#EBF5F8] px-2 py-0.5 rounded font-bold shrink-0">
                    기존 파일
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExistingAttachment(att.id)}
                  className="text-rose-500 hover:text-rose-700 text-[12px] font-bold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                >
                  삭제
                </button>
              </div>
            ))}

            {/* 2. 새로 추가한 첨부파일 */}
            {newFiles.map((file, idx) => (
              <div
                key={`new-${file.name}-${idx}`}
                className="flex items-center justify-between px-3 py-2 bg-white border border-[#0F8AA8]/30 rounded-[8px] text-[13px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span className="truncate text-[#13202B] font-medium max-w-[450px]">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-[#6B7280] shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <span className="text-[11px] text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded font-bold shrink-0">
                    새 파일
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNewFile(idx)}
                  className="text-rose-500 hover:text-rose-700 text-[12px] font-bold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 (좌측: 목록으로, 우측: 취소/수정 완료) */}
      <div className="flex justify-between items-center pt-6 border-t border-[#DCE8ED]">
        <button
          type="button"
          onClick={() => navigate("/qna")}
          className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer transition-colors"
        >
          목록으로
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancelForm}
            className="px-5 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px] hover:bg-[#F5FAFC] cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-[#0F8AA8] text-white text-[14px] font-bold rounded-[7px] hover:bg-[#0B5E73] shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
          >
            {updateMutation.isPending ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* 메인 페이지 컴포넌트 */
export default function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  // 기존 데이터 조회
  const { data: post, isLoading, isError } = useQnaEditData(id);

  // 로그인 및 권한 검증
  useQnaEditAuth(post?.writerLoginId || post?.authorId || (post?.userId ? String(post.userId) : undefined), post?.id);

  // 헤더 네비게이션 액션
  const handleGoList = useCallback(() => navigate("/qna"), [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8 text-center text-[#6B7280]">
        게시글을 불러오는 중입니다...
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8 text-center">
        <h2 className="text-[20px] font-bold text-[#13202B]">게시글을 확인할 수 없습니다.</h2>
        <button
          type="button"
          onClick={handleGoList}
          className="mt-4 px-4 py-2 bg-[#0F8AA8] text-white rounded-[6px] text-[13px] font-bold cursor-pointer"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full justify-center bg-[#F5FAFC] px-4 py-8 md:px-8 md:py-12">
      <div className="w-full max-w-4xl space-y-8">
        {/* 상단 헤더 (가운데 정렬) */}
        <div className="text-center pb-6 border-b border-[#DCE8ED]">
          <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
            CUSTOMER CENTER
          </span>
          <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 수정</h1>
        </div>

        {/* 수정 폼 영역 */}
        <QnaEditForm key={post.id} post={post} />
      </div>
    </div>
  );
}
