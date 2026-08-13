import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteBoardAttachmentApi,
  deleteBoardPostApi,
  getBoardAttachmentsApi,
  getBoardPostApi,
  updateBoardPostApi,
  uploadBoardAttachmentsApi,
} from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type {
  AttachmentResponse,
} from "@/features/board/types/board.types";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const { data: existingAttachments = [] } = useQuery<AttachmentResponse[]>({
    queryKey: ["boardAttachments", boardId],
    queryFn: () => getBoardAttachmentsApi(boardId),
    enabled: !isNaN(boardId) && boardId > 0,
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      deleteBoardAttachmentApi(boardId, attachmentId),
    onSuccess: () => {
      alert("첨부파일이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boardAttachments", boardId] });
    },
    onError: (err: Error) => {
      alert(`첨부파일 삭제 중 오류가 발생했습니다: ${err.message}`);
    },
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
  }, [post, isAuthInitialized, loginUser, boardId, navigate, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; file: File | null }) => {
      await updateBoardPostApi(boardId, {
        title: data.title,
        content: data.content,
      });

      if (data.file) {
        try {
          await uploadBoardAttachmentsApi(boardId, [data.file]);
        } catch (uploadErr) {
          console.error("첨부파일 추가 업로드 실패:", uploadErr);
          alert("게시글은 수정되었으나 첨부파일 업로드 중 오류가 발생했습니다.");
        }
      }
    },
    onSuccess: () => {
      alert("게시글이 성공적으로 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      queryClient.invalidateQueries({ queryKey: ["boardAttachments", boardId] });
      navigate(`/board/${boardId}`);
    },
    onError: (err: Error) => {
      alert(`게시글 수정 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoardPostApi(boardId),
    onSuccess: () => {
      alert("게시글이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      navigate("/board");
    },
    onError: (err: Error) => {
      alert(`게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const onSubmit = (formData: BoardEditFormData) => {
    if (!loginUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    updateMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      file: selectedFile,
    });
  };

  const handleDelete = () => {
    if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-widest uppercase rounded-full">
            EDIT POST
          </div>
          <h1 className="text-3xl font-extrabold text-[#123047] tracking-tight">
            게시글 수정
          </h1>
          <p className="text-sm text-[#6B7280]">
            등록하신 게시글 내용을 수정합니다.
          </p>
        </div>

        {/* 폼 컨테이너 */}
        <div className="bg-white rounded-2xl shadow-xs border border-[#DCE8ED] p-6 md:p-8">
          {isLoading ? (
            <div className="py-20 text-center text-[#6B7280] text-xs">
              게시글 정보를 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-rose-500 text-xs">
                오류가 발생했습니다: {(error as Error)?.message || "게시글 정보를 불러올 수 없습니다."}
              </p>
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => navigate(`/board/${boardId}`)}
              >
                상세보기로 돌아가기
              </Button>
            </div>
          ) : (
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

              {/* 기존 첨부파일 목록 */}
              {existingAttachments.length > 0 && (
                <div className="p-3.5 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] space-y-2 text-xs">
                  <span className="font-semibold text-[#123047] block">
                    현재 등록된 첨부파일 :
                  </span>
                  <div className="space-y-1.5">
                    {existingAttachments.map((att, idx) => {
                      const attId = att.attachmentId ?? att.id ?? idx;
                      const attName = att.originalFilename || att.fileName || "첨부파일";
                      const attSize = att.size ?? att.fileSize ?? 0;
                      return (
                        <div
                          key={attId}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#DCE8ED]"
                        >
                          <span className="text-[#13202B] font-medium truncate">
                            {attName} ({(attSize / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("이 첨부파일을 삭제하시겠습니까?")) {
                                deleteAttachmentMutation.mutate(Number(attId));
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 text-[11px] rounded hover:bg-rose-50 transition-colors cursor-pointer border-none bg-transparent"
                          >
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 새 첨부파일 추가 */}
              <div className="p-3.5 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] text-xs text-[#6B7280] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#123047]">새 첨부파일 추가 :</span>
                  {selectedFile ? (
                    <span className="text-[#0F8AA8] font-bold">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    <span className="text-[#6B7280]">파일을 추가하려면 선택하세요</span>
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
              <div className="flex items-center justify-between pt-6 border-t border-[#DCE8ED]">
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="h-9 w-24 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    {updateMutation.isPending ? "수정 중..." : "수정"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/board")}
                    className="h-9 w-24 border-[#DCE8ED] text-xs text-[#6B7280] hover:bg-[#F0F7FA] rounded-lg cursor-pointer"
                  >
                    글목록
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-9 w-24 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
