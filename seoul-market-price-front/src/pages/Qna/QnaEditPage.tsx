import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, FileText } from "lucide-react";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";

/* 타입 정의 */
interface QnaDetailResponse {
  id: number;
  writerLoginId?: string;
  title: string;
  questionContent?: string;
  content?: string;
  attachName?: string;
  attachPath?: string;
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

/* 커스텀 훅: 게시글 수정 뮤테이션 */
function useQnaUpdateMutation(postId: number, formTitle: string, formContent: string, formPublicQuestion: boolean) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateQnaDto) => updateQnaApi(postId, dto),
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
            String(p.id) === String(postId)
              ? {
                  ...p,
                  title: formTitle.trim(),
                  content: formContent.trim(),
                  publicQuestion: formPublicQuestion,
                }
              : p
          );
          localStorage.setItem("qnaPosts", JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }

      alert("질의응답이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(postId)] });
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      navigate(`/qna/${postId}`);
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
          alert("서버 오류가 발생했습니다. (토큰 만료 혹은 데이터 형식 오류일 수 있습니다.) 새로고침 후 다시 시도해주세요.");
          return;
        }
      }
      alert("질의응답 수정에 실패했습니다.");
    },
  });
}

/* 수정 폼 컴포넌트 */
interface QnaEditFormProps {
  post: QnaDetailResponse;
}

function QnaEditForm({ post }: QnaEditFormProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 폼 입력 상태
  const [form, setForm] = useState({
    title: post.title ?? "",
    content: post.questionContent ?? post.content ?? "",
    publicQuestion: post.publicQuestion ?? post.isPublic ?? true,
  });

  // 첨부파일 상태
  const [currentAttachment, setCurrentAttachment] = useState<{ name: string; path?: string } | null>(
    post.attachName ? { name: post.attachName, path: post.attachPath } : null
  );
  const [attachmentDeleted, setAttachmentDeleted] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);

  // 수정 요청 뮤테이션
  const updateMutation = useQnaUpdateMutation(
    post.id,
    form.title,
    form.content,
    form.publicQuestion
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, publicQuestion: e.target.checked }));
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("첨부파일은 최대 50MB까지 등록할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const ext = getFileExtension(file.name);
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      alert("허용되지 않는 파일 형식입니다.");
      e.target.value = "";
      return;
    }

    setNewFile(file);
    setAttachmentDeleted(true);
    e.target.value = "";
  }, []);

  const handleDeleteAttachment = useCallback(() => {
    if (window.confirm("첨부파일을 삭제하시겠습니까?")) {
      setCurrentAttachment(null);
      setAttachmentDeleted(true);
      setNewFile(null);
    }
  }, []);

  const handleCancelNewFile = useCallback(() => {
    setNewFile(null);
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
      <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[12px] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F8AA8]">
            <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
            <span>첨부파일 ({newFile || (currentAttachment && !attachmentDeleted) ? 1 : 0}/1)</span>
          </div>
          <button
            type="button"
            onClick={handleFileButtonClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4F2] hover:bg-[#d0ece8] text-[#0F766E] text-[13px] font-bold rounded-[8px] transition-colors cursor-pointer border-none shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>파일 선택</span>
          </button>
        </div>

        <p className="text-[12px] text-[#6B7280]">
          파일당 최대 50MB까지 첨부할 수 있습니다.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.gif,.pdf,.webp,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.txt"
          className="hidden"
        />

        {currentAttachment && !attachmentDeleted ? (
          <div className="pt-2 mt-2 border-t border-[#DCE8ED]/60">
            <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#0F8AA8] shrink-0" />
                <span className="truncate text-[#13202B] font-medium max-w-[450px]">
                  {currentAttachment.name}
                </span>
                <span className="text-[11px] text-[#0F8AA8] bg-[#EBF5F8] px-2 py-0.5 rounded font-bold shrink-0">
                  기존 파일
                </span>
              </div>
              <button
                type="button"
                onClick={handleDeleteAttachment}
                className="text-rose-500 hover:text-rose-700 text-[12px] font-bold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ) : newFile ? (
          <div className="pt-2 mt-2 border-t border-[#DCE8ED]/60">
            <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#0F8AA8] shrink-0" />
                <span className="truncate text-[#13202B] font-medium max-w-[450px]">
                  {newFile.name}
                </span>
                <span className="text-[11px] text-[#6B7280] shrink-0">
                  ({(newFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelNewFile}
                className="text-rose-500 hover:text-rose-700 text-[12px] font-bold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : null}
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
  useQnaEditAuth(post?.writerLoginId, post?.id);

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
