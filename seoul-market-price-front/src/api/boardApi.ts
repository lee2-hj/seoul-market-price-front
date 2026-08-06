import apiMiddleware from "@/api/middleware";
import type {
  BoardListRequest,
  BoardPageResponse,
  BoardListItem,
  BoardDetail,
  BoardCreateRequest,
  BoardUpdateRequest,
  BackendBoardPageResponse,
  BoardComment,
  CommentCreateRequest,
  CommentUpdateRequest,
} from "@/features/board/types/board.types";

/**
 * 풍성하고 실감 나는 게시판 초기 Mock 데이터 (총 18개)
 */
const MOCK_BOARD_POSTS: (BoardDetail & { noticeLevel?: "IMPORTANT" | "NORMAL" })[] = [
  {
    boardId: 101,
    title: "[중요공지] 2026년 서울시 농수산물 가격 도매시장 조사 개편 안내",
    content: `안녕하세요. 서울시 농수산물 가격정보 서비스 운영팀입니다.

2026년 8월부터 가락시장 및 강서 도매시장의 품목별 가격 조사 체계가 실시간 시세 연동 방식으로 대폭 개편됩니다.
시민 여러분께 보다 정확하고 신속한 실측 농수산물 가격 정보를 제공하기 위해 다음과 같이 수집 방식이 개선됩니다.

■ 주요 변경 사항
1. 시세 업데이트 주기 단축 (기존 1일 1회 -> 1일 4회 실시간 갱신)
2. 자치구별 대형마트 및 전통시장 가격 비교 정확도 향상
3. AI 기반 주요 채소/과일류 주간 가격 예측 지표 추가 제공

앞으로도 시민 여러분의 알뜰한 장보기와 합리적인 소비를 지원하기 위해 최선을 다하겠습니다.
감사합니다.`,
    authorName: "관리자",
    authorId: "admin",
    createdAt: "2026-08-05",
    viewCount: 421,
    postType: "NOTICE",
    noticeLevel: "IMPORTANT",
  },
  {
    boardId: 102,
    title: "[공지] 하절기 배추 및 무 수급 동향 및 가격 모니터링 안내",
    content: `최근 지속되는 폭염과 집중호우 영향으로 고랭지 배추 및 무 수급 불안정이 우려됨에 따라,
서울시 농수산물 가격정보 서비스에서는 자치구별 수급 동향 및 시세 변동을 밀착 모니터링하고 있습니다.

주요 장바구니 물가 품목에 대한 가격 정보는 매일 오전 9시와 오후 3시에 업데이트되오니,
구매 전 '우리 동네 시세 비교' 메뉴를 적극 활용해 주시기 바랍니다.`,
    authorName: "관리자",
    authorId: "admin",
    createdAt: "2026-08-04",
    viewCount: 310,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
  },
  {
    boardId: 103,
    title: "[공지] 시스템 정기 점검 및 서버 증설 작업 안내 (08월 10일 02:00 ~ 05:00)",
    content: `서비스의 안정적인 제공을 위해 아래 일정 동안 시스템 정기 점검 및 서버 증설 작업을 진행합니다.

- 점검 일시: 2026년 8월 10일(월) 02:00 ~ 05:00 (총 3시간)
- 영향 작업: 점검 시간 동안 농수산물 가격 조회 및 게시판 서비스 일시 중단

작업 시간은 상황에 따라 단축되거나 연장될 수 있습니다. 이용에 불편을 드려 죄송합니다.`,
    authorName: "관리자",
    authorId: "admin",
    createdAt: "2026-08-01",
    viewCount: 189,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
  },
  {
    boardId: 104,
    title: "[공지] 게시판 이용 규칙 및 스팸 게시물 제재 정책 안내",
    content: `건전한 시민 소통 공간 조성을 위해 게시판 이용 규칙을 안내해 드립니다.

- 상업성 홍보, 광고글, 타인 비방 및 욕설 게시글은 사전 통보 없이 즉시 삭제 조치됩니다.
- 거짓 정보 유포 시 계정 이용이 제한될 수 있으니 유의해 주시기 바랍니다.`,
    authorName: "관리자",
    authorId: "admin",
    createdAt: "2026-07-28",
    viewCount: 154,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
  },
  {
    boardId: 105,
    title: "[공지] 추석 명절 맞이 농수산물 특별 할인 행사 안내",
    content: `서울시와 관내 전통시장이 합동으로 추석 명절맞이 농수산물 최대 30% 할인 행사를 진행합니다.
행사 참여 시장 목록과 품목별 쿠폰 발행 정보는 마이페이지 및 공지사항을 통해 확인하실 수 있습니다.`,
    authorName: "관리자",
    authorId: "admin",
    createdAt: "2026-07-20",
    viewCount: 512,
    postType: "NOTICE",
    noticeLevel: "NORMAL",
  },
  {
    boardId: 17,
    title: "자치구별 전통시장 농산물 시세 비교 정보 공유합니다",
    content: `서울시 자치구별(마포구, 강남구, 송파구) 전통시장 농산물 시세를 직접 조사한 결과를 공유해 드립니다.

1. 배추: 마포 망원시장이 평균 3,500원으로 가장 저렴함
2. 사과(부사): 송파 가락몰 시장 10개 15,000원 선 유지
3. 쌀(20kg): 강남 영동시장 기준 48,000원 형성 중

전통시장 방문 전 참고하여 알뜰한 장보기에 활용하시길 바랍니다!`,
    authorName: "시민조사단",
    authorId: "citizen1",
    createdAt: "2026-08-06",
    viewCount: 78,
    postType: "GENERAL",
  },
  {
    boardId: 12,
    title: "오늘 가락동 도매시장 시세 문의드립니다",
    content: `오늘 오전에 가락동 시장 가보신 분 계신가요?
사과랑 배추 도매 가격이 지난주보다 많이 올랐는지 궁금합니다.
직접 구매하러 가려고 하는데 시세 정보 공유해 주시면 감사하겠습니다!`,
    authorName: "김철수",
    authorId: "chulsoo",
    createdAt: "2026-08-05",
    viewCount: 45,
    postType: "GENERAL",
  },
  {
    boardId: 11,
    title: "마포구 쪽 전통시장 쌀값 비교 정보 공유해요",
    content: `마포구 관내 전통시장 3곳(망원시장, 공덕시장, 월드컵시장) 20kg 쌀 가격 직접 비교해봤습니다.
확실히 마트 이벤트 기간 아니면 전통시장이 2,000원~3,000원 정도 더 저렴하네요.
구매하실 분들은 참고하세요!`,
    authorName: "이영희",
    authorId: "younghee",
    createdAt: "2026-08-04",
    viewCount: 88,
    postType: "GENERAL",
  },
  {
    boardId: 10,
    title: "가격 예측 그래프 기능 너무 유용하네요",
    content: `농수산물 가격 변동 추이 그래프를 보니까 주간 단위 시세 변동을 한눈에 파악하기 정말 좋네요.
최근 대파랑 양파 가격이 안정세로 돌아서서 장보기 부담이 좀 줄었습니다.
좋은 기능 만들어 주셔서 감사합니다!`,
    authorName: "박민수",
    authorId: "minsu",
    createdAt: "2026-08-03",
    viewCount: 62,
    postType: "GENERAL",
  },
  {
    boardId: 9,
    title: "해산물 오징어 시세 요즘 어떤가요?",
    content: "동해안 오징어 어획량이 늘었다고 들었는데 노량진 수산시장 시세가 반영되었는지 궁금합니다.",
    authorName: "최동건",
    authorId: "donggun",
    createdAt: "2026-08-02",
    viewCount: 29,
    postType: "GENERAL",
  },
  {
    boardId: 8,
    title: "관심 품목 가격 알림 기능 신청 방법 공유",
    content: "마이페이지에서 관심 품목 등록해 두고 목표 가격 정해 놓으니까 알림 바로 와서 편하더라구요!",
    authorName: "정수진",
    authorId: "sujin",
    createdAt: "2026-08-01",
    viewCount: 53,
    postType: "GENERAL",
  },
  {
    boardId: 7,
    title: "강서 농수산물 도매시장 주차 정보 공유합니다",
    content: "주말 오전에 방문할 때 대기 시간이 길 수 있으니 9시 이전에 도착하시는 것을 추천합니다.",
    authorName: "한지민",
    authorId: "jimin",
    createdAt: "2026-07-31",
    viewCount: 41,
    postType: "GENERAL",
  },
  {
    boardId: 6,
    title: "여름철 신선식품 보관 꿀팁 모음",
    content: "여름철 채소 무름 현상을 방지하려면 키친타월로 감싸서 밀폐용기에 보관하면 2배 오래 갑니다.",
    authorName: "윤서준",
    authorId: "seojun",
    createdAt: "2026-07-30",
    viewCount: 95,
    postType: "GENERAL",
  },
  {
    boardId: 5,
    title: "자주 묻는 질문(FAQ) 게시판 오픈 환영합니다",
    content: "시세 조회 관련 자주 문의되는 내용이 잘 정돈되어 있어서 초보자도 쉽게 이해가 되네요.",
    authorName: "강현우",
    authorId: "hyunwoo",
    createdAt: "2026-07-29",
    viewCount: 38,
    postType: "GENERAL",
  },
  {
    boardId: 4,
    title: "친환경 유기농 농산물 가격 정보도 추가되었으면 좋겠습니다",
    content: "일반 농산물 외에 무농약, 유기농 인증 농산물 가격 모니터링 카테고리도 새로 생기면 좋겠습니다.",
    authorName: "송지은",
    authorId: "jieun",
    createdAt: "2026-07-28",
    viewCount: 71,
    postType: "GENERAL",
  },
  {
    boardId: 3,
    title: "우리 동네 알뜰 장보기 장소 추천해주세요",
    content: "송파구 가락동 근처에서 제철 과일 저렴하고 신선하게 살 수 있는 곳 아시는 분 추천 부탁드립니다!",
    authorName: "임태양",
    authorId: "taeyang",
    createdAt: "2026-07-27",
    viewCount: 64,
    postType: "GENERAL",
  },
  {
    boardId: 2,
    title: "모바일 웹 화면 호환성이 너무 좋네요",
    content: "스마트폰으로 장보면서 시세 검색해보는데 반응형으로 깔끔하게 작동해서 편리합니다.",
    authorName: "오하은",
    authorId: "haeun",
    createdAt: "2026-07-26",
    viewCount: 82,
    postType: "GENERAL",
  },
  {
    boardId: 1,
    title: "서울시 농수산물 가격정보 서비스 응원합니다!",
    content: "투명한 농수산물 가격 정보 공개로 소비자들과 농가 모두에게 큰 도움이 되는 좋은 서비스입니다.",
    authorName: "홍길동",
    authorId: "hong123",
    createdAt: "2026-07-25",
    viewCount: 120,
    postType: "GENERAL",
  },
];

