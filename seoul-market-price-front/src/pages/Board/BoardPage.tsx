import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getBoardPostsApi } from "@/api/boardApi";
import type { BoardListItem, BoardSearchType } from "@/features/board/types/board.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

/**
 * shadcn/ui Table 컴포넌트 규격의 게시글 테이블 행 컴포넌트
 */
interface BoardRowProps {
  item: BoardListItem;
  displayNo: string | number;
  isTopNotice?: boolean;
}

function BoardRow({ item, displayNo, isTopNotice = false }: BoardRowProps) {
  const isNotice = isTopNotice || item.postType === "NOTICE";

  return (
    <TableRow
      className={
        isNotice
          ? "bg-[#fff9e9] hover:bg-[#fff6dc]"
          : "bg-white hover:bg-[#f8faf7]"
      }
    >
      {/* 1. 번호 (9%) */}
      <TableCell className="w-[9%] text-center text-[#5a6459] font-medium">
        {isNotice ? "공지" : displayNo}
      </TableCell>

      {/* 2. 구분 배지 (10%) */}
      <TableCell className="w-[10%] text-center">
        <span
          className={
            isNotice
              ? "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fff0c7] text-[#bd7b00]"
              : "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#e8f4e9] text-[#4c8c53]"
          }
        >
          {isNotice ? "공지" : "일반"}
        </span>
      </TableCell>

      {/* 3. 제목 (43%, Tailwind 'truncate'로 오버플로우 처리) */}
      <TableCell className="w-[43%] text-left max-w-0">
        <Link
          to={`/board/${item.boardId}`}
          className={
            isNotice
              ? "block truncate w-full text-[14px] font-bold text-[#7e5b16] hover:underline"
              : "block truncate w-full text-[14px] font-semibold text-[#384138] hover:underline hover:text-[#4c9b55]"
          }
          title={item.title}
        >
          {item.title}
        </Link>
      </TableCell>

      {/* 4. 작성자 (14%) */}
      <TableCell className="w-[14%] text-center text-[#5a6459]">
        {item.authorName}
      </TableCell>

      {/* 5. 작성일 (15%) */}
      <TableCell className="w-[15%] text-center text-[#5a6459]">
        {item.createdAt}
      </TableCell>

      {/* 6. 조회수 (9%) */}
      <TableCell className="w-[9%] text-center text-[#5a6459]">
        {item.viewCount}
      </TableCell>
    </TableRow>
  );
}

/**
 * 게시판 메인 컴포넌트
 */
