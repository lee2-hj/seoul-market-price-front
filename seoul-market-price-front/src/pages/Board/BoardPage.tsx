import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { getBoardPostsApi } from '@/api/api';
import { isLogin } from '@/features/auth/utils/auth';
import type { BoardListItem, BoardSearchType } from '@/features/board/types/board.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { maskAuthorName } from '@/lib/utils';
import SectionSidebarLayout from '@/components/SectionSidebarLayout';
import { CUSTOMER_CENTER_NAVIGATION } from '@/config/sectionNavigation';
import BoardPageHeader from '@/features/board/components/BoardPageHeader';
import { formatBoardDate } from '@/features/board/utils/boardDisplay';

const BOARD_LIST_SESSION_KEY = 'board_list_query';

// 목록에 렌더링할 게시글 항목(공지/일반 통합 + 공지 여부 플래그 사전 계산)
interface BoardDisplayItem extends BoardListItem {
  isNotice: boolean;
}

// select 반환 타입 정의
interface BoardPostsSelectResult {
  rows: BoardDisplayItem[];
  totalElements: number;
  totalPages: number;
}

// URL 쿼리 파라미터 타입 정의
type BoardQueryParamKeys = 'page' | 'searchType' | 'keyword';

interface BoardQueryState {
  page: number;
  searchType: BoardSearchType;
  keyword: string;
}

// 1페이지 공지 고정 노출을 위해 안전 상한 내에서만 최신 게시글을 스캔한다.
const NOTICE_SCAN_SIZE = 20;

