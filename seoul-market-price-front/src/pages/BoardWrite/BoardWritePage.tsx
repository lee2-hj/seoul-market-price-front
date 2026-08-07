import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createBoardPostApi } from "@/api/api";
import type { BoardCreateRequest } from "@/features/board/types/board.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BoardWriteFormData {
  title: string;
  content: string;
}

export default function BoardWritePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    mutationFn: (data: BoardCreateRequest) => createBoardPostApi(data),
    onSuccess: (res) => {
      alert("게시글이 성공적으로 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
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
    createMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 마이페이지 스타일 상단 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold tracking-widest uppercase rounded-full">
            CREATE POST
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            게시판
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-400">
            공지사항과 사용자 게시글을 확인하실 수 있습니다.
          </p>
        </div>

        {/* 둥근 카드 폼 컨테이너 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 제목 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  제목
                </label>
                <span className={`text-xs ${titleValue.length > 20 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
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
                className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs focus-visible:ring-emerald-500"
              />
              {errors.title && (
                <p className="text-xs text-rose-500">{errors.title.message}</p>
              )}
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                내용
              </label>
              <textarea
                rows={12}
                placeholder="내용을 입력하세요"
                {...register("content", {
                  required: "내용을 입력하세요",
                })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.content && (
                <p className="text-xs text-rose-500">{errors.content.message}</p>
              )}
            </div>

            {/* 첨부파일 */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-300">첨부파일 : </span>
              <input type="file" className="text-xs text-slate-500" />
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-10 w-28 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {createMutation.isPending ? "등록 중..." : "등록"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/board")}
                className="h-10 w-28 border-slate-200 text-xs text-slate-600 rounded-lg"
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