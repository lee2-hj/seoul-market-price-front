import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import * as api from "@/api/api";
import { createBoardPostApi } from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BoardWriteFormData {
  title: string;
  content: string;
}

export default function BoardWritePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    watch,
    formState: { errors },
  } = useForm<BoardWriteFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = watch("title") || "";

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; file: File | null }) => {
      // 1. 게시글 텍스트 등록
      const postRes = await createBoardPostApi({
        title: data.title,
        content: data.content,
      });

      const newBoardId = (postRes as any)?.id || (postRes as any)?.boardId;

      // 2. 첨부파일이 있고 api.ts에 업로드 함수가 구현되어 있으면 즉시 호출
      if (data.file && newBoardId) {
        const uploadFn = (api as any).uploadBoardAttachmentsApi;
        if (typeof uploadFn === "function") {
          try {
            await uploadFn(newBoardId, [data.file]);
          } catch (uploadErr) {
            console.error("첨부파일 업로드 실패:", uploadErr);
            alert("게시글은 등록되었으나 첨부파일 업로드 중 오류가 발생했습니다.");
          }
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
      alert(`게시글 등록 중 오류가 발생했습니다: ${err.message}`);
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
      file: selectedFile,
    });
  };

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-widest uppercase rounded-full">
            CREATE POST
          </div>
          <h1 className="text-3xl font-extrabold text-[#123047] tracking-tight">
            공지사항 글쓰기
          </h1>
          <p className="text-sm text-[#6B7280]">
            싸부(SSABU) 서비스의 새로운 소식을 등록합니다.
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
                <span className={`text-xs ${titleValue.length > 20 ? "text-rose-500 font-bold" : "text-[#6B7280]"}`}>
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
                <p className="text-xs text-rose-500">{errors.content.message}</p>
              )}
            </div>

            {/* 첨부파일 */}
            <div className="p-3.5 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] text-xs text-[#6B7280] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#123047]">첨부파일 :</span>
                {selectedFile && (
                  <span className="text-[#0F8AA8] font-bold">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                className="text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E6F4F2] file:text-[#0F766E] hover:file:bg-[#d0ece8] cursor-pointer"
              />
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
  );
}