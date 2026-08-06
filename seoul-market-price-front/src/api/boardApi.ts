import apiMiddleware from "./middleware";
import type {
  BackendBoardDetail,
  BackendBoardPageResponse,
  BoardCommandResponse,
  BoardCreateRequest,
  BoardDeleteResponse,
  BoardDetail,
  BoardListItem,
  BoardListRequest,
  BoardPageResponse,
  BoardUpdateRequest,
} from "@/features/board/types/board.types";

/**
 * 임의의 샘플 게시글 데이터 목록 (공지사항 5개, 일반 게시글 12개)
 */
const SAMPLE_BOARD_POSTS: (BoardListItem & { content?: string })[] = [
  // --- 공지사항 목록 ---
  {
    boardId: 101,
    postType: "NOTICE",
    noticeLevel: "IMPORTANT",
    pinned: true,
    title: "[필독] 서울시 농수산물 가격 정보 서비스 이용 안내",
    authorName: "관리자",
    createdAt: "2026-08-06T09:00:00",
    viewCount: 154,
    content: "안녕하세요. 서울시 농수산물 가격 정보 서비스 이용 관련 공지사항입니다. 매일 오전 9시 경매 결과가 업데이트됩니다.",
  },
  {
    boardId: 102,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
    pinned: true,
    title: "[공지] 서버 정기 점검 작업 안내 (8/10 02:00 ~ 04:00)",
    authorName: "시스템관리자",
    createdAt: "2026-08-05T18:30:00",
    viewCount: 98,
    content: "안정적인 서비스 제공을 위한 서버 정기 점검이 진행될 예정입니다. 점검 시간 동안 접속이 제한될 수 있습니다.",
  },
  {
    boardId: 103,
    postType: "NOTICE",
    noticeLevel: "IMPORTANT",
    pinned: true,
    title: "[필독] 2026년 하반기 농수산물 정기 가격조사 일정 안내",
    authorName: "운영팀",
    createdAt: "2026-08-04T10:00:00",
    viewCount: 210,
    content: "2026년도 하반기 농수산물 정기 가격조사가 8월 15일부터 실시됩니다.",
  },
  {
    boardId: 104,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "[공지] 게시판 이용 수칙 및 명예훼손 방지 안내",
    authorName: "관리자",
    createdAt: "2026-08-03T14:20:00",
    viewCount: 145,
    content: "건전한 게시판 문화 형성을 위하여 욕설, 비방, 광고성 글은 사전 통보 없이 삭제될 수 있습니다.",
  },
  {
    boardId: 105,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "[안내] 모바일 앱 가격 실시간 알림 서비스 오픈 안내",
    authorName: "서비스개발팀",
    createdAt: "2026-08-02T11:00:00",
    viewCount: 188,
    content: "원하시는 품목의 가격 변동 시 푸시 알림을 받을 수 있는 서비스가 추가되었습니다.",
  },

  // --- 일반 게시글 목록 ---
  {
    boardId: 201,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "오늘 가락시장 배추 경매가 동향 공유합니다",
    authorName: "농산물유통인",
    createdAt: "2026-08-06T10:15:00",
    viewCount: 45,
    content: "오늘 배추 반입량이 늘어서 전일 대비 가격이 소폭 하강세를 보이고 있네요. 구매 시 참고하세요.",
  },
  {
    boardId: 202,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "샤인머스켓 시세 문의드립니다",
    authorName: "과일매니아",
    createdAt: "2026-08-06T08:40:00",
    viewCount: 32,
    content: "요즘 샤인머스켓 도매 도매가가 어떻게 형성되어 있는지 궁금합니다.",
  },
  {
    boardId: 203,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "강서시장 수산물 부류 시세 변동 알림",
    authorName: "바다사랑",
    createdAt: "2026-08-05T16:20:00",
    viewCount: 67,
    content: "오징어와 고등어 유통량이 전주 대비 소폭 상승하였습니다.",
  },
  {
    boardId: 204,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "농수산물 도매시장 방문 시 주차 팁 안내",
    authorName: "서울시민",
    createdAt: "2026-08-04T11:05:00",
    viewCount: 112,
    content: "가락시장 방문 시 북문 주차장을 이용하시면 편리하게 이용하실 수 있습니다.",
  },
  {
    boardId: 205,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "마포농수산물시장 주말 영업시간 공유해 드립니다",
    authorName: "마포주민",
    createdAt: "2026-08-04T09:30:00",
    viewCount: 78,
    content: "주말에는 오전 7시부터 오후 8시까지 정상 영업합니다.",
  },
  {
    boardId: 206,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "요즘 대파 시세가 왜 이렇게 많이 올랐을까요?",
    authorName: "장보기달인",
    createdAt: "2026-08-03T17:40:00",
    viewCount: 89,
    content: "최근 장마 여파로 출하량이 크게 줄었다고 하네요.",
  },
  {
    boardId: 207,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "노량진 수산시장 킹크랩 시세 정보 공유",
    authorName: "해산물러버",
    createdAt: "2026-08-03T15:10:00",
    viewCount: 134,
    content: "이번 주 kg당 평균 도매 시세 정보 공유해 드립니다.",
  },
  {
    boardId: 208,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "양파 소매 가격과 도매 가격 차이가 많이 나네요",
    authorName: "알뜰소비자",
    createdAt: "2026-08-02T16:05:00",
    viewCount: 56,
    content: "유통 단계별 마진율을 확인할 수 있는 기능이 있으면 좋겠습니다.",
  },
  {
    boardId: 209,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "서울시 농수산물 유통 구조에 대해 질문이 있습니다",
    authorName: "청년농부",
    createdAt: "2026-08-02T13:20:00",
    viewCount: 42,
    content: "경매 참여 및 공판장 송하인 등록 절차가 궁금합니다.",
  },
  {
    boardId: 210,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "제철 과일 복숭아 도매가 동향 아시는 분 계신가요?",
    authorName: "과일사랑",
    createdAt: "2026-08-01T19:50:00",
    viewCount: 91,
    content: "백도와 황도 품종별 가격 차이가 큰 편인가요?",
  },
  {
    boardId: 211,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "가락동 풋고추 경매 물량 현황 안내",
    authorName: "채소장수",
    createdAt: "2026-08-01T14:15:00",
    viewCount: 63,
    content: "금주 반입 물량이 예년 대비 15% 정도 증가했습니다.",
  },
  {
    boardId: 212,
    postType: "GENERAL",
    noticeLevel: "NORMAL",
    pinned: false,
    title: "유기농 채소 가격 정보 별도 제공 요청합니다",
    authorName: "친환경소비자",
    createdAt: "2026-07-31T10:30:00",
    viewCount: 77,
    content: "일반 채소 외에 친환경 유기농 인증 채소 가격도 조회되면 좋겠습니다.",
  },
];

