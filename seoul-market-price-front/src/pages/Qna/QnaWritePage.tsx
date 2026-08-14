import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";

const MAX_FILE_COUNT = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; /* 10MB */
const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf"];

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1).toLowerCase();
};

interface CreateQnaDto {
  title: string;
  questionContent: string;
  publicQuestion: boolean;
}

/* API 연동 함수: Q&A 등록 */
async function createQnaApi(data: CreateQnaDto) {
  const response = await apiMiddleware.post("/api/qnas", data);
  return response.data;
}

/* 메인 컴포넌트 */
export default function QnaWritePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUser = getLoginUser();
  const currentUserName = currentUser?.name || currentUser?.userId || "사용자";
  const isLoggedIn = isLogin();

  /* 미로그인 검증 */
  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  const [form, setForm] = useState({
    title: "",
    content: "",
    publicQuestion: true,
  });

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  /* React Query: Q&A 등록 뮤테이션 */
  const createMutation = useMutation({
    mutationFn: (dto: CreateQnaDto) => createQnaApi(dto),
    onSuccess: (data) => {
      const newPostId = (data as { id?: number })?.id || Date.now();
      const today = new Date().toISOString().split("T")[0].replace(/-/g, ".");
      const newPostObj = {
        id: newPostId,
        authorId: currentUser?.userId || "user",
        author: currentUser?.name || currentUser?.userId || "작성자",
        title: form.title.trim(),
        content: form.content.trim(),
        date: today,
        views: 0,
        publicQuestion: form.publicQuestion,
      };

      try {
        const storedPosts = localStorage.getItem("qnaPosts");
        const localPosts = storedPosts ? (JSON.parse(storedPosts) as unknown[]) : [];
        localStorage.setItem("qnaPosts", JSON.stringify([newPostObj, ...localPosts]));
      } catch { /* 무시 */ }

      alert("질의응답이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      navigate("/qna");
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) return navigate("/login");
        if (err.response?.data?.message) return alert(err.response.data.message);
      }
      alert("질의응답 등록에 실패했습니다.");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const combinedFiles = [...attachedFiles, ...selectedFiles];
    if (combinedFiles.length > MAX_FILE_COUNT) {
      alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있습니다.`);
      e.target.value = "";
      return;
    }

    for (const file of selectedFiles) {
      const ext = getFileExtension(file.name);
      if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
        alert(`${file.name}\n허용되지 않는 파일 형식입니다. (JPG, JPEG, PNG, GIF, PDF)`);
        e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}\n파일 크기가 10MB를 초과했습니다.`);
        e.target.value = "";
        return;
      }
    }

    setAttachedFiles(combinedFiles);
    e.target.value = "";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser?.userId) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");
      return navigate("/login");
    }

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) return alert("제목을 입력해주세요.");
    if (title.length > 200) return alert("제목은 200자 이내로 입력해주세요.");
    if (!content) return alert("내용을 입력해주세요.");
    if (content.length > 5000) return alert("내용은 5,000자 이내로 입력해주세요.");

    createMutation.mutate({
      title,
      questionContent: content,
      publicQuestion: form.publicQuestion,
    });
  };

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[800px] mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 작성</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              궁금한 점을 자세히 작성해주시면 성실히 답변해 드리겠습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/qna")}
            className="px-4 py-2 bg-white border border-[#DCE8ED] text-[#6B7280] text-[13px] font-bold rounded-[7px] hover:bg-[#EBF5F8] cursor-pointer"
          >
            취소
          </button>
        </div>

        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-6 md:p-8 shadow-sm">
          {/* 작성자 */}
          <div>
            <label className="block text-[13px] font-bold text-[#13202B] mb-2">작성자</label>
            <input
              type="text"
              value={currentUserName}
              disabled
              className="w-full h-11 px-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#6B7280] font-semibold"
            />
          </div>

          {/* 제목 */}
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
              공개글로 등록합니다. (체크 해제 시 비밀글로 등록되어 작성자와 관리자만 확인 가능)
            </label>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-[13px] font-bold text-[#13202B] mb-2">
              질문 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의하실 내용을 상세히 적어주세요. (5,000자 이내)"
              rows={10}
              maxLength={5000}
              className="w-full p-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8] resize-y"
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-bold text-[#13202B]">
                첨부파일 ({attachedFiles.length}/{MAX_FILE_COUNT})
              </label>
              <span className="text-[11px] text-[#6B7280]">파일당 최대 10MB (JPG, PNG, GIF, PDF)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px] font-bold text-[#13202B] hover:bg-[#F5FAFC] cursor-pointer"
            >
              📎 파일 첨부
            </button>

            {attachedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center justify-between px-3 py-2 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[6px] text-[13px]"
                  >
                    <span className="truncate text-[#13202B] font-medium max-w-[500px]">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-[12px] font-bold cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE8ED]">
            <button
              type="button"
              onClick={() => navigate("/qna")}
              className="px-6 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[8px] hover:bg-[#F5FAFC] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-8 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] shadow-sm cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
