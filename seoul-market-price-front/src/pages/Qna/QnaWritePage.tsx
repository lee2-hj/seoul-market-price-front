import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, FileText } from "lucide-react";
import axios from "axios";

import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import { uploadQnaAttachmentsApi } from "@/api/api";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; /* 50MB */
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
    mutationFn: async (dto: CreateQnaDto) => {
      // 1. Q&A 게시글 등록
      const res = await createQnaApi(dto);
      const resData = (res || {}) as Record<string, unknown>;
      const innerData = (resData?.data || {}) as Record<string, unknown>;

      const extractedId =
        resData?.id ??
        resData?.qnaId ??
        resData?.boardId ??
        innerData?.id ??
        innerData?.qnaId ??
        (typeof res === "number" ? res : null);

      // 2. 첨부파일이 있으면 업로드 API 호출
      if (attachedFiles.length > 0 && extractedId) {
        try {
          await uploadQnaAttachmentsApi(Number(extractedId), attachedFiles);
        } catch (uploadErr) {
          console.error("Q&A 첨부파일 업로드 실패:", uploadErr);
          // 백엔드 엔드포인트 응답 확인을 위해 에러 메시지 알림
          const errMsg = axios.isAxiosError(uploadErr)
            ? uploadErr.response?.data?.message || uploadErr.message
            : "첨부파일 업로드 중 오류가 발생했습니다.";
          alert(`게시글은 등록되었으나 첨부파일 업로드에 실패했습니다.\n(${errMsg})`);
        }
      }

      return { ...resData, id: extractedId };
    },
    onSuccess: (data) => {
      const resData = (data || {}) as Record<string, unknown>;
      const newPostId = resData?.id || Date.now();

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
        attachName: attachedFiles[0]?.name,
        files: attachedFiles.map((f, idx) => ({
          id: idx + 1,
          name: f.name,
          size: f.size,
        })),
      };

      try {
        const storedPosts = localStorage.getItem("qnaPosts");
        const localPosts = storedPosts ? (JSON.parse(storedPosts) as unknown[]) : [];
        localStorage.setItem("qnaPosts", JSON.stringify([newPostObj, ...localPosts]));
      } catch { /* 무시 */ }

      alert("질의응답이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnasList"] });
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(newPostId)] });
      queryClient.invalidateQueries({ queryKey: ["qnaAttachments", String(newPostId)] });
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
        alert(`${file.name}\n파일 크기가 50MB를 초과했습니다.`);
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
          <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 작성</h1>
          <p className="text-[14px] text-[#6B7280] mt-1.5">
            궁금한 점을 자세히 작성해주시면 성실히 답변해 드리겠습니다.
          </p>
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

          {/* 첨부파일 박스 */}
          <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[12px] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F8AA8]">
                <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
                <span>첨부파일 ({attachedFiles.length}/{MAX_FILE_COUNT})</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4F2] hover:bg-[#d0ece8] text-[#0F766E] text-[13px] font-bold rounded-[8px] transition-colors cursor-pointer border-none shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>파일 선택</span>
              </button>
            </div>

            <p className="text-[12px] text-[#6B7280]">
              최대 5개까지 파일을 첨부할 수 있습니다. (다중 선택 가능)
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              className="hidden"
            />

            {attachedFiles.length > 0 && (
              <div className="pt-2 mt-2 border-t border-[#DCE8ED]/60 space-y-1.5">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${idx}`}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#0F8AA8] shrink-0" />
                      <span className="truncate text-[#13202B] font-medium max-w-[450px]">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-[#6B7280] shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-500 hover:text-rose-700 text-[12px] font-bold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#DCE8ED]">
            <button
              type="button"
              onClick={() => navigate("/qna")}
              className="px-8 py-2.5 bg-white border border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[8px] hover:bg-[#F5FAFC] cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-10 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </SectionSidebarLayout>
  );
}
