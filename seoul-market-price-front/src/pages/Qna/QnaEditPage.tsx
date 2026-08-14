import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  publicQuestion: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; /* 10MB */
const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf", "webp", "doc", "docx", "xls", "xlsx", "hwp", "hwpx", "txt"];

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
  const response = await apiMiddleware.put(`/api/qnas/${id}`, data);
  return response.data;
}

/* 수정 폼 컴포넌트 */
function QnaEditForm({ post }: { post: QnaDetailResponse }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* 작성 폼 상태: post 초기값 바인딩 */
  const [form, setForm] = useState({
    title: post.title ?? "",
    content: post.questionContent ?? post.content ?? "",
    publicQuestion: post.publicQuestion ?? post.isPublic ?? true,
  });

  const [currentAttachment, setCurrentAttachment] = useState<{ name: string; path?: string } | null>(
    post.attachName ? { name: post.attachName, path: post.attachPath } : null,
  );
  const [attachmentDeleted, setAttachmentDeleted] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);

  /* React Query: 수정 뮤테이션 */
  const updateMutation = useMutation({
    mutationFn: (dto: UpdateQnaDto) => updateQnaApi(post.id, dto),
    onSuccess: () => {
      const stored = localStorage.getItem("qnaPosts");
      if (stored) {
        try {
          const localPosts = JSON.parse(stored) as Array<{ id: number; title?: string; content?: string; publicQuestion?: boolean }>;
          const updated = localPosts.map((p) =>
            String(p.id) === String(post.id)
              ? { ...p, title: form.title.trim(), content: form.content.trim(), publicQuestion: form.publicQuestion }
              : p,
          );
          localStorage.setItem("qnaPosts", JSON.stringify(updated));
        } catch { /* 무시 */ }
      }

      alert("질의응답이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(post.id)] });
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      navigate(`/qna/${post.id}`);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) return navigate("/login");
        if (err.response?.status === 403) return alert("수정 권한이 없습니다.");
      }
      alert("질의응답 수정에 실패했습니다.");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("첨부파일은 최대 10MB까지 등록할 수 있습니다.");
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
  };

  const handleSubmit = (e: FormEvent) => {
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-6 md:p-8 shadow-sm">
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

      {/* 공개 여부 */}
      <div className="flex items-center gap-3 p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px]">
        <input
          type="checkbox"
          id="publicQuestion"
          checked={form.publicQuestion}
          onChange={(e) => setForm((prev) => ({ ...prev, publicQuestion: e.target.checked }))}
          className="size-4 text-[#0F8AA8] rounded border-[#DCE8ED] focus:ring-[#0F8AA8]"
        />
        <label htmlFor="publicQuestion" className="text-[13px] font-semibold text-[#13202B] cursor-pointer select-none">
          공개글로 등록합니다. (체크 해제 시 비밀글로 등록)
        </label>
      </div>

      {/* 내용 입력 */}
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

      {/* 첨부파일 */}
      <div>
        <label className="block text-[13px] font-bold text-[#13202B] mb-2">첨부파일</label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.gif,.pdf"
          className="hidden"
        />

        {currentAttachment && !attachmentDeleted ? (
          <div className="flex items-center justify-between p-3 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px] text-[13px]">
            <span className="font-medium text-[#13202B]">📎 {currentAttachment.name}</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("첨부파일을 삭제하시겠습니까?")) {
                  setCurrentAttachment(null);
                  setAttachmentDeleted(true);
                  setNewFile(null);
                }
              }}
              className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
            >
              삭제
            </button>
          </div>
        ) : newFile ? (
          <div className="flex items-center justify-between p-3 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px] text-[13px]">
            <span className="font-medium text-[#13202B]">📎 {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={() => setNewFile(null)}
              className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px] font-bold text-[#13202B] hover:bg-[#F5FAFC] cursor-pointer"
          >
            📎 파일 첨부 / 교체
          </button>
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE8ED]">
        <button
          type="button"
          onClick={() => navigate(`/qna/${post.id}`)}
          className="px-6 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[8px] hover:bg-[#F5FAFC] cursor-pointer"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-8 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {updateMutation.isPending ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </form>
  );
}

/* 메인 페이지 컴포넌트 */
export default function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const currentUser = getLoginUser();
  const currentUserId = currentUser?.userId || "";
  const isLoggedIn = isLogin();

  /* 미로그인 검증 */
  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  /* React Query: 기존 데이터 조회 */
  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["qnaEdit", id],
    queryFn: () => {
      if (!id) throw new Error("게시글 번호가 올바르지 않습니다.");
      return fetchQnaDetailApi(id);
    },
    enabled: !!id && isLoggedIn,
  });

  /* 작성자 권한 검증 */
  useEffect(() => {
    if (post && currentUserId) {
      const writerId = post.writerLoginId ?? "";
      if (writerId && currentUserId !== writerId) {
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
        navigate(`/qna/${post.id}`);
      }
    }
  }, [post, currentUserId, navigate]);

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
          onClick={() => navigate("/qna")}
          className="mt-4 px-4 py-2 bg-[#0F8AA8] text-white rounded-[6px] text-[13px] font-bold cursor-pointer"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 수정</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/qna/${id}`)}
            className="px-4 py-2 bg-white border border-[#DCE8ED] text-[#6B7280] text-[13px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer"
          >
            취소
          </button>
        </div>

        {/* 수정 폼 */}
        <QnaEditForm key={post.id} post={post} />
      </div>
    </div>
  );
}
