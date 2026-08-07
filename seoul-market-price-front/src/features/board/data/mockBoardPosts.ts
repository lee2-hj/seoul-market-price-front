/**
 * 게시글 종류이다.
 *
 * NOTICE는 관리자가 작성한 공지사항,
 * FREE는 일반 사용자가 작성한 자유게시글이다.
 */
export type BoardPostType =
    | "NOTICE"
    | "GENERAL";

/**
 * 게시판 목록과 상세 화면에서 사용하는
 * Mock 게시글 타입이다.
 *
 * 현재는 프론트 화면 확인용 데이터이며,
 * 나중에 백엔드 게시판 API 응답 타입으로 교체한다.
 */
export interface BoardPost {
    /**
     * 게시글 고유번호이다.
     */
    id: number;

    /**
     * NOTICE는 공지사항,
     * GENERAL은 일반 게시글이다.
     */
    postType: "NOTICE" | "GENERAL";

    /**
     * IMPORTANT는 중요 공지,
     * NORMAL은 일반 공지이다.
     */
    noticeLevel: "IMPORTANT" | "NORMAL";

    /**
     * 상단 고정 여부이다.
     */
    pinned: boolean;

    /**
     * 게시글 제목이다.
     */
    title: string;

    /**
     * 게시글 본문이다.
     */
    content: string;

    /**
     * 작성자 이름이다.
     */
    author: string;

    /**
     * 작성일이다.
     */
    createdAt: string;

    /**
     * 조회수이다.
     */
    viewCount: number;

    /**
     * 화면 확인용 첨부파일 이름이다.
     */
    attachmentName?: string;
}

/**
 * 게시판 화면 확인용 Mock 게시글이다.
 *
 * 중요 고정 공지, 일반 공지, 일반 게시글을 함께 정의한다.
 * 실제 목록 정렬은 boardApi.ts와 BoardPage.tsx에서 수행한다.
 */
