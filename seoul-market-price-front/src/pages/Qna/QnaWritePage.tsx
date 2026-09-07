import { useEffect, useRef, useState, useCallback } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Paperclip, Upload, FileText } from "lucide-react";
import axios from "axios";
import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import { uploadQnaAttachmentsApi } from "@/api/api";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* 1. TypeScript 타입 선언 */
type CreateQnaDtoType = {
  title: string;
  questionContent: string;
  publicQuestion: boolean;
};

type QnaWriteFormType = {
  title: string;
  content: string;
  publicQuestion: boolean;
};

type QnaCreateResultType = {
  id?: number | string;
  qnaId?: number | string;
  boardId?: number | string;
  data?: {
    id?: number | string;
    qnaId?: number | string;
  };
  [key: string]: unknown;
};

/* 2. 상수 정의 */
const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf"];

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* 3. API 연동 함수 */
async function createQnaApi(data: CreateQnaDtoType): Promise<QnaCreateResultType> {
  const response = await apiMiddleware.post("/api/qnas", data);
  return response.data;
}

/* 4. 메인 QnA 작성 페이지 컴포넌트 */
export default function QnaWritePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLoggedIn = isLogin();

  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  const { control, setValue, getValues } = useForm<QnaWriteFormType>({
    defaultValues: {
      title: "",
      content: "",
      publicQuestion: true,
    },
  });

  const formValues = useWatch({ control });
  const titleValue = formValues?.title ?? "";
  const contentValue = formValues?.content ?? "";
  const publicQuestionValue = formValues?.publicQuestion ?? true;

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  /* TanStack Query: QnA 생성 Mutation */
  const createMutation = useMutation({
    mutationFn: async (dto: CreateQnaDtoType) => {
      const res = await createQnaApi(dto);
      const resData = (res || {}) as QnaCreateResultType;
      const innerData = (resData?.data || {}) as Record<string, unknown>;
      const extractedId =
        resData?.id ??
        resData?.qnaId ??
        resData?.boardId ??
        innerData?.id ??
        innerData?.qnaId ??
        (typeof res === "number" ? res : null);

      if (attachedFiles.length > 0 && extractedId) {
        try {
          await uploadQnaAttachmentsApi(Number(extractedId), attachedFiles);
        } catch (uploadErr) {
          const errMsg = axios.isAxiosError(uploadErr)
            ? uploadErr.response?.data?.message || uploadErr.message
            : "첨부파일 업로드 중 오류가 발생했습니다.";
          alert(`게시글은 등록되었으나 첨부파일 업로드에 실패했습니다.\n(${errMsg})`);
        }
      }
      return { ...resData, id: extractedId };
    },
    onSuccess: () => {
      alert("질의응답이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnas"] });
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

  const handleSelectFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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
  }, [attachedFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCancelWrite = useCallback(() => {
    navigate("/qna");
  }, [navigate]);

  const handleSubmitQnaWrite = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("로그인 후 질의응답을 작성할 수 있습니다.");
      return navigate("/login");
    }
    const currentValues = getValues();
    const trimmedTitle = currentValues.title.trim();
    const trimmedContent = currentValues.content.trim();
    if (!trimmedTitle) return alert("제목을 입력해주세요.");
    if (trimmedTitle.length > 200) return alert("제목은 200자 이내로 입력해주세요.");
    if (!trimmedContent) return alert("내용을 입력해주세요.");
    if (trimmedContent.length > 5000) return alert("내용은 5,000자 이내로 입력해주세요.");

    createMutation.mutate({
      title: trimmedTitle,
      questionContent: trimmedContent,
      publicQuestion: currentValues.publicQuestion,
    });
  }, [isLoggedIn, navigate, getValues, createMutation]);

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      <div className="flex min-h-[calc(100vh-200px)] w-full justify-center bg-[#F5FAFC] px-4 py-8 md:px-8 md:py-12">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center pb-6 border-b border-[#DCE8ED]">
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 작성</h1>
            <p className="text-[14px] text-[#6B7280] mt-1.5">궁금한 점을 자세히 작성해주시면 성실히 답변해 드리겠습니다.</p>
          </div>

          <form onSubmit={handleSubmitQnaWrite} className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-4 sm:p-8 shadow-sm">
            <div>
              <Label htmlFor="author-display" className="block text-[13px] font-bold text-[#13202B] mb-2">
                작성자
              </Label>
              <Input
                id="author-display"
                type="text"
                value={getLoginUser()?.name || getLoginUser()?.userId || "사용자"}
                disabled
                className="w-full h-11 px-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#6B7280] font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="qna-write-title" className="block text-[13px] font-bold text-[#13202B] mb-2">
                제목 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qna-write-title"
                type="text"
                name="title"
                value={titleValue}
                onChange={(e) => setValue("title", e.target.value)}
                placeholder="제목을 입력하세요 (200자 이내)"
                maxLength={200}
                className="w-full h-11 px-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus-visible:ring-1 focus-visible:ring-[#0F8AA8] focus-visible:border-[#0F8AA8]"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px]">
              <Checkbox
                id="publicQuestion"
                checked={publicQuestionValue}
                onCheckedChange={(checked) => setValue("publicQuestion", Boolean(checked))}
                className="size-4 border-[#DCE8ED] data-[state=checked]:bg-[#0F8AA8] data-[state=checked]:border-[#0F8AA8]"
              />
              <Label htmlFor="publicQuestion" className="text-[13px] font-semibold text-[#13202B] cursor-pointer select-none">
                공개글로 등록합니다. (체크 해제 시 비밀글로 등록되어 작성자와 관리자만 확인 가능)
              </Label>
            </div>

            <div>
              <Label htmlFor="qna-write-content" className="block text-[13px] font-bold text-[#13202B] mb-2">
                내용 <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="qna-write-content"
                name="content"
                value={contentValue}
                onChange={(e) => setValue("content", e.target.value)}
                placeholder="궁금하신 내용을 입력해주세요."
                rows={10}
                maxLength={5000}
                className="w-full p-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8] resize-none"
              />
            </div>

            <div>
              <Label className="block text-[13px] font-bold text-[#13202B] mb-2">첨부파일</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSelectFile}
                multiple
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 h-auto bg-[#F5FAFC] border border-[#DCE8ED] hover:bg-[#EBF5F8] hover:text-[#0F8AA8] rounded-[8px] text-[13px] font-bold text-[#0F8AA8] transition-colors"
              >
                <Paperclip className="size-4" />
                <span>파일 선택 (최대 5개, 각 50MB)</span>
              </Button>
              {attachedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[6px] text-[13px]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="size-4 text-[#0F8AA8] shrink-0" />
                        <span className="font-semibold text-[#13202B] truncate">{file.name}</span>
                        <span className="text-[11px] text-[#6B7280]">({(file.size / (1024 * 1024)).toFixed(1)}MB)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 font-bold hover:underline hover:bg-transparent h-auto p-0 ml-2 shrink-0"
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#DCE8ED]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelWrite}
                className="px-6 py-3 h-auto border border-[#DCE8ED] bg-[#F5FAFC] hover:bg-[#EBF5F8] rounded-[8px] text-[14px] font-bold text-[#13202B] transition-colors"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 h-auto bg-[#0F8AA8] hover:bg-[#0D7893] rounded-[8px] text-[14px] font-bold text-white transition-colors disabled:opacity-50"
              >
                <Upload className="size-4" />
                <span>{createMutation.isPending ? "등록 중..." : "등록하기"}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SectionSidebarLayout>
  );
}