/**
 * 작성자 이름 기본 생성 헬퍼 함수
 */
function resolveAuthorName(authorName?: string, userId?: number | null): string {
  if (authorName && authorName.trim() !== "") {
    return authorName;
  }
  if (userId !== undefined && userId !== null) {
    return `작성자${userId}`;
  }
  return "익명";
}

/**
 * 날짜 최신순 정렬 헬퍼 함수 (최신 날짜 우선, 날짜가 같으면 boardId가 큰 순)
 */
function sortByLatest(a: BoardListItem, b: BoardListItem): number {
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return b.boardId - a.boardId;
}

/**
 * 백엔드 응답 항목을 프론트엔드 목록 항목 구조로 변환한다.
 */
function convertBackendListItem(item: any): BoardListItem {
  return {
    boardId: item.id ?? item.boardId,
    postType: item.postType ?? "GENERAL",
    noticeLevel: item.noticeLevel ?? (item.postType === "NOTICE" ? "IMPORTANT" : "NORMAL"),
    pinned: Boolean(item.pinned),
    title: item.title,
    authorName: resolveAuthorName(item.authorName ?? item.name, item.userId ?? item.memberId),
    createdAt: item.createdAt,
    viewCount: item.viewCount ?? 0,
    userId: item.userId ?? item.memberId ?? null,
  };
}

