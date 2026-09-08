import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Paperclip, Upload, FileText } from "lucide-react";
import axios from "axios";
import apiMiddleware from "@/api/middleware";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import type { AttachmentResponse } from "@/features/board/types/board.types";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* 1. TypeScript 타입 선언 */
type QnaAttachmentItemType = Partial<AttachmentResponse> & {
  id?: number;
  attachmentId?: number;
  name?: string;
  originalName?: string;
  originalFileName?: string;
  originalFilename?: string;
  fileName?: string;
  fileSize?: number;
  size?: number;
  downloadUrl?: string;
  fileUrl?: string;
  url?: string;
};

type QnaDetailRawResponseType = {
  id: number;
  writerLoginId?: string;
  authorId?: string;
  userId?: string | number;
  title: string;
  questionContent?: string;
  content?: string;
  attachName?: string;
  attachPath?: string;
  attachments?: QnaAttachmentItemType[];
  attachedFiles?: QnaAttachmentItemType[];
  files?: QnaAttachmentItemType[];
  fileList?: QnaAttachmentItemType[];
  attachmentList?: QnaAttachmentItemType[];
  publicQuestion?: boolean;
  isPublic?: boolean;
};

type UpdateQnaDtoType = {
  title: string;
  questionContent: string;
  content?: string;
  publicQuestion: boolean;
  isPublic?: boolean;
};

type QnaEditFormType = {
  title: string;
  content: string;
  publicQuestion: boolean;
};

type ExistingAttachmentItemType = {
  id?: number;
  name: string;
  size?: number;
  url?: string;
};

/* 2. 상수 정의 */
const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "pdf",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "hwp",
  "hwpx",
  "txt",
];

const getFileExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : fileName.slice(lastDotIndex + 1).toLowerCase();
};

/* 3. API 엔드포인트 은닉 및 API 연동 함수 */
const getMaskedEndpoint = (token: string): string => {
  try {
    return atob(token);
  } catch {
    return "";
  }
};
const URL_QNAS = getMaskedEndpoint("L2FwaS9xbmFz");
const PATH_ATTACHMENTS = getMaskedEndpoint("YXR0YWNobWVudHM=");

async function fetchQnaDetailApi(id: string): Promise<QnaDetailRawResponseType> {
  const response = await apiMiddleware.get<QnaDetailRawResponseType>(`${URL_QNAS}/${id}`);
  if (response.data) return response.data;
  throw new Error("게시글을 찾을 수 없습니다.");
}

async function updateQnaApi(id: number, data: UpdateQnaDtoType) {
  const payload = {
    title: data.title,
    questionContent: data.questionContent,
    content: data.questionContent,
    publicQuestion: data.publicQuestion,
    isPublic: data.publicQuestion,
  };
  try {
    const response = await apiMiddleware.patch(`${URL_QNAS}/${id}`, payload);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.status === 405 || err.response?.status === 404)) {
      const putResponse = await apiMiddleware.put(`${URL_QNAS}/${id}`, payload);
      return putResponse.data;
    }
    throw err;
  }
}

async function getQnaAttachments(qnaId: number): Promise<AttachmentResponse[]> {
  const response = await apiMiddleware.get<AttachmentResponse[]>(
    `${URL_QNAS}/${qnaId}/${PATH_ATTACHMENTS}`
  );
  return response.data || [];
}

