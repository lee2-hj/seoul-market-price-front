import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getBoardPostsApi } from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
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

function formatBoardDate(dateStr?: string): string {
  if (!dateStr) return "-";
  if (dateStr.includes("T")) {
    const [d, t] = dateStr.split("T");
    return `${d.replace(/-/g, ".")} ${t ? t.slice(0, 5) : ""}`.trim();
  }
  return dateStr.replace(/-/g, ".");
}

function BoardRow({ item, displayNo, isTopNotice = false }: BoardRowProps) {
  const isNotice = isTopNotice || item.postType === "NOTICE";

  return (
    <TableRow
      className={
        isNotice
          ? "bg-[#F0F7FA] hover:bg-[#E1EFF5]"
          : "bg-white hover:bg-[#F5FAFC]"
      }
    >
      {/* 1. 번호 (9%) */}
      <TableCell className="w-[9%] text-center text-[#6B7280] font-medium">
        {isNotice ? "공지" : displayNo}
      </TableCell>

      {/* 2. 구분 배지 (10%) */}
      <TableCell className="w-[10%] text-center">
        <span
          className={
            isNotice
              ? "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
              : "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#E6F4F2] text-[#0F766E]"
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
              ? "block truncate w-full text-[14px] font-bold text-[#0B5E73] no-underline hover:text-[#0F8AA8]"
              : "block truncate w-full text-[14px] font-semibold text-[#13202B] no-underline hover:text-[#0F8AA8]"
          }
          style={{ textDecoration: "none" }}
          title={item.title}
        >
          {item.title}
        </Link>
      </TableCell>

      {/* 4. 작성자 (14%) */}
      <TableCell className="w-[14%] text-center text-[#6B7280]">
        {item.authorName}
      </TableCell>

      {/* 5. 작성일 (15%) */}
      <TableCell className="w-[15%] text-center text-[#6B7280]">
        {formatBoardDate(item.createdAt)}
      </TableCell>

      {/* 6. 조회수 (9%) */}
      <TableCell className="w-[9%] text-center text-[#6B7280]">
        {item.viewCount?.toLocaleString() || 0}
      </TableCell>
    </TableRow>
  );
}

