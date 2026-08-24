export interface BoardTextDraft {
  title: string;
  content: string;
}

const DATABASE_NAME = "ssabu-board-drafts";
const DATABASE_VERSION = 1;
const FILE_STORE_NAME = "draft-files";

const normalizeKeyPart = (value: string | number): string =>
  String(value).trim().toLowerCase();

export function getBoardWriteDraftKey(userId: string): string {
  return `board_write_draft_${normalizeKeyPart(userId)}`;
}

export function getBoardEditDraftKey(
  postId: string | number,
  userId: string,
): string {
  return `board_edit_draft_${normalizeKeyPart(postId)}_${normalizeKeyPart(userId)}`;
}

export function loadBoardTextDraft(key: string): BoardTextDraft | null {
  const saved = sessionStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed: unknown = JSON.parse(saved);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "title" in parsed &&
      typeof parsed.title === "string" &&
      "content" in parsed &&
      typeof parsed.content === "string"
    ) {
      return { title: parsed.title, content: parsed.content };
    }
  } catch {
    // 파싱 실패 시에도 저장된 초안을 임의로 삭제하지 않는다.
  }

  return null;
}

export function hasBoardTextDraft(key: string): boolean {
  return sessionStorage.getItem(key) !== null;
}

export function saveBoardTextDraft(
  key: string,
  draft: BoardTextDraft,
): void {
  sessionStorage.setItem(key, JSON.stringify(draft));
}

export function removeBoardTextDraft(key: string): void {
  sessionStorage.removeItem(key);
}

function openDraftDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("이 브라우저에서는 첨부파일 초안 저장을 지원하지 않습니다."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE_NAME)) {
        database.createObjectStore(FILE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("첨부파일 초안 저장소를 열 수 없습니다."));
  });
}

function runFileStoreRequest<T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDraftDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(FILE_STORE_NAME, mode);
        const request = createRequest(transaction.objectStore(FILE_STORE_NAME));
        let requestResult: T;

        request.onsuccess = () => {
          requestResult = request.result;
        };
        request.onerror = () =>
          reject(request.error ?? new Error("첨부파일 초안을 처리할 수 없습니다."));
        transaction.oncomplete = () => {
          database.close();
          resolve(requestResult);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("첨부파일 초안 처리가 중단되었습니다."));
        };
      }),
  );
}

export async function loadBoardDraftFiles(key: string): Promise<File[]> {
  const result = await runFileStoreRequest<unknown>("readonly", (store) =>
    store.get(key),
  );
  return Array.isArray(result)
    ? result.filter((item): item is File => item instanceof File)
    : [];
}

export function saveBoardDraftFiles(key: string, files: File[]): Promise<void> {
  return runFileStoreRequest<IDBValidKey>("readwrite", (store) =>
    store.put(files, key),
  ).then(() => undefined);
}

export function removeBoardDraftFiles(key: string): Promise<void> {
  return runFileStoreRequest<undefined>("readwrite", (store) =>
    store.delete(key),
  ).then(() => undefined);
}
