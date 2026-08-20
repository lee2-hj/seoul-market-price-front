import { useMemo } from 'react';
import { getBoardPostsApi } from '@/api/api';
import { isLogin } from '@/features/auth/utils/auth';
import type { BoardListItem, BoardSearchType } from '@/features/board/types/board.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// select 반환 타입 정의
interface BoardPostsSelectResult {
  notices: BoardListItem[];
  items: BoardListItem[];
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

export default function BoardPage() {
  const navigate = useNavigate();

  // 1. URL 쿼리 파라미터 상태 관리 (QueryParamProvider 없이 react-router-dom의 useSearchParams로 대체)
  const [searchParams, setSearchParams] = useSearchParams();
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

  // 2. URL 검색 조건이 변경되면 React Query가 자동으로 다시 조회한다.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['boardPosts', query.page, query.searchType, query.keyword],
    queryFn: async () => {
      const currentPageData = await getBoardPostsApi({
        page: query.page,
        size: 10,
        searchType: query.keyword ? (query.searchType as BoardSearchType) : undefined,
        keyword: query.keyword || undefined,
      });

      // 서버는 공지/일반 구분 없이 최신순으로 페이지를 먼저 나눈다.
      // 따라서 1페이지 응답만으로는 뒤 페이지의 공지를 상단 고정할 수 없어,
      // 전체 범위에서 최신 공지 2건을 한 번 더 조회한다.
      if (query.keyword) {
        return { ...currentPageData, notices: [] };
      }

      const allPostsData = await getBoardPostsApi({
        page: 1,
        size: Math.max(10, currentPageData.totalElements),
      });
      const pinnedNotices = allPostsData.notices.slice(0, 2);
      const pinnedIds = new Set(pinnedNotices.map((notice) => notice.boardId));
      const orderedPosts = [
        ...pinnedNotices,
        ...allPostsData.items.filter((item) => !pinnedIds.has(item.boardId)),
      ];
      const pageStart = (query.page - 1) * 10;
      const pageItems = orderedPosts.slice(pageStart, pageStart + 10);

      return {
        notices: query.page === 1 ? pageItems.filter((item) => pinnedIds.has(item.boardId)) : [],
        items: pageItems.filter((item) => !pinnedIds.has(item.boardId)),
        totalElements: allPostsData.totalElements,
        totalPages: Math.ceil(allPostsData.totalElements / 10),
        currentPage: query.page,
      };
    },
    select: (res): BoardPostsSelectResult => ({
      notices: (res?.notices || []) as BoardListItem[],
      items: (res?.items || []) as BoardListItem[],
      totalElements: res?.totalElements || 0,
      totalPages: res?.totalPages || 0,
    }),
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
    <div className="min-h-screen bg-[#F5FAFC]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              SSABU CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#123047] tracking-tight">게시판</h1>
            <p className="text-[15px] text-[#6B7280]">싸부(SSABU) 부동산 실거래 및 시세 분석 서비스의 다양한 이야기를 나누는 공간입니다.</p>
          </div>

          {/* 고객센터 이동 탭 */}
          <div className="flex justify-center mb-6">
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] border border-[#DCE8ED] bg-white p-1 shadow-sm">
              <button type="button" className="rounded-[8px] bg-[#123047] px-6 py-2.5 text-[14px] font-bold text-white">게시판</button>
              <button type="button" onClick={() => navigate('/qna')} className="rounded-[8px] px-6 py-2.5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA]">질의응답</button>
              <button type="button" onClick={() => navigate('/faq')} className="rounded-[8px] px-6 py-2.5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA]">자주 묻는 질문</button>
            </div>
          </div>

          {/* 검색 영역 */}
          <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-5 mb-6 shadow-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                setQuery({
                  page: 1,
                  searchType: formData.get('searchType') as BoardSearchType,
                  keyword: (formData.get('keyword') as string).trim(),
                });
              }}
              className="flex flex-col md:flex-row items-center gap-3"
            >
              <select
                name="searchType"
                key={`select-${query.searchType}`}
                defaultValue={query.searchType}
                className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#DCE8ED] bg-[#F5FAFC] px-3 text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8]"
              >
                <option value="TITLE">제목</option>
                <option value="WRITER">작성자</option>
              </select>

              <Input
                name="keyword"
                key={`input-${query.keyword}`}
                type="text"
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
                  onClick={() => {
                    setQuery({ page: 1, searchType: 'TITLE', keyword: '' });
                  }}
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
            ) : !data?.items?.length && !data?.notices?.length ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">등록된 게시글이 없습니다.</div>
            ) : (
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
                  {/* 1페이지의 최신 공지 2개만 상단 고정, 이전 공지는 원래 순서로 노출 */}
                  {[...(data?.notices || []), ...(data?.items || [])].map((item: BoardListItem, index: number) => {
                    const displayNo = Math.max(
                      1,
                      (data?.totalElements ?? 0) - ((query.page - 1) * 10 + index),
                    );
                    const isNotice = item.postType === 'NOTICE' || data?.notices?.some((n) => n.boardId === item.boardId);

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
                        <TableCell className="w-[15%] text-center text-[#6B7280]">{item.createdAt?.includes('T') ? `${item.createdAt.split('T')[0].replace(/-/g, '.')} ${item.createdAt.split('T')[1]?.slice(0, 5)}` : item.createdAt?.replace(/-/g, '.') || '-'}</TableCell>
                        <TableCell className="w-[9%] text-center text-[#6B7280]">{item.viewCount?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
  );
}
