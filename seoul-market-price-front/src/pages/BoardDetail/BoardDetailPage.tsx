import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getBoardPostApi, deleteBoardPostApi } from "@/api/boardApi";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-screen bg-[#fafcf9] py-12 px-4 text-center">
        <p className="text-rose-500 font-medium text-sm">유효하지 않은 게시글 번호입니다.</p>
        <Link to="/board" className="mt-4 inline-block text-[#4c9b55] text-xs underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* 오리지널 헤더 */}
        <div className="text-center space-y-2 mb-8">
          <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            BOARD DETAIL
          </span>
          <h1 className="text-[36px] font-black text-[#242b23] tracking-tight">
            게시판
          </h1>
          <p className="text-[15px] text-[#667065]">
            서울시 농수산물 가격 정보 서비스의 주요 공지사항과 시민 소통 공간입니다.
          </p>
        </div>

        {/* 상세 카드 박스 */}
        <div className="bg-white border border-[#dce4da] rounded-[12px] p-6 md:p-8 space-y-6 shadow-[0_7px_24px_rgba(45,70,45,0.05)]">
          {isLoading ? (
            <div className="py-20 text-center text-[#8a9388] text-[14px]">
              게시글 정보를 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-rose-500 text-[14px]">
              오류가 발생했습니다: {(error as Error).message}
            </div>
          ) : post ? (
            <>
              {/* 제목 & 메타 정보 */}
              <div className="space-y-3 pb-6 border-b border-[#edf1ec]">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      post.postType === "NOTICE"
                        ? "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fff0c7] text-[#bd7b00]"
                        : "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#e8f4e9] text-[#4c8c53]"
                    }
                  >
                    {post.postType === "NOTICE" ? "공지" : "일반"}
                  </span>
                </div>
                <h2 className="text-[22px] font-bold text-[#242b23] leading-snug">
                  {post.title}
                </h2>
                <div className="flex items-center gap-4 text-[13px] text-[#667065]">
                  <span>작성자: <strong className="text-[#343c33] font-bold">{post.authorName}</strong></span>
                  <span>작성일: {post.createdAt}</span>
                  <span>조회수: {post.viewCount}</span>
                </div>
              </div>

              {/* 본문 */}
              <div className="py-4 text-[14px] text-[#384138] leading-relaxed whitespace-pre-wrap min-h-[220px]">
                {post.content}
              </div>
            </>
          ) : null}

          {/* 하단 버튼 */}
          {post && (
            <div className="flex items-center justify-between pt-6 border-t border-[#edf1ec]">
              <div className="flex items-center gap-2">
                <Link to={`/board/${boardId}/edit`}>
                  <Button className="h-[42px] px-6 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold rounded-[7px]">
                    수정
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => navigate("/board")}
                  className="h-[42px] px-6 border-[#dce4da] text-[#5a6459] hover:bg-[#f0f6ef] text-[14px] font-bold rounded-[7px]"
                >
                  목록으로
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-[42px] px-6 border-rose-200 text-rose-600 hover:bg-rose-50 text-[14px] font-bold rounded-[7px]"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}