export const MOCK_BOARD_POSTS: BoardPost[] = [
    /*
     * =====================================================
     * 중요 고정 공지
     *
     * 관리자가 중요 공지로 설정한 글이다.
     * 페이지 번호와 관계없이 목록 최상단에 표시한다.
     * =====================================================
     */
    {
        id: 1004,
        postType: "NOTICE",
        noticeLevel: "IMPORTANT",
        pinned: true,
        title: "싸농 서비스 이용 및 운영정책 안내",
        content:
            "안녕하세요. 싸농 관리자입니다.\n\n게시판을 이용할 때에는 다른 사용자를 배려해 주세요.\n광고성 게시글 또는 부적절한 게시글은 운영정책에 따라 제한될 수 있습니다.",
        author: "관리자",
        createdAt: "2026-08-05",
        viewCount: 158,
    },
    {
        id: 1003,
        postType: "NOTICE",
        noticeLevel: "NORMAL",
        pinned: true,
        title: "개인정보 처리방침 변경 안내",
        content:
            "개인정보 처리방침 일부가 변경될 예정입니다.\n\n변경 내용과 적용 일자를 확인해 주세요.",
        author: "관리자",
        createdAt: "2026-08-04",
        viewCount: 121,
    },

    /*
     * =====================================================
     * 일반 공지
     *
     * 최신 공지 2개는 중요 고정 공지 아래에 표시하고,
     * 나머지는 일반 게시글과 작성일 순으로 표시한다.
     * =====================================================
     */
    {
        id: 1002,
        postType: "NOTICE",
        noticeLevel: "NORMAL",
        pinned: true,
        title: "8월 가격정보 업데이트 안내",
        content:
            "농수산물 가격정보 데이터 업데이트 일정을 안내드립니다.\n\n데이터 제공 일정에 따라 반영 시간이 달라질 수 있습니다.",
        author: "관리자",
        createdAt: "2026-08-05",
        viewCount: 96,
    },
    {
        id: 1001,
        postType: "NOTICE",
        noticeLevel: "NORMAL",
        pinned: true,
        title: "여름철 농산물 가격 안내",
        content:
            "여름철 기상 상황에 따라 일부 농산물의 가격 변동 폭이 커질 수 있습니다.",
        author: "관리자",
        createdAt: "2026-08-04",
        viewCount: 84,
    },
    {
        id: 1000,
        postType: "NOTICE",
        noticeLevel: "NORMAL",
        pinned: true,
        title: "자치구 가격 비교 기준 안내",
        content:
            "자치구별 가격 비교 화면에서 사용하는 조사 기준과 단위를 안내드립니다.",
        author: "관리자",
        createdAt: "2026-08-02",
        viewCount: 63,
    },
    {
        id: 999,
        postType: "NOTICE",
        noticeLevel: "NORMAL",
        pinned: true,
        title: "모바일 서비스 개선 안내",
        content:
            "모바일 환경에서 가격정보를 더 편하게 확인할 수 있도록 화면을 개선했습니다.",
        author: "관리자",
        createdAt: "2026-07-30",
        viewCount: 47,
    },

    /*
     * =====================================================
     * 일반 게시글
     *
     * 페이지당 10개씩 표시되는지 확인할 수 있도록
     * 총 20개의 일반 게시글을 준비한다.
     *
     * 작성자 검색 테스트를 위해 홍길동, 김하늘,
     * 이로운 등의 작성자는 여러 번 사용한다.
     * =====================================================
     */
    {
        id: 25,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "이번 주 배 가격",
        content:
            "이번 주 배 가격을 확인해 보니 지난주보다 조금 올라간 것 같습니다.\n다른 지역의 가격도 비슷한지 궁금합니다.",
        author: "홍길동",
        createdAt: "2026-08-05",
        viewCount: 15,
    },
    {
        id: 24,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "강남구 사과 가격 문의",
        content:
            "강남구의 사과 가격이 다른 지역보다 높은 편인지 궁금합니다.",
        author: "김하늘",
        createdAt: "2026-08-05",
        viewCount: 12,
    },
    {
        id: 23,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "고등어 가격 비교 방법",
        content:
            "전통시장과 대형마트의 고등어 가격을 비교할 수 있는지 궁금합니다.",
        author: "이로운",
        createdAt: "2026-08-04",
        viewCount: 18,
    },
    {
        id: 22,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "관심 품목 저장 기능 문의",
        content:
            "자주 조회하는 품목을 관심 품목으로 저장할 수 있는지 궁금합니다.",
        author: "홍길동",
        createdAt: "2026-08-04",
        viewCount: 15,
    },
    {
        id: 21,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "모바일 가격 비교 문의",
        content:
            "외부에서 모바일로 접속해도 지역별 농수산물 가격을 비교할 수 있나요?",
        author: "박채소",
        createdAt: "2026-08-03",
        viewCount: 32,
        attachmentName: "농수산물_가격표.xlsx",
    },
    {
        id: 20,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "지역별 배추 가격 차이",
        content:
            "강남구와 강북구의 배추 가격 차이가 생각보다 큰 것 같습니다.",
        author: "김하늘",
        createdAt: "2026-08-03",
        viewCount: 21,
    },
    {
        id: 19,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "휴일 가격 업데이트 문의",
        content:
            "주말이나 공휴일에도 농수산물 가격정보가 업데이트되는지 궁금합니다.",
        author: "이로운",
        createdAt: "2026-08-02",
        viewCount: 8,
    },
    {
        id: 18,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "이번 주 사과 가격",
        content:
            "이번 주에 사과 가격을 확인해 보니 지난주보다 조금 내려간 것 같습니다.",
        author: "홍길동",
        createdAt: "2026-08-02",
        viewCount: 24,
    },
    {
        id: 17,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "쌀 가격 조회 기준",
        content:
            "쌀 가격을 조회할 때 표시되는 단위와 조사 기준을 알고 싶습니다.",
        author: "정농부",
        createdAt: "2026-08-01",
        viewCount: 19,
    },
    {
        id: 16,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "시장별 가격 비교",
        content:
            "전통시장과 대형마트의 품목 가격을 비교해서 확인할 수 있나요?",
        author: "강시장",
        createdAt: "2026-08-01",
        viewCount: 24,
    },
    {
        id: 15,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "가격 조사 시간 문의",
        content:
            "화면에 표시되는 가격은 하루 중 몇 시를 기준으로 조사되는지 궁금합니다.",
        author: "오배추",
        createdAt: "2026-07-31",
        viewCount: 16,
    },
    {
        id: 14,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "농산물 단위 문의",
        content:
            "같은 품목인데 화면마다 단위가 다르게 표시되는 이유가 궁금합니다.",
        author: "윤가격",
        createdAt: "2026-07-31",
        viewCount: 11,
    },
    {
        id: 13,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "가격 예측 기능 의견",
        content:
            "품목별 가격 예측 기능에서 어떤 정보를 더 보여주면 좋을지 의견을 남깁니다.",
        author: "홍길동",
        createdAt: "2026-07-30",
        viewCount: 17,
    },
    {
        id: 12,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "우리 동네 가격 확인",
        content:
            "우리 동네 가격은 어느 메뉴에서 확인할 수 있는지 궁금합니다.",
        author: "김하늘",
        createdAt: "2026-07-30",
        viewCount: 14,
    },
    {
        id: 11,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "가격 데이터 기준 문의",
        content:
            "가격 정보의 조사 기관과 기준 시각을 알고 싶습니다.",
        author: "이로운",
        createdAt: "2026-07-29",
        viewCount: 23,
    },
    {
        id: 10,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "수산물 추천 요청",
        content:
            "요즘 가격이 안정적인 수산물 품목이 있다면 추천받고 싶습니다.",
        author: "최바다",
        createdAt: "2026-07-29",
        viewCount: 28,
    },
    {
        id: 9,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "검색 결과 정렬 문의",
        content:
            "검색 결과를 작성일이나 조회수 순으로 정렬할 수 있는지 궁금합니다.",
        author: "박채소",
        createdAt: "2026-07-28",
        viewCount: 10,
    },
    {
        id: 8,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "관심 품목 알림 문의",
        content:
            "관심 품목의 가격이 크게 변하면 알림을 받을 수 있나요?",
        author: "홍길동",
        createdAt: "2026-07-28",
        viewCount: 22,
    },
    {
        id: 7,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "자치구 비교 결과 문의",
        content:
            "자치구별 가격 비교 결과의 기준일이 모두 같은지 궁금합니다.",
        author: "김하늘",
        createdAt: "2026-07-27",
        viewCount: 13,
    },
    {
        id: 6,
        postType: "GENERAL",
        noticeLevel: "NORMAL",
        pinned: false,
        title: "회원정보 수정 위치",
        content:
            "휴대폰 번호와 주소는 마이페이지에서 수정할 수 있나요?",
        author: "이로운",
        createdAt: "2026-07-27",
        viewCount: 20,
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