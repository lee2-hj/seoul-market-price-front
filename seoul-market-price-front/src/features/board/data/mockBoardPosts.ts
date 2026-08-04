/**
 * 게시글 종류이다.
 *
 * NOTICE는 관리자가 작성한 공지사항,
 * FREE는 일반 사용자가 작성한 자유게시글이다.
 */
export type BoardPostType =
    | "NOTICE"
    | "FREE";

/**
 * 게시판 목록과 상세 화면에서 사용하는
 * Mock 게시글 타입이다.
 *
 * 현재는 프론트 화면 확인용 데이터이며
 * 나중에 백엔드 게시판 API 응답 타입으로 교체한다.
 */
export interface BoardPost {
    /**
     * 게시글 고유번호
     */
    id: number;

    /**
     * 공지사항 또는 일반 게시글 구분
     */
    type: BoardPostType;

    /**
     * 게시글 제목
     */
    title: string;

    /**
     * 게시글 본문
     */
    content: string;

    /**
     * 작성자 이름
     */
    author: string;

    /**
     * 게시글 작성일
     */
    createdAt: string;

    /**
     * 게시글 조회수
     */
    viewCount: number;

    /**
     * 화면에 표시할 첨부파일 이름이다.
     *
     * 현재는 화면 확인만 수행하므로
     * 실제 파일 다운로드 기능은 제공하지 않는다.
     */
    attachmentName?: string;
}

/**
 * 게시판 화면 확인용 Mock 게시글이다.
 *
 * 배열 순서와 관계없이 BoardPage에서 NOTICE 게시글을
 * 먼저 분리하여 화면 위쪽에 표시할 예정이다.
 */
export const MOCK_BOARD_POSTS: BoardPost[] = [
    {
        id: 15,
        type: "NOTICE",
        title: "싸농 게시판 운영정책 안내",
        content:
            "안녕하세요. 싸농 관리자입니다.\n\n게시판을 이용할 때에는 다른 사용자를 배려해 주세요.\n농수산물 가격정보와 관련 없는 광고성 게시글이나 부적절한 게시글은 운영정책에 따라 제한될 수 있습니다.",
        author: "관리자",
        createdAt: "2026.08.04",
        viewCount: 124,
    },
    {
        id: 14,
        type: "NOTICE",
        title: "가격정보 업데이트 안내",
        content:
            "농수산물 가격정보 데이터 업데이트 일정을 안내드립니다.\n\n가격정보는 수집 기관의 데이터 제공 일정에 따라 반영 시간이 달라질 수 있습니다.",
        author: "관리자",
        createdAt: "2026.08.03",
        viewCount: 98,
    },
    {
        id: 13,
        type: "FREE",
        title: "이번 주 사과 가격",
        content:
            "이번 주에 사과 가격을 확인해 보니 지난주보다 조금 내려간 것 같습니다.\n다른 지역의 가격도 비슷한지 궁금합니다.",
        author: "홍길동",
        createdAt: "2026.08.04",
        viewCount: 15,
    },
    {
        id: 12,
        type: "FREE",
        title: "지역별 배추 가격 차이",
        content:
            "강남구와 강북구의 배추 가격 차이가 생각보다 큰 것 같습니다.\n가격 차이가 발생하는 기준이 무엇인지 궁금합니다.",
        author: "김하늘",
        createdAt: "2026.08.03",
        viewCount: 21,
    },
    {
        id: 11,
        type: "FREE",
        title: "휴일 가격 업데이트 문의",
        content:
            "주말이나 공휴일에도 농수산물 가격정보가 업데이트되는지 궁금합니다.",
        author: "이로운",
        createdAt: "2026.08.03",
        viewCount: 8,
    },
    {
        id: 10,
        type: "FREE",
        title: "모바일 가격 비교 문의",
        content:
            "외부에서 모바일로 접속해도 지역별 농수산물 가격을 비교할 수 있나요?",
        author: "박채소",
        createdAt: "2026.08.02",
        viewCount: 32,
        attachmentName: "농수산물_가격표.xlsx",
    },
    {
        id: 9,
        type: "FREE",
        title: "고등어 가격 문의",
        content:
            "요즘 고등어 가격이 가장 저렴한 지역이 어디인지 궁금합니다.",
        author: "최바다",
        createdAt: "2026.08.01",
        viewCount: 27,
    },
    {
        id: 8,
        type: "FREE",
        title: "쌀 가격 조회 기준",
        content:
            "쌀 가격을 조회할 때 표시되는 단위와 조사 기준을 알고 싶습니다.",
        author: "정농부",
        createdAt: "2026.07.31",
        viewCount: 19,
    },
    {
        id: 7,
        type: "FREE",
        title: "즐겨찾기 기능 문의",
        content:
            "자주 조회하는 품목을 즐겨찾기에 등록할 수 있는지 궁금합니다.",
        author: "한사과",
        createdAt: "2026.07.30",
        viewCount: 12,
    },
    {
        id: 6,
        type: "FREE",
        title: "가격 조사 시간 문의",
        content:
            "화면에 표시되는 가격은 하루 중 몇 시를 기준으로 조사되는지 궁금합니다.",
        author: "오배추",
        createdAt: "2026.07.29",
        viewCount: 16,
    },
    {
        id: 5,
        type: "FREE",
        title: "시장별 가격 비교",
        content:
            "전통시장과 대형마트의 품목 가격을 비교해서 확인할 수 있나요?",
        author: "강시장",
        createdAt: "2026.07.28",
        viewCount: 24,
    },
    {
        id: 4,
        type: "FREE",
        title: "농산물 단위 문의",
        content:
            "같은 품목인데 화면마다 단위가 다르게 표시되는 이유가 궁금합니다.",
        author: "윤가격",
        createdAt: "2026.07.27",
        viewCount: 11,
    },
];

/**
 * 게시글 번호로 Mock 게시글 한 건을 조회한다.
 *
 * @param postId 조회할 게시글 번호
 * @returns 조회된 게시글 또는 undefined
 */
export function findMockBoardPost(
    postId: number,
): BoardPost | undefined {
    return MOCK_BOARD_POSTS.find(
        (post) => post.id === postId,
    );
}