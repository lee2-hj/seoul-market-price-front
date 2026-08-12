import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getQnasApi, type QnaListResponse } from "@/api/api";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
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

type SearchType = "title" | "author" | "content";

const POSTS_PER_PAGE = 10;

const isAdminUser = (role: string): boolean => {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  if (dateStr.includes("T")) {
    const [d, t] = dateStr.split("T");
    return `${d.replace(/-/g, ".")} ${t ? t.slice(0, 5) : ""}`.trim();
  }
  return dateStr.replace(/-/g, ".");
}

interface QnaRowProps {
  item: QnaListResponse;
  displayNo: number;
  isAdmin: boolean;
  isMyPost: boolean;
  onPostClick: (post: QnaListResponse) => void;
}

function QnaRow({
  item,
  displayNo,
  isAdmin,
  isMyPost,
  onPostClick,
}: QnaRowProps) {
  const answered = Boolean(
    item.answeredAt ||
    item.answerStatus === "ANSWERED" ||
    item.answerStatus === "답변완료"
  );
  const isPrivate = item.publicQuestion === false;

  return (
    <TableRow className="bg-white hover:bg-[#f8faf7]">
      {/* 1. 번호 (9%) */}
      <TableCell className="w-[9%] text-center text-[#5a6459] font-medium">
        {displayNo}
      </TableCell>

      {/* 2. 구분 배지 (10%) */}
      <TableCell className="w-[10%] text-center">
        <span
          className={
            answered
              ? "inline-flex items-center justify-center min-w-[56px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#e8f4e9] text-[#4c8c53]"
              : "inline-flex items-center justify-center min-w-[56px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#f1f5f9] text-[#64748b]"
          }
        >
          {answered ? "답변완료" : "답변대기"}
        </span>
      </TableCell>

      {/* 3. 제목 (43%) */}
      <TableCell className="w-[43%] text-left max-w-0">
        <button
          type="button"
          onClick={() => onPostClick(item)}
          className="block truncate w-full text-[14px] font-semibold text-[#384138] hover:text-[#4c9b55] text-left cursor-pointer border-none bg-transparent p-0 no-underline"
          style={{ textDecoration: "none" }}
          title={
            isPrivate
              ? isAdmin
                ? "관리자 권한으로 비공개글 보기"
                : isMyPost
                  ? "내 비공개 게시글 보기"
                  : "비공개 게시글입니다."
              : "공개 게시글 보기"
          }
        >
          <span className="truncate">
            {isPrivate && <span className="mr-1 inline-block text-[13px]">🔒</span>}
            {!isPrivate || isAdmin || isMyPost
              ? item.title
              : "비공개 글입니다."}
          </span>
          {item.attachmentAvailable && (
            <span className="ml-1.5 inline-block text-[12px]" title="첨부파일 있음">
              📎
            </span>
          )}
        </button>
      </TableCell>

      {/* 4. 작성자 (14%) */}
      <TableCell className="w-[14%] text-center text-[#5a6459]">
        {item.writerName || "-"}
      </TableCell>

      {/* 5. 작성일 (15%) */}
      <TableCell className="w-[15%] text-center text-[#5a6459]">
        {formatDate(item.createdAt)}
      </TableCell>

      {/* 6. 조회수 (9%) */}
      <TableCell className="w-[9%] text-center text-[#5a6459]">
        {item.viewCount ?? 0}
      </TableCell>
    </TableRow>
  );
}