/**
 * 게시글 댓글 Mock 데이터 상태
 */
const MOCK_BOARD_COMMENTS: BoardComment[] = [
  {
    commentId: 1,
    boardId: 12,
    authorName: "이영희",
    authorId: "younghee",
    content: "오늘 오전에 가락시장 다녀왔는데 사과는 대과 기준 10% 정도 올랐더라구요!",
    createdAt: "2026-08-05 10:30",
  },
  {
    commentId: 2,
    boardId: 12,
    authorName: "관리자",
    authorId: "admin",
    content: "실시간 도매 시세 정보는 상단 '시세 조회' 메뉴에서도 1일 4회 업데이트 확인이 가능하십니다.",
    createdAt: "2026-08-05 11:15",
  },
  {
    commentId: 3,
    boardId: 11,
    authorName: "박민수",
    authorId: "minsu",
    content: "망원시장 쌀 시세 정보 유용하네요! 주말에 방문해 봐야겠습니다.",
    createdAt: "2026-08-04 15:40",
  },
  {
    commentId: 4,
    boardId: 101,
    authorName: "김철수",
    authorId: "chulsoo",
    content: "AI 가격 예측 지표 추가 너무 기대되네요. 장보기 전 시세 동향 파악에 큰 도움 되겠습니다.",
    createdAt: "2026-08-05 14:20",
  },
];