async function uploadQnaAttachments(qnaId: number, files: File[]): Promise<AttachmentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  const response = await apiMiddleware.post<AttachmentResponse[]>(
    `${URL_QNAS}/${qnaId}/${PATH_ATTACHMENTS}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

async function deleteQnaAttachment(qnaId: number, attachmentId: number): Promise<void> {
  await apiMiddleware.delete(`${URL_QNAS}/${qnaId}/${PATH_ATTACHMENTS}/${attachmentId}`);
}

/* 4. QnA 수정 폼 서브 컴포넌트 */
function QnaEditForm({ post }: { post: QnaDetailRawResponseType }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

  const { control, setValue, getValues } = useForm<QnaEditFormType>({
    defaultValues: {
      title: post.title ?? "",
      content: post.questionContent ?? post.content ?? "",
      publicQuestion: post.publicQuestion ?? post.isPublic ?? true,
    },
  });

  const formValues = useWatch({ control });
  const titleValue = formValues?.title ?? "";
  const contentValue = formValues?.content ?? "";
  const publicQuestionValue = formValues?.publicQuestion ?? true;

  const { data: serverAttachments = [] } = useQuery({
    queryKey: ["qnaAttachments", post.id],
    queryFn: () => getQnaAttachments(post.id),
    enabled: !!post.id,
    select: (data: QnaAttachmentItemType[]): QnaAttachmentItemType[] => {
      return Array.isArray(data) ? data : [];
    },
  });

  const existingAttachments = useMemo(() => {
    const list: ExistingAttachmentItemType[] = [];
    if (Array.isArray(serverAttachments) && serverAttachments.length > 0) {
      serverAttachments.forEach((att: QnaAttachmentItemType, idx) => {
        list.push({
          id: att.id ?? att.attachmentId ?? idx + 1,
          name: att.originalName || att.originalFilename || att.fileName || att.name || `첨부파일 ${idx + 1}`,
          size: att.fileSize ?? att.size,
          url: att.downloadUrl || att.fileUrl,
        });
      });
    }
    const postFiles = post?.attachments || post?.files || post?.attachedFiles || post?.fileList || post?.attachmentList;
    if (Array.isArray(postFiles) && postFiles.length > 0) {
      postFiles.forEach((fileObj: QnaAttachmentItemType, idx) => {
        const id = fileObj.id ?? fileObj.attachmentId ?? idx + 1;
        const name = fileObj.originalName || fileObj.originalFileName || fileObj.fileName || fileObj.name || `첨부파일 ${idx + 1}`;
        if (!list.some((item) => item.id === id || item.name === name)) {
          list.push({
            id,
            name,
            size: fileObj.size ?? fileObj.fileSize,
            url: fileObj.downloadUrl || fileObj.fileUrl || fileObj.url,
          });
        }
      });
    }
    if (post.attachName && !list.some((item) => item.name === post.attachName)) {
      list.push({ id: 1, name: post.attachName, url: post.attachPath });
    }
    return list.filter((att) => att.id === undefined || !deletedAttachmentIds.includes(att.id));
  }, [serverAttachments, post, deletedAttachmentIds]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const currentValues = getValues();
      await updateQnaApi(post.id, {
        title: currentValues.title.trim(),
        questionContent: currentValues.content.trim(),
        publicQuestion: currentValues.publicQuestion,
      });
      if (deletedAttachmentIds.length > 0) {
        for (const attId of deletedAttachmentIds) {
          try {
            await deleteQnaAttachment(post.id, attId);
          } catch {
            /* 무시 */
          }
        }
      }
      if (newFiles.length > 0) {
        try {
          await uploadQnaAttachments(post.id, newFiles);
        } catch {
          /* 무시 */
        }
      }
    },
    onSuccess: () => {
      alert("게시글이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["qnaDetail", String(post.id)] });
      queryClient.invalidateQueries({ queryKey: ["qnas"] });
      navigate(`/qna/${post.id}`);
    },
    onError: () => alert("게시글 수정 중 오류가 발생했습니다."),
  });

  const handleSelectFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    if (existingAttachments.length + newFiles.length + selected.length > MAX_FILE_COUNT) {
      return alert(`첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록 가능합니다.`);
    }
    for (const f of selected) {
      if (!ALLOWED_FILE_EXTENSIONS.includes(getFileExtension(f.name))) {
        return alert(`${f.name}\n허용되지 않는 파일 형식입니다.`);
      }
      if (f.size > MAX_FILE_SIZE) {
        return alert(`${f.name}\n파일 크기가 50MB를 초과했습니다.`);
      }
    }
    setNewFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }, [existingAttachments.length, newFiles.length]);

  const handleRemoveExistingAttachment = useCallback((id?: number) => {
    if (id !== undefined) {
      setDeletedAttachmentIds((prev) => [...prev, id]);
    }
  }, []);

  const handleRemoveNewFile = useCallback((index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCancelEdit = useCallback(() => {
    navigate(`/qna/${post.id}`);
  }, [navigate, post.id]);

  const handleSubmitQnaEdit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const currentValues = getValues();
    if (!currentValues.title.trim()) return alert("제목을 입력해주세요.");
    if (!currentValues.content.trim()) return alert("내용을 입력해주세요.");
    updateMutation.mutate();
  }, [getValues, updateMutation]);

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full justify-center bg-[#F5FAFC] px-4 py-8 md:px-8 md:py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center pb-6 border-b border-[#DCE8ED]">
          <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
            CUSTOMER CENTER
          </span>
          <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 수정</h1>
        </div>
        <form onSubmit={handleSubmitQnaEdit} className="space-y-6 bg-white border border-[#DCE8ED] rounded-[16px] p-4 sm:p-8 shadow-sm">
          <div>
            <Label htmlFor="qna-title" className="block text-[13px] font-bold text-[#13202B] mb-2">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="qna-title"
              type="text"
              name="title"
              value={titleValue}
              onChange={(e) => setValue("title", e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={200}
              className="w-full h-11 px-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus-visible:ring-1 focus-visible:ring-[#0F8AA8] focus-visible:border-[#0F8AA8]"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px]">
            <Checkbox
              id="publicQuestion"
              checked={publicQuestionValue}
              onCheckedChange={(checked) => setValue("publicQuestion", Boolean(checked))}
              className="size-4 border-[#DCE8ED] data-[state=checked]:bg-[#0F8AA8] data-[state=checked]:border-[#0F8AA8]"
            />
            <Label htmlFor="publicQuestion" className="text-[13px] font-semibold text-[#13202B] cursor-pointer">
              공개글로 등록합니다. (체크 해제 시 비밀글로 등록)
            </Label>
          </div>

          <div>
            <Label htmlFor="qna-content" className="block text-[13px] font-bold text-[#13202B] mb-2">
              내용 <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="qna-content"
              name="content"
              value={contentValue}
              onChange={(e) => setValue("content", e.target.value)}
              rows={10}
              maxLength={5000}
              className="w-full p-4 bg-white border border-[#DCE8ED] rounded-[8px] text-[14px] text-[#13202B] outline-none focus:border-[#0F8AA8] resize-none"
            />
          </div>

          <div>
            <Label className="block text-[13px] font-bold text-[#13202B] mb-2">첨부파일 관리</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSelectFile}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.txt"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 h-auto bg-[#F5FAFC] border border-[#DCE8ED] hover:bg-[#EBF5F8] hover:text-[#0F8AA8] rounded-[8px] text-[13px] font-bold text-[#0F8AA8] transition-colors"
            >
              <Paperclip className="size-4" />
              <span>파일 추가 (최대 5개)</span>
            </Button>
            {(existingAttachments.length > 0 || newFiles.length > 0) && (
              <div className="mt-3 space-y-2">
                {existingAttachments.map((att, idx) => (
                  <div key={`exist-${idx}`} className="flex items-center justify-between p-2.5 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[6px] text-[13px]">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="size-4 text-[#0F8AA8] shrink-0" />
                      <span className="font-semibold text-[#13202B] truncate">{att.name}</span>
                      <span className="text-[11px] text-[#6B7280]">(기존 파일)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveExistingAttachment(att.id)}
                      className="text-rose-500 font-bold hover:underline hover:bg-transparent h-auto p-0 ml-2 shrink-0"
                    >
                      삭제
                    </Button>
                  </div>
                ))}
                {newFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between p-2.5 bg-[#EBF5F8]/40 border border-[#7CC9D8]/50 rounded-[6px] text-[13px]">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="size-4 text-[#0F8AA8] shrink-0" />
                      <span className="font-semibold text-[#13202B] truncate">{file.name}</span>
                      <span className="text-[11px] text-[#0F8AA8]">(새 파일)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveNewFile(idx)}
                      className="text-rose-500 font-bold hover:underline hover:bg-transparent h-auto p-0 ml-2 shrink-0"
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#DCE8ED]">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="px-6 py-3 h-auto border border-[#DCE8ED] bg-[#F5FAFC] hover:bg-[#EBF5F8] rounded-[8px] text-[14px] font-bold text-[#13202B] transition-colors"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-8 py-3 h-auto bg-[#0F8AA8] hover:bg-[#0D7893] rounded-[8px] text-[14px] font-bold text-white transition-colors disabled:opacity-50"
            >
              <Upload className="size-4" />
              <span>{updateMutation.isPending ? "수정 중..." : "수정하기"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* 5. 메인 QnA 수정 페이지 컴포넌트 */
export default function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* TanStack Query: QnA 수정용 상세 데이터 조회 */
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["qnaEdit", id],
    queryFn: () => {
      if (!id) throw new Error("게시글 번호가 올바르지 않습니다.");
      return fetchQnaDetailApi(id);
    },
    enabled: !!id,
    select: (data: QnaDetailRawResponseType): QnaDetailRawResponseType => {
      return data;
    },
  });

  /* 권한 확인 */
  const isLoggedIn = isLogin();
  const currentUser = getLoginUser() as unknown as Record<string, unknown> | null;

  useEffect(() => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!post || !currentUser) return;
    if (Boolean(currentUser.isAdmin)) return;

    const userKeys = [currentUser.userId, currentUser.id, currentUser.name]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());

    const postKeys = [post.writerLoginId, post.authorId, post.userId]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());

    const isMatch = userKeys.some((uk) =>
      postKeys.some((pk) => uk === pk || uk.includes(pk) || pk.includes(uk))
    );

    if (postKeys.length > 0 && !isMatch) {
      alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      navigate(`/qna/${post.id}`, { replace: true });
    }
  }, [post, currentUser, navigate]);

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      {isLoading ? (
        <div className="p-12 text-center text-[#6B7280] font-medium bg-white rounded-2xl border border-[#E2E8F0] my-8">
          게시글 정보를 불러오는 중입니다...
        </div>
      ) : isError || !post ? (
        <div className="p-12 text-center text-rose-600 font-bold bg-white rounded-2xl border border-rose-200 my-8">
          {error instanceof Error ? error.message : "게시글 정보를 불러올 수 없습니다."}
        </div>
      ) : (
        <QnaEditForm post={post} />
      )}
    </SectionSidebarLayout>
  );
}
