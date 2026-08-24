import type { AttachmentResponse } from "@/features/board/types/board.types";

export interface BoardAttachmentView {
  id: number;
  name: string;
  size: number;
}

interface CreatedBoardResponse {
  boardId?: number;
  id?: number;
}

export function getCreatedBoardId(
  response: CreatedBoardResponse,
): number | undefined {
  return response.boardId || response.id;
}

export function toBoardAttachmentView(
  attachment: AttachmentResponse,
  fallbackId = 0,
): BoardAttachmentView {
  return {
    id: attachment.attachmentId ?? attachment.id ?? fallbackId,
    name:
      attachment.originalName ||
      attachment.originalFilename ||
      attachment.fileName ||
      "첨부파일",
    size: attachment.size ?? attachment.fileSize ?? 0,
  };
}