let mockPostIdCounter = 200;
let mockCommentIdCounter = 100;

/**
 * 게시글 목록 조회 API (GET /api/boards)
 */
export async function getBoardPostsApi(
  params: BoardListRequest = {}
): Promise<BoardPageResponse> {
  const { page = 1, size = 10, searchType, keyword } = params;

  try {
    const response = await apiMiddleware.get<BackendBoardPageResponse>("/api/boards", {
      params: {
        page: page - 1,
        size,
        searchType,
        keyword,
      },
    });

    const backendData: any = response.data || {};
    const contentArray = backendData.content || backendData.items || [];

    // 백엔드 데이터가 비어있거나 배열이 아닐 경우 Mock 데이터로 자동 Fallback
    if (!Array.isArray(contentArray) || contentArray.length === 0) {
      throw new Error("백엔드 게시글 데이터가 없어 Mock 데이터로 전환합니다.");
    }

    const allItems: BoardListItem[] = contentArray.map((item: any) => ({
      boardId: item.boardId || item.id,
      title: item.title || item.boardTitle || item.subject || "게시글 제목",
      authorName: item.authorName || item.writerName || item.writer || "작성자",
      createdAt: item.createdAt || item.createDate || item.regDate || "2026-08-06",
      viewCount: item.viewCount ?? item.hit ?? item.readCount ?? 0,
      postType: item.postType || item.type || "GENERAL",
      noticeLevel: item.noticeLevel,
    }));

    const notices = allItems
      .filter((i) => i.postType === "NOTICE")
      .sort((a, b) => (b.noticeLevel === "IMPORTANT" ? 1 : 0) - (a.noticeLevel === "IMPORTANT" ? 1 : 0));

    const pinnedNotices = notices.slice(0, 2);
    const items = allItems.filter((i) => !pinnedNotices.some((p) => p.boardId === i.boardId));

    return {
      notices: pinnedNotices,
      items,
      totalPages: backendData.totalPages || 1,
      totalElements: backendData.totalElements || allItems.length,
      currentPage: (backendData.number ?? 0) + 1,
    };
  } catch (error) {
    console.warn("백엔드 연결 실패 또는 데이터 0건, Mock 데이터 목록을 사용합니다.", error);

    let filtered = [...MOCK_BOARD_POSTS];

    if (keyword && keyword.trim() !== "") {
      const kw = keyword.trim().toLowerCase();
      filtered = filtered.filter((post) => {
        if (searchType === "author") {
          return post.authorName.toLowerCase().includes(kw);
        }
        return post.title.toLowerCase().includes(kw);
      });
    }

    const importantNotice = filtered.find(
      (p) => p.postType === "NOTICE" && p.noticeLevel === "IMPORTANT"
    );
    const normalNotice = filtered.find(
      (p) => p.postType === "NOTICE" && p.noticeLevel === "NORMAL"
    );

    const pinnedNoticesList: BoardListItem[] = [];
    if (importantNotice) pinnedNoticesList.push(importantNotice);
    if (normalNotice) pinnedNoticesList.push(normalNotice);

    const remainingItems = filtered
      .filter((p) => !pinnedNoticesList.some((n) => n.boardId === p.boardId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalElements = remainingItems.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * size;
    const paginatedItems = remainingItems.slice(startIndex, startIndex + size);

    return {
      notices: pinnedNoticesList,
      items: paginatedItems,
      totalPages,
      totalElements,
      currentPage: safePage,
    };
  }
}

/**
 * 게시글 단건 상세 조회 API (GET /api/boards/:postId)
 */
export async function getBoardPostApi(boardId: number): Promise<BoardDetail> {
  try {
    const response = await apiMiddleware.get<any>(`/api/boards/${boardId}`);
    const data = response.data || {};

    const title = data.title || data.boardTitle || data.subject || "";
    const content = data.content || data.boardContent || data.body || "";
    const authorName = data.authorName || data.writerName || data.writer || data.userName || "";
    const authorId = data.authorId || data.writerId || data.userId || "user";
    const createdAt = data.createdAt || data.createDate || data.regDate || data.createdDate || "";
    const viewCount = data.viewCount ?? data.hit ?? data.readCount ?? data.views ?? 0;
    const postType = data.postType || data.type || "GENERAL";

    const foundMock = MOCK_BOARD_POSTS.find((p) => p.boardId === boardId);

    return {
      boardId: data.boardId || data.id || boardId,
      title: title || foundMock?.title || `게시글 #${boardId} 제목`,
      content:
        content ||
        foundMock?.content ||
        `안녕하세요. #${boardId}번 게시글의 상세 내용입니다.\n\n서울시 농수산물 가격 정보 서비스를 통해 다양한 시세 정보와 장보기 정보를 확인하실 수 있습니다.`,
      authorName: authorName || foundMock?.authorName || "시민작성자",
      authorId: authorId || foundMock?.authorId || "user",
      createdAt: createdAt || foundMock?.createdAt || "2026-08-06",
      viewCount: viewCount || foundMock?.viewCount || 1,
      postType: postType || foundMock?.postType || "GENERAL",
    };
  } catch (error) {
    console.warn("백엔드 연결 실패, 게시글 상세 Mock 데이터를 사용합니다.", error);
    const found = MOCK_BOARD_POSTS.find((p) => p.boardId === boardId);
    if (found) {
      found.viewCount += 1;
      return found;
    }
    return {
      boardId,
      title: `게시글 #${boardId} 제목`,
      content: `안녕하세요. #${boardId}번 게시글의 상세 내용입니다.\n\n서울시 농수산물 가격 정보 서비스를 이용해 주셔서 감사합니다. 자치구별 농수산물 가격 정보를 더 신속하게 확인해보세요.`,
      authorName: "시민작성자",
      authorId: "user",
      createdAt: "2026-08-06",
      viewCount: 1,
      postType: "GENERAL",
    };
  }
}

/**
 * 게시글 등록 API (POST /api/boards)
 */
export async function createBoardPostApi(
  data: BoardCreateRequest
): Promise<{ boardId: number }> {
  try {
    const response = await apiMiddleware.post<{ boardId: number }>("/api/boards", data);
    return response.data;
  } catch (error) {
    console.warn("백엔드 연결 실패, 게시글 등록 Mock 처리를 수행합니다.", error);
    mockPostIdCounter += 1;
    const today = new Date().toISOString().split("T")[0];
    const newPost: BoardDetail & { noticeLevel?: "IMPORTANT" | "NORMAL" } = {
      boardId: mockPostIdCounter,
      title: data.title,
      content: data.content,
      authorName: "홍길동",
      authorId: "hong123",
      createdAt: today,
      viewCount: 0,
      postType: data.postType || "GENERAL",
    };
    MOCK_BOARD_POSTS.unshift(newPost);
    return { boardId: mockPostIdCounter };
  }
}

/**
 * 게시글 수정 API (PUT /api/boards/:postId)
 */
export async function updateBoardPostApi(
  boardId: number,
  data: BoardUpdateRequest
): Promise<void> {
  try {
    await apiMiddleware.put(`/api/boards/${boardId}`, data);
  } catch (error) {
    console.warn("백엔드 연결 실패, 게시글 수정 Mock 처리를 수행합니다.", error);
    const index = MOCK_BOARD_POSTS.findIndex((p) => p.boardId === boardId);
    if (index !== -1) {
      if (data.title) MOCK_BOARD_POSTS[index].title = data.title;
      if (data.content) MOCK_BOARD_POSTS[index].content = data.content;
    }
  }
}

/**
 * 게시글 삭제 API (DELETE /api/boards/:postId)
 */
export async function deleteBoardPostApi(boardId: number): Promise<void> {
  try {
    await apiMiddleware.delete(`/api/boards/${boardId}`);
  } catch (error) {
    console.warn("백엔드 연결 실패, 게시글 삭제 Mock 처리를 수행합니다.", error);
    const index = MOCK_BOARD_POSTS.findIndex((p) => p.boardId === boardId);
    if (index !== -1) {
      MOCK_BOARD_POSTS.splice(index, 1);
    }
  }
}

/**
 * 게시글 댓글 목록 조회 API (GET /api/boards/:postId/comments)
 */
export async function getBoardCommentsApi(boardId: number): Promise<BoardComment[]> {
  try {
    const response = await apiMiddleware.get<BoardComment[]>(`/api/boards/${boardId}/comments`);
    return response.data;
  } catch (error) {
    console.warn("백엔드 연결 실패, 댓글 목록 Mock 데이터를 사용합니다.", error);
    return MOCK_BOARD_COMMENTS.filter((c) => c.boardId === boardId);
  }
}

/**
 * 게시글 댓글 작성 API (POST /api/boards/:postId/comments)
 */
export async function createBoardCommentApi(
  boardId: number,
  data: CommentCreateRequest,
  authorInfo: { name: string; userId: string }
): Promise<BoardComment> {
  try {
    const response = await apiMiddleware.post<BoardComment>(`/api/boards/${boardId}/comments`, data);
    return response.data;
  } catch (error) {
    console.warn("백엔드 연결 실패, 댓글 등록 Mock 처리를 수행합니다.", error);
    mockCommentIdCounter += 1;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newComment: BoardComment = {
      commentId: mockCommentIdCounter,
      boardId,
      authorName: authorInfo.name || "사용자",
      authorId: authorInfo.userId || "user",
      content: data.content,
      createdAt: formattedDate,
    };
    MOCK_BOARD_COMMENTS.push(newComment);
    return newComment;
  }
}

/**
 * 게시글 댓글 수정 API (PUT /api/boards/comments/:commentId)
 */
export async function updateBoardCommentApi(
  commentId: number,
  data: CommentUpdateRequest
): Promise<void> {
  try {
    await apiMiddleware.put(`/api/boards/comments/${commentId}`, data);
  } catch (error) {
    console.warn("백엔드 연결 실패, 댓글 수정 Mock 처리를 수행합니다.", error);
    const comment = MOCK_BOARD_COMMENTS.find((c) => c.commentId === commentId);
    if (comment) {
      comment.content = data.content;
    }
  }
}

/**
 * 게시글 댓글 삭제 API (DELETE /api/boards/comments/:commentId)
 */
export async function deleteBoardCommentApi(commentId: number): Promise<void> {
  try {
    await apiMiddleware.delete(`/api/boards/comments/${commentId}`);
  } catch (error) {
    console.warn("백엔드 연결 실패, 댓글 삭제 Mock 처리를 수행합니다.", error);
    const index = MOCK_BOARD_COMMENTS.findIndex((c) => c.commentId === commentId);
    if (index !== -1) {
      MOCK_BOARD_COMMENTS.splice(index, 1);
    }
  }
}