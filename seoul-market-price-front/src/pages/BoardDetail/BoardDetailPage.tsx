import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Edit2, Trash2, Send, Paperclip, Download } from "lucide-react";
import type {
  BoardComment,
  AttachmentResponse,
} from "@/features/board/types/board.types";
import {
  downloadBoardAttachmentApi,
  getBoardFullDetailApi,
  getBoardCommentsApi,
  deleteBoardPostApi,
  createBoardCommentApi,
  updateBoardCommentApi,
  deleteBoardCommentApi,
} from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { maskAuthorName } from "@/lib/utils";

function formatBoardDate(dateStr?: string): string {
  if (!dateStr) return "-";
  if (dateStr.includes("T")) {
    const [d, t] = dateStr.split("T");
    return `${d.replace(/-/g, ".")} ${t ? t.slice(0, 5) : ""}`.trim();
  }
  return dateStr.replace(/-/g, ".");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeIdentity(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function getCommentAuthorName(comment: BoardComment): string {
  return comment.writerName || comment.name || "-";
}

export default function BoardDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const boardId = Number(postId);
  const isValidBoardId = !Number.isNaN(boardId) && boardId > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [boardId]);

  // 로그인 상태 및 유저 정보 반응형 구독
  const loginUser = useAuthStore((state) => state.user);
  const isLoggedIn = isLogin();

  // 댓글 입력 및 수정 State
  const [commentContent, setCommentContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // 게시글 정보 Query
  const { data: fullDetail, isLoading, isError, error } = useQuery({
    queryKey: ["boardFull", boardId],
    queryFn: () => getBoardFullDetailApi(boardId),
    enabled: isValidBoardId,
  });

  // 댓글 목록 Query
  const post = fullDetail?.detail;
  const comments = fullDetail?.comments ?? [];
  const isCommentsLoading = isLoading;

  // 첨부파일 목록 Query
  const attachments: AttachmentResponse[] = fullDetail?.attachments ?? [];

  const refreshComments = async () => {
    const nextComments = await getBoardCommentsApi(boardId);
    queryClient.setQueryData(["boardFull", boardId], (current: typeof fullDetail) =>
      current ? { ...current, comments: nextComments } : current,
    );
  };

  // 첨부파일 다운로드 핸들러
  const handleDownload = async (attachmentId: number, originalFilename: string) => {
    try {
      const res = await downloadBoardAttachmentApi(boardId, attachmentId);
      if (res.url) {
        const a = document.createElement("a");
        a.href = res.url;
        a.download = res.originalFilename || originalFilename || "download";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch (err) {
      console.error("다운로드 실패:", err);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 게시글 삭제 Mutation
  const deletePostMutation = useMutation({
    mutationFn: () => deleteBoardPostApi(boardId),
    onSuccess: () => {
      alert("게시글이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      navigate("/board");
    },
    onError: (err: unknown) => {
      alert(`삭제 실패: ${getErrorMessage(err, "삭제 권한이 없거나 오류가 발생했습니다.")}`);
    },
  });

  // 댓글 작성 Mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createBoardCommentApi(boardId, { content }),
    onSuccess: async () => {
      setCommentContent("");
      await refreshComments();
    },
    onError: (err: unknown) => {
      alert(`댓글 등록 실패: ${getErrorMessage(err, "오류가 발생했습니다.")}`);
    },
  });

  // 댓글 수정 Mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateBoardCommentApi(boardId, commentId, { content }),
    onSuccess: async () => {
      setEditingCommentId(null);
      setEditingContent("");
      await refreshComments();
    },
    onError: (err: unknown) => {
      alert(`댓글 수정 실패: ${getErrorMessage(err, "수정 권한이 없거나 오류가 발생했습니다.")}`);
    },
  });

  // 댓글 삭제 Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteBoardCommentApi(boardId, commentId),
    onSuccess: async () => {
      await refreshComments();
    },
    onError: (err: unknown) => {
      alert(`댓글 삭제 실패: ${getErrorMessage(err, "삭제 권한이 없거나 오류가 발생했습니다.")}`);
    },
  });

  const handleDeletePost = () => {
    if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
      deletePostMutation.mutate();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }
    if (!commentContent.trim()) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }
    createCommentMutation.mutate(commentContent.trim());
  };

  const handleStartEditComment = (commentId: number, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingContent(currentText);
  };

  const handleSaveEditComment = (commentId: number) => {
    if (!editingContent.trim()) {
      alert("수정할 댓글 내용을 입력해 주세요.");
      return;
    }
    updateCommentMutation.mutate({ commentId, content: editingContent.trim() });
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm("댓글을 삭제하시겠습니까?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  // 작성자 본인 및 관리자 권한 확인
  const canModifyComment = (comment: BoardComment) => {
    if (!loginUser) return false;
    if (loginUser.role === "ADMIN" || loginUser.role === "ROLE_ADMIN") return true;

    const targetName = normalizeIdentity(getCommentAuthorName(comment));
    const curName = normalizeIdentity(loginUser.name);
    return Boolean(curName && targetName && curName === targetName);
  };

  const canModifyPost = (postAuthorId?: string, postAuthorName?: string) => {
    if (!loginUser) return false;
    if (loginUser.role === "ADMIN") return true;

    const curId = normalizeIdentity(loginUser.userId);
    const targetId = normalizeIdentity(postAuthorId);
    if (curId && targetId && (curId === targetId || curId.includes(targetId) || targetId.includes(curId))) return true;

    const curName = normalizeIdentity(loginUser.name);
    const targetName = normalizeIdentity(postAuthorName);
    if (curName && targetName && curName === targetName) return true;

    return false;
  };

  const handleGoToList = () => {
    navigate("/board");
  };

  if (isNaN(boardId) || boardId <= 0) {
    return (
      <div className="min-h-screen bg-[#F5FAFC]">
        <div className="py-12 px-4 text-center">
          <p className="text-rose-500 font-medium text-sm">유효하지 않은 게시글 번호입니다.</p>
          <button
            type="button"
            onClick={handleGoToList}
            className="mt-4 inline-block text-[#0F8AA8] text-xs font-semibold no-underline bg-transparent border-none cursor-pointer hover:underline"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const safeComments = Array.isArray(comments) ? comments : [];

  return (
    <div className="min-h-screen bg-[#F5FAFC]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          {/* 헤더 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              SSABU CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#123047] tracking-tight">
              {post?.postType === "NOTICE" ? "공지사항 상세" : "게시판 상세"}
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              {post?.postType === "NOTICE"
                ? "싸부(SSABU) 부동산 실거래 및 시세 분석 서비스의 주요 소식을 전해드립니다."
                : "싸부(SSABU) 이용자들과 부동산 관련 다양한 이야기를 나누는 공간입니다."}
            </p>
          </div>

          {/* 상세 카드 박스 */}
          <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-6 md:p-8 space-y-6 shadow-xs">
            {isLoading ? (
              <div className="py-20 text-center text-[#6B7280] text-[14px]">
                게시글 정보를 불러오는 중입니다...
              </div>
            ) : isError ? (
              <div className="py-20 text-center space-y-4">
                <div className="text-[36px]">🚫</div>
                <h3 className="text-[18px] font-bold text-[#123047]">
                  존재하지 않거나 삭제된 게시글입니다.
                </h3>
                <p className="text-rose-500 text-[14px]">
                  {(error as Error)?.message || "게시글 정보를 불러올 수 없습니다."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/board")}
                  className="h-[42px] px-6 border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px]"
                >
                  목록으로 돌아가기
                </Button>
              </div>
            ) : post ? (
              <>
                {/* 제목 & 메타 정보 */}
                <div className="space-y-3 pb-6 border-b border-[#DCE8ED]">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        post.postType === "NOTICE"
                          ? "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                          : "px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#E6F4F2] text-[#0F766E]"
                      }
                    >
                      {post.postType === "NOTICE" ? "공지" : "일반"}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-bold text-[#123047] leading-snug">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-[13px] text-[#6B7280]">
                    <span>작성자: <strong className="text-[#13202B] font-bold">{maskAuthorName(post.authorName)}</strong></span>
                    <span>작성일: {formatBoardDate(post.createdAt)}</span>
                    <span>조회수: {post.viewCount}</span>
                  </div>
                </div>

                {/* 본문 */}
                <div className="py-4 text-[15px] text-[#13202B] leading-relaxed whitespace-pre-wrap min-h-[160px]">
                  {post.content}
                </div>

                {/* 첨부파일 영역 */}
                {attachments.length > 0 && (
                  <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[10px] space-y-2">
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0B5E73]">
                      <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
                      <span>첨부파일 ({attachments.length}개)</span>
                    </div>
                    <div className="space-y-1.5">
                      {attachments.map((file, idx) => {
                        const fileId = file.attachmentId ?? file.id ?? idx;
                        const fileName = file.originalFilename || file.fileName || "첨부파일";
                        const fileSize = file.size ?? file.fileSize ?? 0;
                        return (
                          <div
                            key={fileId}
                            className="flex items-center justify-between p-2.5 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px] gap-2"
                          >
                            <span className="font-medium text-[#13202B] truncate">
                              {fileName}
                              <span className="text-[11px] text-[#6B7280] ml-2 font-normal">
                                ({(fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownload(Number(fileId), fileName)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[12px] font-bold rounded-[6px] transition-colors cursor-pointer shrink-0 shadow-xs border-none"
                            >
                              <Download className="w-3.5 h-3.5" /> 다운로드
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 하단 버튼 */}
                <div className="flex items-center justify-between pt-6 border-t border-[#DCE8ED]">
                  <div className="flex items-center gap-2">
                    {canModifyPost(post.authorId, post.authorName) && (
                      <Link to={`/board/${boardId}/edit`}>
                        <Button className="h-[42px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] cursor-pointer">
                          수정
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleGoToList}
                      className="h-[42px] px-6 border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[7px] cursor-pointer"
                    >
                      목록으로
                    </Button>
                  </div>

                  {canModifyPost(post.authorId, post.authorName) && (
                    <Button
                      variant="outline"
                      onClick={handleDeletePost}
                      disabled={deletePostMutation.isPending}
                      className="h-[42px] px-6 border-rose-200 text-rose-600 hover:bg-rose-50 text-[14px] font-bold rounded-[7px] cursor-pointer"
                    >
                      {deletePostMutation.isPending ? "삭제 중..." : "삭제"}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center space-y-4">
                <p className="text-[#6B7280] text-[14px]">게시글을 찾을 수 없습니다.</p>
                <Button
                  variant="outline"
                  onClick={handleGoToList}
                  className="h-[42px] px-6 border-[#DCE8ED] text-[#6B7280] text-[14px] font-bold rounded-[7px] cursor-pointer"
                >
                  목록으로 돌아가기
                </Button>
              </div>
            )}
          </div>

          {/* 댓글 영역 */}
          {post && (
            <div className="bg-white border border-[#DCE8ED] rounded-[12px] p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex items-center gap-2 pb-4 border-b border-[#DCE8ED]">
                <MessageSquare className="w-5 h-5 text-[#0F8AA8]" />
                <h3 className="text-[18px] font-bold text-[#123047]">
                  댓글 <span className="text-[#0F8AA8] font-extrabold">{safeComments.length}</span>
                </h3>
              </div>

              {/* 댓글 작성 폼 */}
              {isLoggedIn ? (
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                    <span>작성자: <strong className="text-[#13202B]">{loginUser?.name || "-"}</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      placeholder="댓글을 작성해 주세요. (타인에 대한 비방이나 불법적인 내용은 제재될 수 있습니다.)"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="flex-1 rounded-[8px] border border-[#DCE8ED] bg-[#F5FAFC] p-3 text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F8AA8]"
                    />
                    <Button
                      type="submit"
                      disabled={createCommentMutation.isPending}
                      className="h-full px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] flex flex-col items-center justify-center gap-1 cursor-pointer min-w-[80px]"
                    >
                      <Send className="w-4 h-4" />
                      {createCommentMutation.isPending ? "등록중" : "등록"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[8px] text-center space-y-2">
                  <p className="text-[14px] text-[#6B7280]">로그인 후 댓글을 작성하실 수 있습니다.</p>
                </div>
              )}

              {/* 댓글 리스트 */}
              <div className="space-y-4 pt-2">
                {isCommentsLoading ? (
                  <div className="py-8 text-center text-[13px] text-[#6B7280]">댓글을 불러오는 중입니다...</div>
                ) : safeComments.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[#6B7280]">등록된 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>
                ) : (
                  safeComments.map((comment: BoardComment) => {
                    const authorName = getCommentAuthorName(comment);
                    const canModify = canModifyComment(comment);
                    const isEditing = editingCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className="p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px] space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong className="text-[14px] font-bold text-[#123047]">{maskAuthorName(authorName)}</strong>
                            <span className="text-[12px] text-[#6B7280]">{formatBoardDate(comment.createdAt)}</span>
                          </div>

                          {/* 본인 또는 관리자만 수정/삭제 버튼 노출 */}
                          {canModify && !isEditing && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditComment(comment.id, comment.content)}
                                className="px-2.5 py-1 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[12px] font-bold rounded-[6px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs border-none"
                              >
                                <Edit2 className="w-3 h-3" />
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="px-2.5 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[12px] font-bold rounded-[6px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
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
                              className="w-full rounded-[6px] border border-[#0F8AA8] bg-white p-2.5 text-[14px] text-[#13202B] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEditComment(comment.id)}
                                disabled={updateCommentMutation.isPending}
                                className="h-8 px-3 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[12px] font-bold rounded-[6px] cursor-pointer"
                              >
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCommentId(null)}
                                className="h-8 px-3 border-[#DCE8ED] text-[#6B7280] text-[12px] font-bold rounded-[6px] cursor-pointer"
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#13202B] leading-relaxed whitespace-pre-wrap">
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
