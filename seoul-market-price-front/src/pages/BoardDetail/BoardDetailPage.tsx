import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Edit2, Trash2, Send } from "lucide-react";

import {
  getBoardPostApi,
  deleteBoardPostApi,
  getBoardCommentsApi,
  createBoardCommentApi,
  updateBoardCommentApi,
  deleteBoardCommentApi,
} from "@/api/api";
import { getLoginUser, isLogin, type LoginUser } from "@/features/auth/utils/auth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

export default function BoardDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const boardId = Number(postId);

  // 로그인 상태 및 유저 정보 안전 파싱
  let loginUser: LoginUser | null = null;
  let isLoggedIn = false;
  try {
    loginUser = getLoginUser();
    isLoggedIn = isLogin();
  } catch {
    loginUser = null;
    isLoggedIn = false;
  }

  // 댓글 입력 및 수정 State
  const [commentContent, setCommentContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // 게시글 정보 Query
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoardPostApi(boardId),
    enabled: !isNaN(boardId) && boardId > 0,
  });

  // 댓글 목록 Query
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["boardComments", boardId],
    queryFn: () => getBoardCommentsApi(boardId),
    enabled: !isNaN(boardId) && boardId > 0,
  });

  // 게시글 삭제 Mutation
  const deletePostMutation = useMutation({
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

  // 댓글 등록 Mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      createBoardCommentApi(boardId, { content }),
    onSuccess: () => {
      setCommentContent("");
      queryClient.invalidateQueries({ queryKey: ["boardComments", boardId] });
    },
    onError: (err: Error) => {
      alert(`댓글 등록 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  // 댓글 수정 Mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateBoardCommentApi(commentId, { content }),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingContent("");
      queryClient.invalidateQueries({ queryKey: ["boardComments", boardId] });
    },
    onError: (err: Error) => {
      alert(`댓글 수정 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  // 댓글 삭제 Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteBoardCommentApi(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardComments", boardId] });
    },
    onError: (err: Error) => {
      alert(`댓글 삭제 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const handleDeletePost = () => {
    if (window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      deletePostMutation.mutate();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("로그인 후 댓글을 작성할 수 있습니다.");
      return;
    }
    const trimmed = commentContent.trim();
    if (!trimmed) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }
    createCommentMutation.mutate(trimmed);
  };

  const handleStartEditComment = (commentId: number, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingContent(currentContent);
  };

  const handleSaveEditComment = (commentId: number) => {
    const trimmed = editingContent.trim();
    if (!trimmed) {
      alert("수정할 댓글 내용을 입력해주세요.");
      return;
    }
    updateCommentMutation.mutate({ commentId, content: trimmed });
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const canModifyComment = (commentAuthorId?: string, commentAuthorName?: string) => {
    if (!loginUser) return false;
    if (loginUser.role === "ADMIN") return true;
    if (loginUser.userId && commentAuthorId && loginUser.userId === commentAuthorId) return true;
    if (loginUser.name && commentAuthorName && loginUser.name === commentAuthorName) return true;
    return false;
  };

  if (isNaN(boardId) || boardId <= 0) {
    return (
      <div className="min-h-screen bg-[#fafcf9]">
        <Header />
        <div className="py-12 px-4 text-center">
          <p className="text-rose-500 font-medium text-sm">유효하지 않은 게시글 번호입니다.</p>
          <Link to="/board" className="mt-4 inline-block text-[#4c9b55] text-xs underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const safeComments = Array.isArray(comments) ? comments : [];

  return (
    <div className="min-h-screen bg-[#fafcf9]">
      {/* 상단바 배치 */}
      <Header />

      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          {/* 헤더 */}
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
              <div className="py-20 text-center space-y-4">
                <p className="text-rose-500 text-[14px]">
                  오류가 발생했습니다: {(error as Error)?.message || "게시글 정보를 불러올 수 없습니다."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/board")}
                  className="h-[42px] px-6 border-[#dce4da] text-[#5a6459] text-[14px] font-bold rounded-[7px]"
                >
                  목록으로 돌아가기
                </Button>
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
                <div className="py-4 text-[15px] text-[#384138] leading-relaxed whitespace-pre-wrap min-h-[200px]">
                  {post.content}
                </div>

                {/* 하단 버튼 */}
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
                    onClick={handleDeletePost}
                    disabled={deletePostMutation.isPending}
                    className="h-[42px] px-6 border-rose-200 text-rose-600 hover:bg-rose-50 text-[14px] font-bold rounded-[7px]"
                  >
                    {deletePostMutation.isPending ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-20 text-center space-y-4">
                <p className="text-[#8a9388] text-[14px]">게시글을 찾을 수 없습니다.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/board")}
                  className="h-[42px] px-6 border-[#dce4da] text-[#5a6459] text-[14px] font-bold rounded-[7px]"
                >
                  목록으로 돌아가기
                </Button>
              </div>
            )}
          </div>

          {/* 댓글 영역 */}
          {post && (
            <div className="bg-white border border-[#dce4da] rounded-[12px] p-6 md:p-8 space-y-6 shadow-[0_7px_24px_rgba(45,70,45,0.05)]">
              <div className="flex items-center gap-2 pb-4 border-b border-[#edf1ec]">
                <MessageSquare className="w-5 h-5 text-[#4c9b55]" />
                <h3 className="text-[18px] font-bold text-[#242b23]">
                  댓글 <span className="text-[#4c9b55] font-extrabold">{safeComments.length}</span>
                </h3>
              </div>

              {/* 댓글 작성 폼 */}
              {isLoggedIn ? (
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#5a6459]">
                    <span>작성자: <strong className="text-[#384138]">{loginUser?.name || "로그인 회원"}</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      placeholder="댓글을 작성해 주세요. (타인에 대한 비방이나 불법적인 내용은 제재될 수 있습니다.)"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="flex-1 rounded-[8px] border border-[#d5dfd6] bg-white p-3 text-[14px] text-[#384138] placeholder:text-[#939c92] focus:outline-none focus:border-[#4c9b55]"
                    />
                    <Button
                      type="submit"
                      disabled={createCommentMutation.isPending}
                      className="h-full px-5 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold rounded-[8px] flex flex-col items-center justify-center gap-1 cursor-pointer min-w-[80px]"
                    >
                      <Send className="w-4 h-4" />
                      {createCommentMutation.isPending ? "등록중" : "등록"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-[#f8faf7] border border-[#e1e8e2] rounded-[8px] text-center space-y-2">
                  <p className="text-[14px] text-[#667065]">로그인 후 댓글을 작성하실 수 있습니다.</p>
                </div>
              )}

              {/* 댓글 리스트 */}
              <div className="space-y-4 pt-2">
                {isCommentsLoading ? (
                  <div className="py-8 text-center text-[13px] text-[#8a9388]">댓글을 불러오는 중입니다...</div>
                ) : safeComments.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[#8a9388]">등록된 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>
                ) : (
                  safeComments.map((comment) => {
                    const canModify = canModifyComment(comment.authorId, comment.authorName);
                    const isEditing = editingCommentId === comment.commentId;

                    return (
                      <div
                        key={comment.commentId}
                        className="p-4 bg-[#fafcf9] border border-[#edf1ec] rounded-[10px] space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong className="text-[14px] font-bold text-[#344037]">{comment.authorName}</strong>
                            <span className="text-[12px] text-[#939c92]">{comment.createdAt}</span>
                          </div>

                          {/* 본인 또는 관리자만 수정/삭제 버튼 노출 */}
                          {canModify && !isEditing && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditComment(comment.commentId, comment.content)}
                                className="text-[12px] text-[#6a7469] hover:text-[#4c9b55] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.commentId)}
                                className="text-[12px] text-rose-500 hover:text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                삭제
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full rounded-[6px] border border-[#4c9b55] bg-white p-2.5 text-[14px] text-[#384138] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEditComment(comment.commentId)}
                                disabled={updateCommentMutation.isPending}
                                className="h-8 px-3 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[12px] font-bold rounded-[6px]"
                              >
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCommentId(null)}
                                className="h-8 px-3 border-[#dce4da] text-[#5a6459] text-[12px] font-bold rounded-[6px]"
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#384138] leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}