export default function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. URL 쿼리 파라미터 동기화
  const page = useMemo(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  }, [searchParams]);

  const searchType = useMemo(() => {
    const t = searchParams.get("searchType");
    return t === "WRITER" ? "WRITER" : "TITLE";
  }, [searchParams]);

  const keyword = useMemo(() => {
    return searchParams.get("keyword") || "";
  }, [searchParams]);

  // 2. 검색 폼 내부 로컬 상태
  const [inputSearchType, setInputSearchType] = useState<BoardSearchType>(searchType);
  const [inputKeyword, setInputKeyword] = useState<string>(keyword);

  // URL 파라미터 변경 시 입력 폼 상태 동기화
  useEffect(() => {
    setInputSearchType(searchType);
    setInputKeyword(keyword);
  }, [searchType, keyword]);

  // 3. React Query를 활용한 게시글 목록 페칭
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["boardPosts", page, searchType, keyword],
    queryFn: () =>
      getBoardPostsApi({
        page,
        size: 10,
        searchType: keyword ? searchType : undefined,
        keyword: keyword || undefined,
      }),
  });

  // 4. 검색 제출 핸들러
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");
    if (inputKeyword.trim()) {
      nextParams.set("searchType", inputSearchType);
      nextParams.set("keyword", inputKeyword.trim());
    } else {
      nextParams.delete("searchType");
      nextParams.delete("keyword");
    }
    setSearchParams(nextParams);
  };

  // 5. 검색 초기화 핸들러
  const handleResetSearch = () => {
    setInputSearchType("TITLE");
    setInputKeyword("");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", "1");
    nextParams.delete("searchType");
    nextParams.delete("keyword");
    setSearchParams(nextParams);
  };

  // 6. 페이지 변경 핸들러
  const handlePageChange = useCallback(
    (targetPage: number) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("page", targetPage.toString());
      setSearchParams(nextParams);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [searchParams, setSearchParams]
  );

  // 7. 글쓰기 버튼 클릭 핸들러 (로그인 여부 체크)
  const handleWriteClick = () => {
    if (!isLogin()) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }
    navigate("/board/write");
  };

  // 페이지네이션 번호 리스트 계산 (최대 5개씩 표시)
  const pageNumbers = useMemo(() => {
    if (!data?.totalPages) return [];
    const totalPages = data.totalPages;
    const currentGroup = Math.ceil(page / 5);
    const startPage = (currentGroup - 1) * 5 + 1;
    const endPage = Math.min(startPage + 4, totalPages);

    const nums: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      nums.push(i);
    }
    return nums;
  }, [page, data?.totalPages]);

  const notices = useMemo(() => {
    return data?.notices || [];
  }, [data?.notices]);

  const items = useMemo(() => {
    return data?.items || [];
  }, [data?.items]);

  const totalElements = data?.totalElements || 0;

  return (
    <div className="min-h-screen bg-[#F5FAFC]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 영역 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              SSABU CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#123047] tracking-tight">
              공지사항
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              싸부(SSABU) 부동산 실거래 및 시세 분석 서비스의 주요 소식을 전해드립니다.
            </p>
          </div>

          {/* 카테고리 탭 ([공지사항] [질의응답] [자주 묻는 질문]) */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#DCE8ED] shadow-sm">
              <button
                type="button"
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#123047] text-white transition-all cursor-pointer shadow-xs"
              >
                공지사항
              </button>
              <button
                type="button"
                onClick={() => navigate("/qna")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F0F7FA] hover:text-[#123047] transition-all cursor-pointer"
              >
                질의응답
              </button>
              <button
                type="button"
                onClick={() => navigate("/faq")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F0F7FA] hover:text-[#123047] transition-all cursor-pointer"
              >
                자주 묻는 질문
              </button>
            </div>
          </div>

          {/* 검색 영역 */}
          <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-5 mb-6 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={inputSearchType}
                onChange={(e) => setInputSearchType(e.target.value as BoardSearchType)}
                className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#DCE8ED] bg-[#F5FAFC] px-3 text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8]"
              >
                <option value="TITLE">제목</option>
                <option value="WRITER">작성자</option>
              </select>
              <Input
                type="text"
                placeholder="검색어를 입력하세요."
                value={inputKeyword}
                onChange={(e) => setInputKeyword(e.target.value)}
                className="h-[44px] flex-1 bg-[#F5FAFC] border-[#DCE8ED] text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-[#0F8AA8]"
              />
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  type="submit"
                  className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] flex-1 md:flex-none cursor-pointer"
                >
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSearch}
                  className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[7px] flex-1 md:flex-none cursor-pointer"
                >
                  초기화
                </Button>
              </div>
            </form>
          </div>

          {/* 목록 건수 정보 & 글쓰기 버튼 영역 */}
          <div className="flex items-center justify-between mb-3 min-h-[44px]">
            <p className="text-[14px] text-[#6B7280]">
              전체 <strong className="text-[#0F8AA8] font-extrabold">{totalElements}</strong>개의 게시글이 있습니다.
            </p>
            <button
              type="button"
              onClick={handleWriteClick}
              className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] transition-colors border border-[#0F8AA8] cursor-pointer shadow-xs"
            >
              글쓰기
            </button>
          </div>

          {/* Table 영역 */}
          <div className="w-full bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">
                게시글 목록을 불러오는 중입니다...
              </div>
            ) : isError ? (
              <div className="p-16 text-center text-rose-500 text-[14px]">
                오류가 발생했습니다: {(error as Error).message}
              </div>
            ) : notices.length === 0 && items.length === 0 ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">
                등록된 게시글이 없습니다.
              </div>
            ) : (
              <Table className="min-w-[820px]">
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
    </div>
  );
}
