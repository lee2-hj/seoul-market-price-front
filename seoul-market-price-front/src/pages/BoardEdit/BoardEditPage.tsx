import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X, Upload } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";
import BoardPageHeader from "@/features/board/components/BoardPageHeader";
import { toBoardAttachmentView } from "@/features/board/utils/boardMappers";
import {
  boardPostSchema,
  type BoardPostFormData,
} from "@/features/board/schemas/boardPostSchema";
import {
  BOARD_MAX_FILE_COUNT,
  validateBoardFiles,
} from "@/features/board/utils/boardFileValidation";

const ALLOWED_FILE_EXTENSIONS =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

const getEditSessionKey = (id: number) => `ssabu_board_edit_session_${id}`;
const getEditReloadFlagKey = (id: number) => `ssabu_board_edit_is_reload_${id}`;

export default function BoardEditPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // 삭제 확인 다이얼로그: 첨부파일은 대상 id, 게시글은 단일 플래그로 제어
  const [targetAttachmentId, setTargetAttachmentId] = useState<number | null>(null);
  const [isPostDeleteDialogOpen, setIsPostDeleteDialogOpen] = useState(false);

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

  const form = useForm<BoardPostFormData>({
    resolver: zodResolver(boardPostSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });
  const { handleSubmit, control, reset, getValues } = form;

  // 글자 수 표시에만 필요하므로 title만 가볍게 구독한다.
  const titleValue = useWatch({ control, name: "title" }) || "";

  // 새로고침(beforeunload) 시점에만 form.getValues()를 1회 읽어 세션에 백업한다.
  // 타이핑마다 JSON.stringify+setItem을 반복하지 않아 렌더링/I/O 비용이 없다.
  // 페이지 언마운트(SPA 라우트 이동) 시에는 세션을 정리한다.
  useEffect(() => {
    if (!boardId) return;
    const reloadFlagKey = getEditReloadFlagKey(boardId);
    const editSessionKey = getEditSessionKey(boardId);

    const handleBeforeUnload = () => {
      sessionStorage.setItem(reloadFlagKey, "1");
      const { title, content } = getValues();
      if (title || content) {
        sessionStorage.setItem(editSessionKey, JSON.stringify({ title, content }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // SPA 라우팅 이동으로 컴포넌트가 언마운트되는 경우 세션 정리
      if (sessionStorage.getItem(reloadFlagKey) !== "1") {
        sessionStorage.removeItem(editSessionKey);
      }
    };
  }, [boardId, getValues]);

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["board", { boardId }],
    queryFn: () => getBoardPostApi(boardId),
    enabled: !!boardId && !Number.isNaN(boardId),
  });

  const { data: attachments = [] } = useQuery<AttachmentResponse[]>({
    queryKey: ["boardAttachments", { boardId }],
    queryFn: () => getBoardAttachmentsApi(boardId),
    enabled: !!boardId && !Number.isNaN(boardId),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      deleteBoardAttachmentApi(boardId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardAttachments", { boardId }] });
      alert("첨부파일이 삭제되었습니다.");
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
          (curId && authorId && curId === authorId) ||
          (curName && authorName && curName === authorName));

      if (!isAuthor) {
        alert("수정 권한이 없습니다.");
        navigate(`/board/${boardId}`, { replace: true });
        return;
      }

      const editKey = getEditSessionKey(boardId);
      const reloadFlagKey = getEditReloadFlagKey(boardId);
      const isReload = sessionStorage.getItem(reloadFlagKey) === "1";
      sessionStorage.removeItem(reloadFlagKey);

      let initialTitle = post.title;
      let initialContent = post.content;

      // 새로고침 시에만 수정 중이던 세션 데이터 복원, 다른 경로 진입 시 세션 클리어
      if (isReload) {
        try {
          const saved = sessionStorage.getItem(editKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed?.title === "string") initialTitle = parsed.title;
            if (typeof parsed?.content === "string") initialContent = parsed.content;
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      } else {
        sessionStorage.removeItem(editKey);
      }

      reset({
        title: initialTitle,
        content: initialContent,
      });
    }
  }, [
    post,
    isAuthInitialized,
    loginUser,
    boardId,
    navigate,
    reset,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const { acceptedFiles, messages } = validateBoardFiles({
      incomingFiles: rawFiles,
      selectedFileCount: selectedFiles.length,
      existingFileCount: attachments.length,
      fullCountMessage: `첨부파일은 최대 ${BOARD_MAX_FILE_COUNT}개까지만 등록 가능합니다.`,
    });
    messages.forEach((message) => alert(message));

    if (acceptedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; files: File[] }) => {
      await updateBoardPostApi(boardId, {
        title: data.title,
        content: data.content,
      });

      let uploadFailed = false;
      if (data.files && data.files.length > 0) {
        try {
          await uploadBoardAttachmentsApi(boardId, data.files);
        } catch (uploadErr) {
          console.error("첨부파일 추가 업로드 실패:", uploadErr);
          uploadFailed = true;
        }
      }
      return { uploadFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["board", { boardId }] });
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      queryClient.invalidateQueries({ queryKey: ["boardAttachments", { boardId }] });
      sessionStorage.removeItem(getEditSessionKey(boardId));
      if (result?.uploadFailed) {
        alert("게시글은 수정되었으나 첨부파일 업로드 중 오류가 발생했습니다.");
      } else {
        alert("게시글이 성공적으로 수정되었습니다.");
      }
      navigate(`/board/${boardId}`, { replace: true });
    },
    onError: (err: Error) => {
      alert(`게시글 수정 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoardPostApi(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardPosts"] });
      sessionStorage.removeItem(getEditSessionKey(boardId));
      alert("게시글이 삭제되었습니다.");
      navigate("/board");
    },
    onError: (err: Error) => {
      alert(`게시글 삭제 중 오류가 발생했습니다: ${err.message}`);
    },
  });

  const onSubmit = (formData: BoardPostFormData) => {
    if (!loginUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    updateMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      files: selectedFiles,
    });
  };

  const handleGoToList = () => {
    sessionStorage.removeItem(getEditSessionKey(boardId));
    navigate("/board");
  };

  return (
    <SectionSidebarLayout
      sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
      menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
    >
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <BoardPageHeader
          eyebrow="EDIT POST"
          title="게시글 수정"
          description="등록하신 게시글 내용을 수정합니다."
        />

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
            <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-semibold text-[#13202B]">
                        제목
                      </FormLabel>
                      <span className={`text-xs ${titleValue.length > 20 ? "text-rose-500 font-bold" : "text-[#6B7280]"}`}>
                        {titleValue.length} / 20자
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="제목을 입력하세요"
                        {...field}
                        className="h-10 bg-[#F5FAFC] border-[#DCE8ED] text-xs text-[#13202B] focus-visible:ring-[#0F8AA8]"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="content"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-semibold text-[#13202B]">
                      내용
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={12}
                        placeholder="내용을 입력하세요"
                        {...field}
                        className="w-full rounded-xl border border-[#DCE8ED] bg-[#F5FAFC] p-4 text-xs text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#0F8AA8] min-h-[240px]"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {attachments.length > 0 && (
                <div className="p-4 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#123047]">
                      현재 등록된 첨부파일 ({attachments.length}개)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {attachments.map((att: AttachmentResponse) => {
                      const attachment = toBoardAttachmentView(att);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DCE8ED] text-xs"
                        >
                          <span className="text-[#13202B] font-medium truncate max-w-[80%]">
                            {attachment.name}
                            <span className="text-[11px] text-[#6B7280] ml-2 font-normal">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTargetAttachmentId(Number(attachment.id))}
                            className="h-auto rounded px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            삭제
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#F0F7FA] rounded-xl border border-[#DCE8ED] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#123047]">
                    <Paperclip className="w-4 h-4 text-[#0F8AA8]" />
                    <span>새 첨부파일 추가</span>
                    <span className="text-[#0F8AA8] font-semibold">
                      (총 {attachments.length + selectedFiles.length}/{BOARD_MAX_FILE_COUNT})
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
                      disabled={attachments.length + selectedFiles.length >= BOARD_MAX_FILE_COUNT}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNewFile(idx)}
                          className="size-6 rounded text-[#9CA3AF] hover:bg-transparent hover:text-rose-500"
                          title="파일 제거"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">
                    기존 파일을 포함하여 최대 {BOARD_MAX_FILE_COUNT}개까지 추가할 수 있습니다.
                  </p>
                )}
              </div>

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
                    onClick={handleGoToList}
                    className="h-9 w-24 border-[#DCE8ED] text-xs text-[#6B7280] hover:bg-[#F0F7FA] rounded-lg cursor-pointer"
                  >
                    목록으로
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPostDeleteDialogOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="h-9 w-24 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  글삭제
                </Button>
              </div>
            </form>
            </Form>
          )}
        </div>

        <ConfirmDialog
          open={targetAttachmentId != null}
          onOpenChange={(open) => {
            if (!open) setTargetAttachmentId(null);
          }}
          title="첨부파일 삭제"
          description="이 첨부파일을 삭제하시겠습니까?"
          isDestructive
          onConfirm={() => {
            if (targetAttachmentId != null) {
              deleteAttachmentMutation.mutate(targetAttachmentId);
              setTargetAttachmentId(null);
            }
          }}
        />

        <ConfirmDialog
          open={isPostDeleteDialogOpen}
          onOpenChange={setIsPostDeleteDialogOpen}
          title="게시글 삭제"
          description="정말 이 게시글을 삭제하시겠습니까?"
          isDestructive
          onConfirm={() => {
            setIsPostDeleteDialogOpen(false);
            deleteMutation.mutate();
          }}
        />
      </div>
    </div>
    </SectionSidebarLayout>
  );
}