export default function BoardPage() {
  const navigate = useNavigate();

  // 1. URL 쿼리 파라미터 상태 관리 (QueryParamProvider 없이 react-router-dom의 useSearchParams로 대체)
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredSessionRef = useRef(false);

  useEffect(() => {
    if (!hasRestoredSessionRef.current) {
      hasRestoredSessionRef.current = true;
      if (!searchParams.toString()) {
        const savedQuery = sessionStorage.getItem(BOARD_LIST_SESSION_KEY);
        if (savedQuery) {
          setSearchParams(new URLSearchParams(savedQuery), { replace: true });
          return;
        }
      }
    }

    if (searchParams.toString()) {
      sessionStorage.setItem(BOARD_LIST_SESSION_KEY, searchParams.toString());
    }
  }, [searchParams, setSearchParams]);
  const getParam = (key: BoardQueryParamKeys): string | null => searchParams.get(key);

  const query: BoardQueryState = {
    page: Number(getParam('page')) || 1,
    searchType: (getParam('searchType') as BoardSearchType) || 'TITLE',
    keyword: getParam('keyword') || '',
  };

  const setQuery = (updates: Partial<BoardQueryState>) => {
    const next: BoardQueryState = { ...query, ...updates };
    const params: Partial<Record<BoardQueryParamKeys, string>> = { page: String(next.page) };

    // keyword가 없을 때는 searchType/keyword를 URL에 노출하지 않음
    if (next.keyword) {
      params.searchType = next.searchType;
      params.keyword = next.keyword;
    }

    setSearchParams(params);
  };

  // 검색 폼: searchType/keyword 2개 필드뿐이라 RHF 없이 네이티브 FormData 제출로 처리한다.
  // URL 쿼리(query)가 SSOT이므로, Select/Input은 defaultValue로만 초기화하고
  // query가 바뀌면(초기화 버튼, 세션 복원 등) key를 바꿔 강제로 리마운트해 동기화한다.
  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const keyword = String(formData.get('keyword') ?? '').trim();
    if (!keyword) {
      alert('검색어를 입력해 주세요.');
      return;
    }
    const searchType = (formData.get('searchType') as BoardSearchType) || 'TITLE';
    setQuery({ page: 1, searchType, keyword });
  };

  const handleResetSearch = () => {
    sessionStorage.removeItem(BOARD_LIST_SESSION_KEY);
    setQuery({ page: 1, searchType: 'TITLE', keyword: '' });
  };

  // 2. URL 검색 조건이 변경되면 React Query가 자동으로 다시 조회한다.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPosts', query.page, query.searchType, query.keyword],
    queryFn: async () => {
      // 키워드 검색: 공지 고정 없이 검색 결과를 최신순으로 그대로 보여준다 (단일 호출).
      if (query.keyword) {
        const searchData = await getBoardPostsApi({
          page: query.page,
          size: 10,
          searchType: query.searchType,
          keyword: query.keyword,
        });
        const searchItems = [...searchData.notices, ...searchData.items].sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.boardId - a.boardId,
        );
        return {
          notices: [],
          items: searchItems,
          totalElements: searchData.totalElements,
          totalPages: searchData.totalPages,
        };
      }

      if (query.page === 1) {
        // 공지사항은 1페이지 상단에만 고정 노출된다(2페이지부터는 공지 없이 일반 목록만 표시).
        // 백엔드에 공지 전용 조회 API가 없어, DB 전체를 다시 긁어오는 대신
        // 최신 상위 NOTICE_SCAN_SIZE건 안에서만 공지를 찾는 안전 상한을 둔다.
        // TODO(backend): 공지 전용 API(예: GET /api/boards/notices)가 분리되면
        // 이 스캔 로직 없이 정확한 전체 공지 목록을 가져오도록 교체할 것.
        const scanData = await getBoardPostsApi({ page: 1, size: NOTICE_SCAN_SIZE });
        const pinnedNotices = scanData.notices.slice(0, 2);
        const items = scanData.items.slice(0, 10 - pinnedNotices.length);

        return {
          notices: pinnedNotices,
          items,
          totalElements: scanData.totalElements,
          totalPages: Math.ceil(scanData.totalElements / 10),
        };
      }

      // 2페이지 이상: 공지가 항상 없으므로 단일 호출로 그대로 사용한다.
      const pageData = await getBoardPostsApi({ page: query.page, size: 10 });
      return {
        notices: [],
        items: pageData.items,
        totalElements: pageData.totalElements,
        totalPages: pageData.totalPages,
      };
    },
    select: (res): BoardPostsSelectResult => {
      const notices = (res?.notices ?? []) as BoardListItem[];
      const items = (res?.items ?? []) as BoardListItem[];
      const rows: BoardDisplayItem[] = [...notices, ...items].map((item) => ({
        ...item,
        isNotice: item.postType === 'NOTICE',
      }));

      return {
        rows,
        totalElements: res?.totalElements ?? 0,
        totalPages: res?.totalPages ?? 0,
      };
    },
  });

  // 3. 현재 페이지 그룹에 표시할 페이지 번호 계산
  const pageNumbers = useMemo(() => {
    if (!data?.totalPages) return [];

    const totalPages = data.totalPages;
    const currentGroup: number = Math.ceil(query.page / 5);
    const startPage: number = (currentGroup - 1) * 5 + 1;
    const endPage: number = Math.min(startPage + 4, totalPages);

    return Array.from(
      { length: Math.max(0, endPage - startPage + 1) },
      (_: unknown, i: number): number => startPage + i
    );
  }, [data?.totalPages, query.page]);

  // 페이지 이동 처리 (상단 스크롤 포함)
  const changePage = (targetPage: number) => {
    setQuery({ page: targetPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SectionSidebarLayout
      sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
      menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
    >
      <div className="min-h-screen bg-[#F5FAFC]">
        <div className="py-12 px-5 sm:px-8">
          <div className="max-w-[1000px] mx-auto space-y-8">
            <BoardPageHeader
              eyebrow="SSABU CUSTOMER CENTER"
              title="게시판"
              description="싸부(SSABU) 부동산 실거래 및 시세 분석 서비스의 다양한 이야기를 나누는 공간입니다."
            />

            {/* 검색 영역 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-5 mb-6 shadow-xs">
              <form
                onSubmit={onSearchSubmit}
                className="flex flex-col md:flex-row items-center gap-3"
              >
                <Select name="searchType" key={`select-${query.searchType}`} defaultValue={query.searchType}>
                  <SelectTrigger className="h-[44px] w-full md:w-[130px] rounded-[7px] border-[#DCE8ED] bg-[#F5FAFC] text-[14px] text-[#13202B]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITLE">제목</SelectItem>
                    <SelectItem value="WRITER">작성자</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  name="keyword"
                  key={`input-${query.keyword}`}
                  defaultValue={query.keyword}
                  placeholder="검색어를 입력하세요."
                  className="h-[44px] flex-1 bg-[#F5FAFC] border-[#DCE8ED] text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-[#0F8AA8]"
                />

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button type="submit" className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px]">
                    검색
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetSearch}
                    className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[7px]"
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </div>

            {/* 건수 및 글쓰기 버튼 */}
            <div className="flex items-center justify-between mb-3 min-h-[44px]">
              <p className="text-[14px] text-[#6B7280]">
                전체 <strong className="text-[#0F8AA8] font-extrabold">{data?.totalElements ?? 0}</strong>개의 게시글이 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!isLogin()) {
                    alert('로그인이 필요한 서비스입니다.');
                    return navigate('/login');
                  }
                  navigate('/board/write');
                }}
                className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] border border-[#0F8AA8] cursor-pointer shadow-xs"
              >
                글쓰기
              </button>
            </div>

            {/* 테이블 */}
            <div className="w-full bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs overflow-hidden">
              {isLoading ? (
                <div className="p-16 text-center text-[#6B7280] text-[14px]">게시글 목록을 불러오는 중입니다...</div>
              ) : isError ? (
                <div className="p-16 text-center text-rose-500 text-[14px]">오류가 발생했습니다: {(error as Error).message}</div>
              ) : !data?.rows.length ? (
                <div className="p-16 text-center text-[#6B7280] text-[14px]">등록된 게시글이 없습니다.</div>
              ) : (
                <>
                  {/* 1. PC/태블릿 화면: 기존 6열 테이블 */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table className="min-w-[820px] border-collapse">
                      <TableHeader>
                        <TableRow className="bg-[#F0F7FA] border-b border-[#DCE8ED]">
                          <TableHead className="w-[9%] text-center text-[#123047] font-bold">번호</TableHead>
                          <TableHead className="w-[10%] text-center text-[#123047] font-bold">구분</TableHead>
                          <TableHead className="w-[43%] text-center text-[#123047] font-bold">제목</TableHead>
                          <TableHead className="w-[14%] text-center text-[#123047] font-bold">작성자</TableHead>
                          <TableHead className="w-[15%] text-center text-[#123047] font-bold">작성일</TableHead>
                          <TableHead className="w-[9%] text-center text-[#123047] font-bold">조회수</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#DCE8ED]">
                        {(data?.rows ?? []).map((item: BoardDisplayItem, index: number) => {
                          const displayNo = Math.max(
                            1,
                            (data?.totalElements ?? 0) - ((query.page - 1) * 10 + index),
                          );
                          const { isNotice } = item;

                          return (
                            <TableRow
                              key={`row-${item.boardId}`}
                              className={isNotice ? 'bg-[#F0F7FA] hover:bg-[#E1EFF5] border-b border-[#DCE8ED]' : 'bg-white hover:bg-[#F5FAFC] border-b border-[#DCE8ED]'}
                            >
                              <TableCell className="w-[9%] text-center text-[#6B7280] font-medium">
                                {displayNo}
                              </TableCell>
                              <TableCell className="w-[10%] text-center">
                                <span
                                  className={
                                    isNotice
                                      ? 'inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                      : 'inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#E6F4F2] text-[#0F766E]'
                                  }
                                >
                                  {isNotice ? '공지' : '일반'}
                                </span>
                              </TableCell>
                              <TableCell className="w-[43%] text-left max-w-0">
                                <Link
                                  to={`/board/${item.boardId}`}
                                  className={`block truncate w-full text-[14px] no-underline hover:text-[#0F8AA8] ${isNotice ? 'font-bold text-[#0B5E73]' : 'font-semibold text-[#13202B]'}`}
                                  title={item.title}
                                >
                                  {item.title}
                                </Link>
                              </TableCell>
                              <TableCell className="w-[14%] text-center text-[#6B7280]">{maskAuthorName(item.authorName)}</TableCell>
                              <TableCell className="w-[15%] text-center text-[#6B7280]">{formatBoardDate(item.createdAt)}</TableCell>
                              <TableCell className="w-[9%] text-center text-[#6B7280]">{item.viewCount?.toLocaleString() || 0}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 2. 모바일 화면: 가로 스크롤 없는 한눈에 들어오는 카드형 피드 */}
                  <div className="divide-y divide-[#DCE8ED] md:hidden">
                    {(data?.rows ?? []).map((item: BoardDisplayItem) => {
                      const { isNotice } = item;

                      return (
                        <Link
                          key={`mobile-row-${item.boardId}`}
                          to={`/board/${item.boardId}`}
                          className={`block p-4 transition-colors no-underline ${
                            isNotice ? 'bg-[#F0F7FA] hover:bg-[#E1EFF5]' : 'bg-white hover:bg-[#F5FAFC]'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isNotice
                                  ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                  : 'bg-[#E6F4F2] text-[#0F766E]'
                              }`}
                            >
                              {isNotice ? '공지' : '일반'}
                            </span>
                            <h3
                              className={`text-[14px] leading-snug line-clamp-2 ${
                                isNotice ? 'font-bold text-[#0B5E73]' : 'font-semibold text-[#13202B]'
                              }`}
                            >
                              {item.title}
                            </h3>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-[#6B7280]">
                            <span>{maskAuthorName(item.authorName)}</span>
                            <span>·</span>
                            <span>{formatBoardDate(item.createdAt)}</span>
                            <span>·</span>
                            <span>조회 {item.viewCount?.toLocaleString() || 0}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 페이지네이션 */}
            {data && data.totalPages > 1 && (
              <Pagination className="pt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => changePage(Math.max(1, query.page - 1))} disabled={query.page <= 1} />
                  </PaginationItem>

                  {pageNumbers.map((p: number) => (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === query.page} onClick={() => changePage(p)}>
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext onClick={() => changePage(Math.min(data.totalPages, query.page + 1))} disabled={query.page >= data.totalPages} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>
    </SectionSidebarLayout>
  );
}
