export const BOARD_MAX_FILE_COUNT = 5;
export const BOARD_MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024;

interface ValidateBoardFilesParams {
  incomingFiles: File[];
  selectedFileCount: number;
  existingFileCount: number;
  fullCountMessage: string;
}

export interface BoardFileValidationResult {
  acceptedFiles: File[];
  messages: string[];
}

export function validateBoardFiles({
  incomingFiles,
  selectedFileCount,
  existingFileCount,
  fullCountMessage,
}: ValidateBoardFilesParams): BoardFileValidationResult {
  const messages: string[] = [];
  const oversizedFiles = incomingFiles.filter(
    (file) => file.size > BOARD_MAX_SINGLE_FILE_SIZE,
  );

  if (oversizedFiles.length > 0) {
    messages.push(
      `파일당 최대 용량은 100MB입니다.\n초과된 파일: ${oversizedFiles
        .map((file) => file.name)
        .join(", ")}`,
    );
  }

  const validFiles = incomingFiles.filter(
    (file) => file.size <= BOARD_MAX_SINGLE_FILE_SIZE,
  );
  if (validFiles.length === 0) {
    return { acceptedFiles: [], messages };
  }

  const availableSlots =
    BOARD_MAX_FILE_COUNT - existingFileCount - selectedFileCount;
  if (availableSlots <= 0) {
    messages.push(fullCountMessage);
    return { acceptedFiles: [], messages };
  }

  if (validFiles.length > availableSlots) {
    messages.push(
      `최대 ${BOARD_MAX_FILE_COUNT}개까지만 등록할 수 있어 ${availableSlots}개 파일만 추가되었습니다.`,
    );
  }

  return {
    acceptedFiles: validFiles.slice(0, availableSlots),
    messages,
  };
}
