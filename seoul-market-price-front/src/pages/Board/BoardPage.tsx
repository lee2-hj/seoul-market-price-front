import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getBoardPostsApi } from "@/api/boardApi";
import type { BoardListItem, BoardSearchType } from "@/features/board/types/board.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 날짜 문자열을 YYYY-MM-DD 포맷으로 변환하는 함수
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 제목을 최대 20자로 제한하는 헬퍼 함수
 */
function truncateTitle(title: string, maxLength = 20): string {
  if (title.length > maxLength) {
    return title.slice(0, maxLength) + "...";
  }
  return title;
}

/**
 * 오리지널 디자인 규격의 게시글 테이블 행 컴포넌트
 */
interface BoardRowProps {
  item: BoardListItem;
  displayNo: string | number;
  isTopNotice?: boolean;
}

function BoardRow({ item, displayNo, isTopNotice = false }: BoardRowProps) {
  const isNotice = isTopNotice || item.postType === "NOTICE";

  return (
    <tr
      className={
        isNotice
          ? "bg-[#fff9e9] hover:bg-[#fff6dc] transition-colors border-b border-[#edf1ec]"
          : "bg-white hover:bg-[#f8faf7] transition-colors border-b border-[#edf1ec]"
      }
    >
      {/* 1. 번호 (9%) */}
      <td className="h-[62px] px-3.5 text-center text-[13px] text-[#5a6459] align-middle font-medium">
        {isNotice ? "공지" : displayNo}
      </td>

      {/* 2. 구분 배지 (10%) */}
      <td className="h-[62px] px-3.5 text-center align-middle">
        <span
          className={
            isNotice
              ? "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#fff0c7] text-[#bd7b00]"
              : "inline-flex items-center justify-center min-w-[48px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#e8f4e9] text-[#4c8c53]"
          }
        >
          {isNotice ? "공지" : "일반"}
        </span>
      </td>

      {/* 3. 제목 (43%) */}
      <td className="h-[62px] px-3.5 text-left align-middle overflow-hidden whitespace-nowrap text-ellipsis">
        <Link
          to={`/board/${item.boardId}`}
          className={
            isNotice
              ? "block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold text-[#7e5b16] hover:underline"
              : "block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-[#384138] hover:underline hover:text-[#4c9b55]"
          }
          title={item.title}
        >
          {truncateTitle(item.title)}
        </Link>
      </td>

      {/* 4. 작성자 (14%) */}
      <td className="h-[62px] px-3.5 text-center text-[13px] text-[#5a6459] align-middle">
        {item.authorName}
      </td>

      {/* 5. 작성일 (15%) */}
      <td className="h-[62px] px-3.5 text-center text-[13px] text-[#5a6459] align-middle">
        {formatDate(item.createdAt)}
      </td>

      {/* 6. 조회수 (9%) */}
      <td className="h-[62px] px-3.5 text-center text-[13px] text-[#5a6459] align-middle">
        {item.viewCount}
      </td>
    </tr>
  );
}

/**
 * 오리지널 디자인 게시판 메인 컴포넌트
 */
export default function BoardPage() {
  const navigate = useNavigate();
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

  // 6. 탭 이동 핸들러
  const handleTabClick = (tabKey: string) => {
    if (tabKey === "qna") {
      navigate("/Qna");
    } else if (tabKey === "faq") {
      alert("자주묻는질문 페이지는 준비 중입니다.");
    }
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

        {/* 오리지널 카테고리 탭 ([일반게시판] [Q&A게시판] [자주묻는질문]) */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#dce4da] shadow-sm">
            <button
              onClick={() => handleTabClick("board")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#4c9b55] text-white transition-all"
            >
              일반게시판
            </button>
            <button
              onClick={() => handleTabClick("qna")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all"
            >
              Q&A게시판
            </button>
            <button
              onClick={() => handleTabClick("faq")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all"
            >
              자주묻는질문
            </button>
          </div>
        </div>

        {/* 오리지널 검색 영역 (연한 녹색 틴트 박스 #f4f7f3) */}
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

        {/* 오리지널 테이블 영역 */}
        <div className="w-full overflow-x-auto bg-white border border-[#dce4da] rounded-[12px] shadow-[0_7px_24px_rgba(45,70,45,0.05)]">
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
            <table className="w-full min-w-[820px] border-collapse table-fixed">
              <thead className="bg-[#eef3ed]">
                <tr>
                  <th className="w-[9%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    번호
                  </th>
                  <th className="w-[10%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    구분
                  </th>
                  <th className="w-[43%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    제목
                  </th>
                  <th className="w-[14%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    작성자
                  </th>
                  <th className="w-[15%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    작성일
                  </th>
                  <th className="w-[9%] h-[55px] px-3.5 border-b border-[#dce4da] text-[#3e483d] text-[13px] font-extrabold text-center">
                    조회수
                  </th>
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          )}
        </div>

        {/* 오리지널 페이지네이션 */}
        {data && data.totalPages > 1 && (
          <nav className="flex items-center justify-center gap-1.5 pt-6">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="w-[38px] h-[38px] inline-flex items-center justify-center border border-[#dce4da] rounded-[7px] bg-white text-[#6a7469] font-bold text-[13px] hover:border-[#8fbd94] hover:bg-[#f0f6ef] hover:text-[#4c9b55] disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#6a7469] disabled:hover:border-[#dce4da]"
            >
              &lt;
            </button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePageChange(p)}
                className={
                  p === page
                    ? "w-[38px] h-[38px] inline-flex items-center justify-center border border-[#4c9b55] rounded-[7px] bg-[#4c9b55] text-white font-bold text-[13px]"
                    : "w-[38px] h-[38px] inline-flex items-center justify-center border border-[#dce4da] rounded-[7px] bg-white text-[#6a7469] font-bold text-[13px] hover:border-[#8fbd94] hover:bg-[#f0f6ef] hover:text-[#4c9b55]"
                }
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.totalPages}
              className="w-[38px] h-[38px] inline-flex items-center justify-center border border-[#dce4da] rounded-[7px] bg-white text-[#6a7469] font-bold text-[13px] hover:border-[#8fbd94] hover:bg-[#f0f6ef] hover:text-[#4c9b55] disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#6a7469] disabled:hover:border-[#dce4da]"
            >
              &gt;
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}