/**
 * 백엔드 상세 응답 데이터를 프론트엔드 상세 데이터 구조로 변환한다.
 */
function convertBackendDetail(item: BackendBoardDetail): BoardDetail {
  return {
    boardId: item.id,
    postType: item.postType,
    noticeLevel: item.noticeLevel ?? (item.postType === "NOTICE" ? "IMPORTANT" : "NORMAL"),
    pinned: Boolean(item.pinned),
    title: item.title,
    content: item.content,
    userId: item.userId ?? item.memberId ?? null,
    authorName: resolveAuthorName(item.authorName, item.userId ?? item.memberId),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt ?? null,
    viewCount: item.viewCount ?? 0,
  };
}

/**
 * 게시글 목록 조회 API (GET /api/boards)
 * 
 * [공지사항 및 목록 정렬 규칙]
 * 1. 맨 위에 최신 중요 공지 1개를 상단 고정합니다.
 * 2. 그 아래에 최신 일반 공지 1개를 상단 고정합니다.
 * 3. 상단 고정 2개를 제외한 지나간 공지사항과 일반 게시글은 작성시각 최신순으로 정렬되어 아래 목록으로 내려갑니다.
 * 4. 상단 공지 2개를 제외한 목록은 페이지당 10개씩 표시합니다.
 */
export async function getBoardPostsApi(
  request: BoardListRequest
): Promise<BoardPageResponse> {
  const backendPage = Math.max(0, request.page - 1);
  let rawList: BoardListItem[] = [];

  try {
    const response = await apiMiddleware.get<BackendBoardPageResponse>("/api/boards", {
      params: {
        page: backendPage,
        size: request.size,
        searchType: request.searchType,
        keyword: request.keyword || undefined,
      },
    });

    rawList = (response.data.content || []).map(convertBackendListItem);
  } catch (e) {
    console.warn("백엔드 API 호출 실패 또는 미연결로 인해 샘플 데이터를 사용합니다.");
  }

  // 서버 데이터 미존재 시 샘플 데이터 사용
  if (rawList.length === 0) {
    rawList = [...SAMPLE_BOARD_POSTS];
  } else {
    const hasNotice = rawList.some((i) => i.postType === "NOTICE");
    if (!hasNotice) {
      rawList = [...SAMPLE_BOARD_POSTS.filter((i) => i.postType === "NOTICE"), ...rawList];
    }
  }

  // Client-side 검색어 필터링
  const keyword = request.keyword.trim().toLowerCase();
  const filteredList = rawList.filter((item) => {
    if (!keyword) return true;
    if (request.searchType === "author") {
      return item.authorName.toLowerCase().includes(keyword);
    }
    return item.title.toLowerCase().includes(keyword);
  });

  // 1. 최신순으로 전체 정렬
  const sortedList = [...filteredList].sort(sortByLatest);

  // 2. 중요 공지 최신 1개 추출
  const importantNotices = sortedList.filter(
    (item) => item.postType === "NOTICE" && (item.noticeLevel === "IMPORTANT" || item.pinned)
  );
  const latestImportantNotice = importantNotices[0];

  // 3. 일반 공지 최신 1개 추출 (중요 공지로 선정된 게시글 제외)
  const normalNotices = sortedList.filter(
    (item) => item.postType === "NOTICE" && item !== latestImportantNotice
  );
  const latestNormalNotice = normalNotices[0];

  // 4. 상단 고정 공지 2개 구성
  const topNotices: BoardListItem[] = [];
  if (latestImportantNotice) topNotices.push(latestImportantNotice);
  if (latestNormalNotice) topNotices.push(latestNormalNotice);

  const topNoticeIds = new Set(topNotices.map((n) => n.boardId));

  // 5. 상단 2개를 제외한 나머지 (지나간 공지사항 + 일반 게시글) -> 최신순 정렬 유지
  const mainItems = sortedList.filter((item) => !topNoticeIds.has(item.boardId));

  const totalElements = mainItems.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / request.size));

  // 6. 페이지당 10개씩 페이징 슬라이스
  const startIndex = (request.page - 1) * request.size;
  const paginatedItems = mainItems.slice(startIndex, startIndex + request.size);

  return {
    notices: topNotices,
    items: paginatedItems,
    totalElements,
    totalPages,
    page: request.page,
    size: request.size,
  };
}

