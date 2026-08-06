import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit3, Trash2, Calendar, Eye, User, Megaphone, FileText } from "lucide-react";

import { getBoardPostApi, deleteBoardPostApi } from "@/api/boardApi";
import { Button } from "@/components/ui/button";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function BoardDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const boardId = Number(postId);

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoardPostApi(boardId),
    enabled: !isNaN(boardId) && boardId > 0,
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

  const handleDelete = () => {
    if (window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      deleteMutation.mutate();
    }
  };

  if (isNaN(boardId) || boardId <= 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 text-center">
        <p className="text-rose-500 font-medium">유효하지 않은 게시글 번호입니다.</p>
        <Link to="/board" className="mt-4 inline-block text-emerald-600 underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 상단 네비게이션 버튼 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/board")}
            className="gap-2 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Button>

          {post && (
            <div className="flex items-center gap-2">
              <Link to={`/board/${boardId}/edit`}>
                <Button variant="outline" className="gap-1.5 text-slate-700 dark:text-slate-200">
                  <Edit3 className="w-4 h-4" />
                  수정
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-800"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          )}
        </div>

        {/* 게시글 본문 영역 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400">
              게시글 정보를 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-rose-500">
              게시글을 불러올 수 없습니다: {(error as Error).message}
            </div>
          ) : post ? (
            <>
              <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                  {post.postType === "NOTICE" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      <Megaphone className="w-3.5 h-3.5" />
                      공지
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5" />
                      일반
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-snug">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 pt-2">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    {post.authorName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(post.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-slate-400" />
                    조회 {post.viewCount}
                  </span>
                </div>
              </div>

              <div className="py-4 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[200px]">
                {post.content}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}