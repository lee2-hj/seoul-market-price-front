import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X, Upload } from "lucide-react";

import {
  createBoardPostApi,
  uploadBoardAttachmentsApi,
  deleteBoardPostApi,
} from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";

interface BoardWriteFormData {
  title: string;
  content: string;
}

const MAX_FILE_COUNT = 5;
const MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_EXTENSIONS =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

export default function BoardWritePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // 비로그인 접근 방어
  useEffect(() => {
    if (!isLogin()) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BoardWriteFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = useWatch({ control, name: "title" }) || "";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    // 1. 개별 파일 용량 검증 (100MB)
    const oversizedFiles = rawFiles.filter(
      (file) => file.size > MAX_SINGLE_FILE_SIZE,
    );
    if (oversizedFiles.length > 0) {
      alert(
        `파일당 최대 용량은 100MB입니다.\n초과된 파일: ${oversizedFiles.map((f) => f.name).join(", ")}`,
      );
    }

    const validFiles = rawFiles.filter(
      (file) => file.size <= MAX_SINGLE_FILE_SIZE,
    );
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. 최대 개수 검증 (5개)
    const availableSlots = MAX_FILE_COUNT - selectedFiles.length;
    if (availableSlots <= 0) {
      alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록 가능합니다.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (validFiles.length > availableSlots) {
      alert(
        `최대 ${MAX_FILE_COUNT}개까지만 등록할 수 있어 ${availableSlots}개 파일만 추가되었습니다.`,
      );
      setSelectedFiles((prev) => [
        ...prev,
        ...validFiles.slice(0, availableSlots),
      ]);
    } else {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      files: File[];
    }) => {
      // 1. 게시글 텍스트 등록
      const postRes = await createBoardPostApi({
        title: data.title,
        content: data.content,
      });

      const rawRes = postRes as unknown as { boardId?: number; id?: number };
      const newBoardId = rawRes?.boardId || rawRes?.id;

      if (!newBoardId) {
        throw new Error("게시글 번호를 받아오지 못했습니다.");
      }

      // 2. 첨부파일이 있으면 업로드 (실패 시 롤백 삭제하여 등록 취소)
      if (data.files && data.files.length > 0) {
        try {
          await uploadBoardAttachmentsApi(newBoardId, data.files);
        } catch (uploadErr: unknown) {
          console.error("첨부파일 업로드 실패:", uploadErr);
          try {
            await deleteBoardPostApi(newBoardId);
          } catch (rollbackErr) {
            console.error("롤백 삭제 실패:", rollbackErr);
          }
          const err = uploadErr as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          throw new Error(
            err?.response?.data?.message ||
              err?.message ||
              "첨부파일 업로드 중 오류가 발생했습니다.",
          );
        }
      }

      return { boardId: newBoardId };
    },
    onSuccess: (res) => {
      alert("게시글이 성공적으로 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      if (res.boardId && res.boardId > 0) {
        navigate(`/board/${res.boardId}`);
      } else {
        navigate("/board");
      }
    },
    onError: (err: Error) => {
      alert(`게시글 등록에 실패했습니다: ${err.message}`);
    },
  });

  const onSubmit = (formData: BoardWriteFormData) => {
    if (!isLogin()) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    createMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      files: selectedFiles,
    });
  };

  return (
    <SectionSidebarLayout
      sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
      menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
    >
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-widest uppercase rounded-full">
            CREATE POST
          </div>
          <h1 className="text-3xl font-extrabold text-[#123047] tracking-tight">
            게시글 작성
          </h1>
          <p className="text-sm text-[#6B7280]">
            싸부(SSABU) 게시판에 새로운 글을 등록합니다.
          </p>
        </div>

        {/* 둥근 카드 폼 컨테이너 */}
        <div className="bg-white rounded-2xl shadow-xs border border-[#DCE8ED] p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 제목 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#13202B]">
                  제목
                </label>
                <span
                  className={`text-xs ${titleValue.length > 20 ? "text-rose-500 font-bold" : "text-[#6B7280]"}`}
                >
                  {titleValue.length} / 20자
                </span>
              </div>
              <Input
                type="text"
                placeholder="제목을 입력하세요"
                {...register("title", {
                  required: "제목을 입력하세요",
                  maxLength: {
                    value: 20,
                    message: "제목은 최대 20자까지 입력 가능합니다.",
                  },
                })}
                className="h-10 bg-[#F5FAFC] border-[#DCE8ED] text-xs text-[#13202B] focus-visible:ring-[#0F8AA8]"
              />
              {errors.title && (
                <p className="text-xs text-rose-500">{errors.title.message}</p>
              )}
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#13202B]">
                내용
              </label>
              <textarea
                rows={12}
                placeholder="내용을 입력하세요"
                {...register("content", {
                  required: "내용을 입력하세요",
                })}
                className="w-full rounded-xl border border-[#DCE8ED] bg-[#F5FAFC] p-4 text-xs text-[#13202B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F8AA8]"
              />
              {errors.content && (
                <p className="text-xs text-rose-500">
                  {errors.content.message}
                </p>
              )}
            </div>

            {/* 첨부파일 (최대 5개) */}
            <div className="p-4 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#123047]">
                  <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
                  <span>첨부파일</span>
                  <span className="text-[#0F8AA8] font-semibold">
                    ({selectedFiles.length}/{MAX_FILE_COUNT})
                  </span>
                </div>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E6F4F2] hover:bg-[#d0ece8] text-[#0F766E] text-xs font-bold rounded-md cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  파일 선택
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_FILE_EXTENSIONS}
                    disabled={selectedFiles.length >= MAX_FILE_COUNT}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between p-2.5 bg-white border border-[#DCE8ED] rounded-lg text-xs"
                    >
                      <span className="font-medium text-[#13202B] truncate max-w-[80%]">
                        {file.name}
                        <span className="text-[11px] text-[#6B7280] ml-2 font-normal">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-[#9CA3AF] hover:text-rose-500 p-1 rounded transition-colors border-none bg-transparent cursor-pointer"
                        title="파일 제거"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF]">
                  최대 {MAX_FILE_COUNT}개까지 파일을 첨부할 수 있습니다. (다중
                  선택 가능)
                </p>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#DCE8ED]">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-10 w-28 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                {createMutation.isPending ? "등록 중..." : "등록"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/board")}
                className="h-10 w-28 border-[#DCE8ED] text-xs text-[#6B7280] hover:bg-[#F0F7FA] rounded-lg cursor-pointer"
              >
                글목록
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </SectionSidebarLayout>
  );
}