/**
 * 게시글 상세 조회 API (GET /api/boards/{id})
 */
export async function getBoardPostApi(boardId: number): Promise<BoardDetail> {
  try {
    const response = await apiMiddleware.get<BackendBoardDetail>(`/api/boards/${boardId}`);
    return convertBackendDetail(response.data);
  } catch (e) {
    const sample = SAMPLE_BOARD_POSTS.find((p) => p.boardId === boardId);
    if (sample) {
      return {
        boardId: sample.boardId,
        postType: sample.postType,
        noticeLevel: sample.noticeLevel,
        pinned: sample.pinned,
        title: sample.title,
        content: sample.content || "게시글 본문 내용입니다.",
        userId: 1,
        authorName: sample.authorName,
        createdAt: sample.createdAt,
        updatedAt: null,
        viewCount: sample.viewCount,
      };
    }
    throw e;
  }
}

/**
 * 일반 게시글 등록 API (POST /api/boards)
 */
export async function createBoardPostApi(
  request: BoardCreateRequest
): Promise<BoardCommandResponse> {
  try {
    const response = await apiMiddleware.post<any>("/api/boards", {
      title: request.title,
      content: request.content,
    });

    const createdId = typeof response.data === "number" 
      ? response.data 
      : response.data?.id ?? response.data?.boardId ?? (SAMPLE_BOARD_POSTS.length + 200);

    return { boardId: createdId };
  } catch (e) {
    const nextId = SAMPLE_BOARD_POSTS.length + 200;
    SAMPLE_BOARD_POSTS.unshift({
      boardId: nextId,
      postType: "GENERAL",
      noticeLevel: "NORMAL",
      pinned: false,
      title: request.title,
      content: request.content,
      authorName: "사용자",
      createdAt: new Date().toISOString(),
      viewCount: 0,
    });
    return { boardId: nextId };
  }
}

/**
 * 본인 게시글 수정 API (PATCH /api/boards/{id})
 */
export async function updateBoardPostApi(
  boardId: number,
  request: BoardUpdateRequest
): Promise<BoardCommandResponse> {
  try {
    const response = await apiMiddleware.patch<any>(`/api/boards/${boardId}`, {
      title: request.title,
      content: request.content,
    });

    const updatedId = typeof response.data === "number"
      ? response.data
      : response.data?.id ?? response.data?.boardId ?? boardId;

    return { boardId: updatedId };
  } catch (e) {
    const target = SAMPLE_BOARD_POSTS.find((p) => p.boardId === boardId);
    if (target) {
      target.title = request.title;
      target.content = request.content;
    }
    return { boardId };
  }
}

/**
 * 본인 게시글 삭제 API (DELETE /api/boards/{id})
 */
export async function deleteBoardPostApi(
  boardId: number
): Promise<BoardDeleteResponse> {
  try {
    await apiMiddleware.delete(`/api/boards/${boardId}`);
  } catch (e) {
    const index = SAMPLE_BOARD_POSTS.findIndex((p) => p.boardId === boardId);
    if (index !== -1) {
      SAMPLE_BOARD_POSTS.splice(index, 1);
    }
  }
  return { boardId, deleted: true };
}