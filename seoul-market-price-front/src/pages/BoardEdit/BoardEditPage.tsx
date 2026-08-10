import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getBoardPostApi, updateBoardPostApi, deleteBoardPostApi } from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type { BoardUpdateRequest } from "@/features/board/types/board.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BoardEditFormData {
  title: string;
  content: string;
}

export default function BoardEditPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const boardId = Number(postId);
  const loginUser = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  // 비로그인 접근 방어 (인증 초기화 완료 후 체크)
  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!isLogin()) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login", { replace: true });
    }
  }, [isAuthInitialized, navigate]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BoardEditFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = watch("title") || "";

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoardPostApi(boardId),
    enabled: !isNaN(boardId) && boardId > 0,
  });

  useEffect(() => {
    if (post && isAuthInitialized) {
      const curId = String(loginUser?.userId || "").trim().toLowerCase();
      const authorId = String(post.authorId || "").trim().toLowerCase();
      const curName = String(loginUser?.name || "").trim();
      const authorName = String(post.authorName || "").trim();

      const isAuthor =
        loginUser &&
        (loginUser.role === "ADMIN" ||
          (curId && authorId && (curId === authorId || curId.includes(authorId) || authorId.includes(curId))) ||
          (curName && authorName && curName === authorName));

      if (!isAuthor) {
        alert("수정 권한이 없습니다.");
        navigate(`/board/${boardId}`, { replace: true });
        return;
      }

      reset({
        title: post.title,
        content: post.content,
      });
    }
  }, [post, loginUser, isAuthInitialized, boardId, navigate, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: BoardUpdateRequest) => updateBoardPostApi(boardId, data),
    onSuccess: () => {
      alert("게시글이 성공적으로 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/board/${boardId}`);
    },
    onError: (err: Error) => {
      alert(`게시글 수정 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoardPostApi(boardId),
    onSuccess: () => {
      alert("게시글이 성공적으로 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate("/board");
    },
    onError: (err: Error) => {
      alert(`삭제 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const onSubmit = (formData: BoardEditFormData) => {
    updateMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
    });
  };

  const handleDelete = () => {
    if (window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      deleteMutation.mutate();
    }
  };

  if (isNaN(boardId) || boardId <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 text-center">
        <p className="text-rose-500 font-medium text-sm">유효하지 않은 게시글 번호입니다.</p>
        <Button variant="outline" className="mt-4 text-xs" onClick={() => navigate("/board")}>
          글목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 마이페이지 스타일 상단 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold tracking-widest uppercase rounded-full">
            EDIT POST
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
          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-400">
              기존 게시글 정보를 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-sm text-rose-500">
              오류가 발생했습니다: {(error as Error).message}
            </div>
          ) : (
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

              {/* 하단 버튼 */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="h-9 w-24 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    {updateMutation.isPending ? "수정 중..." : "수정"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/board")}
                    className="h-9 w-24 border-slate-200 text-xs text-slate-600 rounded-lg"
                  >
                    글목록
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-9 w-24 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  글삭제
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}