export default function QnaPage() {
  const navigate = useNavigate();

  const isLoggedIn = isLogin();

  const loginUser = useMemo(() => {
    if (!isLoggedIn) return null;
    return getLoginUser();
  }, [isLoggedIn]);

  const loginUserId = String(loginUser?.userId ?? "").trim();

  const isAdmin = useMemo(() => {
    return isAdminUser(loginUser?.role ?? "");
  }, [loginUser]);

  const [posts, setPosts] = useState<QnaListResponse[]>([]);
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getPostWriterId = useCallback((post: QnaListResponse): string => {
    const postData = post as QnaListResponse & {
      writerLoginId?: string | number | null;
      userId?: string | number | null;
      memberId?: string | number | null;
    };
    return (
      String(postData.writerLoginId ?? "").trim() ||
      String(postData.userId ?? "").trim() ||
      String(postData.memberId ?? "").trim() ||
      ""
    );
  }, []);

  const isMyPost = useCallback(
    (post: QnaListResponse): boolean => {
      const postWriterId = getPostWriterId(post);
      if (!loginUserId || !postWriterId) return false;
      return postWriterId === loginUserId;
    },
    [getPostWriterId, loginUserId]
  );

  const fetchQnaPosts = useCallback(async (page: number, keyword: string) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getQnasApi(page - 1, POSTS_PER_PAGE, keyword);
      if (!response || !Array.isArray(response.content)) {
        setPosts([]);
        setTotalElements(0);
        setTotalPagesFromApi(0);
        setErrorMessage("Q&A API 응답 형식이 올바르지 않습니다.");
        return;
      }
      setPosts(response.content);
      setTotalElements(response.totalElements ?? 0);
      setTotalPagesFromApi(response.totalPages ?? 0);
    } catch (error) {
      console.error("Q&A 목록 조회 실패:", error);
      setPosts([]);
      setTotalElements(0);
      setTotalPagesFromApi(0);
      setErrorMessage("Q&A 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchQnaPosts(1, "");
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchQnaPosts]);

  const PAGE_BLOCK_SIZE = 5;

  const totalPages = Math.max(1, totalPagesFromApi);

  const pageNumbers = useMemo(() => {
    const currentBlock = Math.floor((currentPage - 1) / PAGE_BLOCK_SIZE);
    const startPage = currentBlock * PAGE_BLOCK_SIZE + 1;
    const endPage = Math.min(totalPages, startPage + PAGE_BLOCK_SIZE - 1);

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages, currentPage]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    setAppliedKeyword(keyword);
    setCurrentPage(1);
    void fetchQnaPosts(1, keyword);
  };

  const handleResetSearch = () => {
    setSearchKeyword("");
    setAppliedKeyword("");
    setSearchType("title");
    setCurrentPage(1);
    void fetchQnaPosts(1, "");
  };

  const handleWrite = () => {
    if (!isLoggedIn || !loginUserId) {
      alert("로그인 후 글쓰기가 가능합니다.");
      navigate("/login");
      return;
    }
    navigate("/qna/write");
  };

  const handlePostClick = (post: QnaListResponse) => {
    const isPrivate = post.publicQuestion === false;

    // 공개글은 모두가 내용을 확인할 수 있습니다.
    if (!isPrivate) {
      navigate(`/qna/${post.id}`);
      return;
    }

    // 비공개글은 로그인 필요 및 작성자 본인 / 관리자만 확인 가능합니다.
    if (!isLoggedIn || !loginUserId) {
      alert("비공개 게시글은 작성자 본인과 관리자만 확인할 수 있습니다. 로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }

    const myPost = isMyPost(post);
    if (!isAdmin && !myPost) {
      alert("비공개 게시글은 작성자 본인과 관리자만 확인할 수 있습니다.");
      return;
    }

    navigate(`/qna/${post.id}`);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    void fetchQnaPosts(page, appliedKeyword);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#fafcf9]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 영역 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#e8f3e9] text-[#3f8a47] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#242b23] tracking-tight">
              질의응답
            </h1>
            <p className="text-[15px] text-[#667065]">
              서울시 농수산물 가격 정보 서비스 이용 중 궁금한 점이나 문의사항을 남겨주세요.
            </p>
          </div>

          {/* 카테고리 탭 ([공지사항] [질의응답] [자주 묻는 질문]) */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#dce4da] shadow-sm">
              <button
                type="button"
                onClick={() => navigate("/board")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                공지사항
              </button>
              <button
                type="button"
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#4c9b55] text-white transition-all cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                질의응답
              </button>
              <button
                type="button"
                onClick={() => navigate("/board")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#5c665b] hover:bg-[#f0f5ef] transition-all cursor-pointer no-underline"
                style={{ textDecoration: "none" }}
              >
                자주 묻는 질문
              </button>
            </div>
          </div>

          {/* 검색 영역 */}
          <div className="bg-[#f4f7f3] border border-[#dce4da] rounded-[12px] p-5 mb-6">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#dce4da] bg-white px-3 text-[14px] text-[#3e483d] focus:outline-none focus:border-[#4c9b55]"
              >
                <option value="title">제목</option>
                <option value="author">작성자</option>
                <option value="content">내용</option>
              </select>
              <Input
                type="text"
                placeholder="검색어를 입력하세요."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-[44px] flex-1 bg-white border-[#dce4da] text-[14px] placeholder:text-[#939c92] focus-visible:ring-[#4c9b55]"
              />
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  type="submit"
                  className="h-[44px] px-6 bg-[#343c33] hover:bg-[#252b24] text-white text-[14px] font-bold rounded-[7px] flex-1 md:flex-none no-underline"
                  style={{ textDecoration: "none" }}
                >
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSearch}
                  className="h-[44px] px-5 bg-white border-[#dce4da] text-[#5a6459] hover:bg-[#eef3ed] text-[14px] font-bold rounded-[7px] flex-1 md:flex-none no-underline"
                  style={{ textDecoration: "none" }}
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
            <button
              type="button"
              onClick={handleWrite}
              className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold rounded-[7px] transition-colors border border-[#4c9b55] cursor-pointer no-underline"
              style={{ textDecoration: "none" }}
            >
              글쓰기
            </button>
          </div>

          {/* Table 영역 */}
          <div className="w-full bg-white border border-[#dce4da] rounded-[12px] shadow-[0_7px_24px_rgba(45,70,45,0.05)] overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center text-[#8a9388] text-[14px]">
                Q&A 게시글 목록을 불러오는 중입니다...
              </div>
            ) : errorMessage ? (
              <div className="p-16 text-center text-rose-500 text-[14px] space-y-3">
                <p>{errorMessage}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void fetchQnaPosts(currentPage, appliedKeyword)}
                  className="h-[36px] px-4 text-[13px] no-underline"
                  style={{ textDecoration: "none" }}
                >
                  다시 불러오기
                </Button>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-16 text-center text-[#8a9388] text-[14px]">
                등록된 질의응답이 없습니다.
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
                  {posts.map((post, index) => {
                    const displayNo = totalElements - ((currentPage - 1) * POSTS_PER_PAGE + index);
                    const myPost = isMyPost(post);
                    return (
                      <QnaRow
                        key={post.id}
                        item={post}
                        displayNo={displayNo > 0 ? displayNo : index + 1}
                        isAdmin={isAdmin}
                        isMyPost={myPost}
                        onPostClick={handlePostClick}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* 권한 안내 & Pagination */}
          <div className="space-y-4">
            <div className="flex items-center justify-end text-[13px] text-[#8a9388]">
              <span>
                {isAdmin
                  ? "🛡️ 관리자 계정은 모든 질의응답 게시글을 확인할 수 있습니다."
                  : "🔒 게시글 내용은 작성자 본인만 확인할 수 있습니다."}
              </span>
            </div>

            {!isLoading && !errorMessage && posts.length > 0 && (
              <Pagination className="pt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    />
                  </PaginationItem>

                  {pageNumbers.map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === currentPage}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