export default function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. URL Query Parameters 파싱
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const searchTypeParam = searchParams.get("searchType");
  const searchType: BoardSearchType = searchTypeParam === "author" ? "author" : "title";
  const keyword = searchParams.get("keyword") || "";

  // 2. 로컬 검색 State
  const [inputSearchType, setInputSearchType] = useState<BoardSearchType>(searchType);
  const [inputKeyword, setInputKeyword] = useState<string>(keyword);

  useEffect(() => {
    setInputSearchType(searchType);
    setInputKeyword(keyword);
  }, [searchType, keyword]);

  // 3. TanStack Query 서버 데이터 수신
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["boards", { page, searchType, keyword }],
    queryFn: () => getBoardPostsApi({ page, size: 10, searchType, keyword }),
  });

  // 4. 검색 Form 제출 핸들러
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchParams({
        page: "1",
        searchType: inputSearchType,
        keyword: inputKeyword.trim(),
      });
    },
    [inputSearchType, inputKeyword, setSearchParams]
  );

  // 검색 초기화
  const handleResetSearch = useCallback(() => {
    setInputSearchType("title");
    setInputKeyword("");
    setSearchParams({ page: "1", searchType: "title", keyword: "" });
  }, [setSearchParams]);

  // 5. 페이지 이동 핸들러
  const handlePageChange = useCallback(
    (newPage: number) => {
      setSearchParams({
        page: String(newPage),
        searchType,
        keyword,
      });
    },
    [searchType, keyword, setSearchParams]
  );

  // 6. 탭 이동 핸들러 (alert 팝업 완전 제거, 무반응 처리)
  const handleTabClick = (_tabKey: string) => {
    // 팝업이나 페이지 이동 없이 완전 무반응 유지
  };

  // 7. 페이지 번호 목록 생성
  const pageNumbers = useMemo(() => {
    if (!data || data.totalPages <= 1) return [];
    const totalPages = data.totalPages;
    const pages: number[] = [];

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [data, page]);

  const notices = data?.notices || [];
  const items = data?.items || [];
  const totalElements = data?.totalElements || 0;

  return (
    <div className="min-h-screen bg-[#fafcf9] py-12 px-5 sm:px-8">
      <div className="max-w-[1000px] mx-auto space-y-8">
        {/* 오리지널 헤더 영역 */}
        <div className="text-center space-y-2 mb-8">
          <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            CUSTOMER CENTER
          </span>
          <h1 className="text-[36px] font-black text-[#242b23] tracking-tight">
            게시판
          </h1>
          <p className="text-[15px] text-[#667065]">
            서울시 농수산물 가격 정보 서비스의 주요 공지사항과 시민 소통 공간입니다.
          </p>
        </div>

        {/* 카테고리 탭 ([일반게시판] [Q&A게시판] [자주묻는질문] - 디자인 보존 및 팝업/이동 완전 무반응) */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#dce4da] shadow-sm">
            <button
              onClick={() => handleTabClick("board")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#4c9b55] text-white transition-all cursor-pointer"
            >
              일반게시판
            </button>
            <button
              onClick={() => handleTabClick("qna")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all cursor-pointer"
            >
              Q&A게시판
            </button>
            <button
              onClick={() => handleTabClick("faq")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all cursor-pointer"
            >
              자주묻는질문
            </button>
          </div>
        </div>

        {/* 검색 영역 */}
        <div className="bg-[#f4f7f3] border border-[#dce4da] rounded-[12px] p-5 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
            <select
              value={inputSearchType}
              onChange={(e) => setInputSearchType(e.target.value as BoardSearchType)}
              className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#dce4da] bg-white px-3 text-[14px] text-[#3e483d] focus:outline-none focus:border-[#4c9b55]"
            >
              <option value="title">제목</option>
              <option value="author">작성자</option>
            </select>
            <Input
              type="text"
              placeholder="검색어를 입력하세요."
              value={inputKeyword}
              onChange={(e) => setInputKeyword(e.target.value)}
              className="h-[44px] flex-1 bg-white border-[#dce4da] text-[14px] placeholder:text-[#939c92] focus-visible:ring-[#4c9b55]"
            />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                type="submit"
                className="h-[44px] px-6 bg-[#343c33] hover:bg-[#252b24] text-white text-[14px] font-bold rounded-[7px] flex-1 md:flex-none"
              >
                검색
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetSearch}
                className="h-[44px] px-5 bg-white border-[#dce4da] text-[#5a6459] hover:bg-[#eef3ed] text-[14px] font-bold rounded-[7px] flex-1 md:flex-none"
              >
                초기화
              </Button>
            </div>
          </form>
        </div>

        {/* 목록 건수 정보 & 글쓰기 버튼 영역 */}
        <div className="flex items-center justify-between mb-3 min-h-[44px]">
          <p className="text-[14px] text-[#667065]">
            전체 <strong className="text-[#4c9b55] font-extrabold">{totalElements}</strong>개의 게시글이 있습니다.
          </p>
          <Link
            to="/board/write"
            className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold rounded-[7px] transition-colors border border-[#4c9b55]"
          >
            글쓰기
          </Link>
        </div>

        {/* Table 영역 */}
        <div className="w-full bg-white border border-[#dce4da] rounded-[12px] shadow-[0_7px_24px_rgba(45,70,45,0.05)] overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-[#8a9388] text-[14px]">
              게시글 목록을 불러오는 중입니다...
            </div>
          ) : isError ? (
            <div className="p-16 text-center text-rose-500 text-[14px]">
              오류가 발생했습니다: {(error as Error).message}
            </div>
          ) : notices.length === 0 && items.length === 0 ? (
            <div className="p-16 text-center text-[#8a9388] text-[14px]">
              등록된 게시글이 없습니다.
            </div>
          ) : (
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[9%] text-center">번호</TableHead>
                  <TableHead className="w-[10%] text-center">구분</TableHead>
                  <TableHead className="w-[43%] text-center">제목</TableHead>
                  <TableHead className="w-[14%] text-center">작성자</TableHead>
                  <TableHead className="w-[15%] text-center">작성일</TableHead>
                  <TableHead className="w-[9%] text-center">조회수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 상단 공지사항 */}
                {notices.map((notice) => (
                  <BoardRow
                    key={`notice-${notice.boardId}`}
                    item={notice}
                    displayNo="공지"
                    isTopNotice
                  />
                ))}

                {/* 일반 게시글 */}
                {items.map((item, index) => {
                  const displayNo = totalElements - ((page - 1) * 10 + index);
                  return (
                    <BoardRow
                      key={`item-${item.boardId}`}
                      item={item}
                      displayNo={displayNo > 0 ? displayNo : index + 1}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination 영역 */}
        {data && data.totalPages > 1 && (
          <Pagination className="pt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                />
              </PaginationItem>

              {pageNumbers.map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= data.totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}