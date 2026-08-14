import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import { getQnasApi } from "@/api/api";
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

/* 타입 정의 */
interface QnaPost {
  id: number;
  authorId: string;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
  answer?: string;
  publicQuestion?: boolean;
  isPublic?: boolean;
}

type SearchType = "title" | "author" | "content";

const SAMPLE_POST_IDS = new Set([1, 2, 3, 16, 17, 18]);
const TIMESTAMP_THRESHOLD = 1_000_000_000_000;

/* 게시글 정렬: 날짜 최신순 */
const sortPosts = (a: QnaPost, b: QnaPost): number => {
  const dateA = a.date && a.date !== "-" ? a.date : "0000.00.00";
  const dateB = b.date && b.date !== "-" ? b.date : "0000.00.00";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  const aIsTs = a.id >= TIMESTAMP_THRESHOLD;
  const bIsTs = b.id >= TIMESTAMP_THRESHOLD;
  if (aIsTs !== bIsTs) return aIsTs ? 1 : -1;
  return b.id - a.id;
};

/* 로컬 스토리지 데이터 조회 */
const getLocalPosts = (): QnaPost[] => {
  const stored = localStorage.getItem("qnaPosts");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return (parsed as QnaPost[]).filter((p) => !SAMPLE_POST_IDS.has(p.id));
      }
    } catch { /* 무시 */ }
  }
  return [];
};

/* Q&A 테이블 행 컴포넌트 */
interface QnaRowProps {
  item: QnaPost;
  displayNo: number;
  onClick: (item: QnaPost) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

function QnaRow({ item, displayNo, onClick, currentUserId, isAdmin }: QnaRowProps) {
  const answered = typeof item.answer === "string" && item.answer.trim().length > 0;
  const isSecret = item.publicQuestion === false || item.isPublic === false;
  const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
  const canAccess = !isSecret || isMyPost || isAdmin;

  const displayTitle = isSecret
    ? canAccess
      ? `🔒 ${item.title}`
      : "🔒 비밀글입니다."
    : item.title;

  return (
    <TableRow className="bg-white hover:bg-[#f8faf7]">
      <TableCell className="w-[9%] text-center text-[#5a6459] font-medium align-middle">
        {displayNo}
      </TableCell>

      <TableCell className="w-[10%] text-center align-middle">
        <span
          className={
            answered
              ? "inline-flex items-center justify-center min-w-[58px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]"
              : "inline-flex items-center justify-center min-w-[58px] px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]"
          }
        >
          {answered ? "답변완료" : "답변대기"}
        </span>
      </TableCell>

      <TableCell className="w-[43%] text-left max-w-0 align-middle py-3">
        <button
          type="button"
          onClick={() => onClick(item)}
          className="block truncate w-full text-[14px] font-semibold text-[#13202B] hover:text-[#0F8AA8] text-left bg-transparent border-0 p-0 cursor-pointer"
          title={displayTitle}
        >
          {displayTitle}
        </button>

        {answered && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-[#6B7280] font-semibold">↳</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0F766E]">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#EBF5F8] text-[10px] font-extrabold text-[#0F766E]">
                답변 완료
              </span>
              <span>관리자 답변이 등록되었습니다.</span>
            </span>
          </div>
        )}
      </TableCell>

      <TableCell className="w-[14%] text-center text-[#6B7280] align-middle">
        {item.author}
      </TableCell>

      <TableCell className="w-[15%] text-center text-[#6B7280] align-middle">
        {item.date || "-"}
      </TableCell>

      <TableCell className="w-[9%] text-center text-[#6B7280] align-middle">
        {item.views}
      </TableCell>
    </TableRow>
  );
}

/* 메인 컴포넌트 */
export default function QnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* 로그인 및 권한 정보 */
  const isLoggedIn = isLogin();
  const currentUser = isLoggedIn ? getLoginUser() : null;
  const currentUserId = currentUser?.userId || "";
  const isAdmin = useMemo(() => {
    const role = currentUser?.role?.toUpperCase();
    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [currentUser]);

  /* React Query: Q&A 목록 조회 */
  const { data: serverQnas } = useQuery({
    queryKey: ["qnasList"],
    queryFn: () => getQnasApi(0, 50),
    staleTime: 1000 * 60 * 3,
  });

  /* 데이터 병합 */
  const posts = useMemo(() => {
    const local = getLocalPosts();
    const serverItems = serverQnas?.content || [];

    const apiPosts: QnaPost[] = serverItems.map((item) => ({
      id: item.id,
      authorId: item.writerLoginId || "user",
      author: item.writerName || item.writerLoginId || "작성자",
      title: item.title,
      content: "",
      date: item.createdAt ? item.createdAt.split("T")[0].replace(/-/g, ".") : "-",
      views: item.viewCount || 0,
      answer: item.answerStatus === "ANSWERED" || item.answeredAt ? "네, 답변되었습니다." : undefined,
      publicQuestion: item.publicQuestion,
    }));

    const combined = [...local];
    apiPosts
      .filter((apiItem) => !SAMPLE_POST_IDS.has(apiItem.id))
      .forEach((apiItem) => {
        const idx = combined.findIndex((p) => p.id === apiItem.id);
        if (idx >= 0) combined[idx] = { ...combined[idx], ...apiItem };
        else combined.push(apiItem);
      });

    return combined.sort(sortPosts);
  }, [serverQnas]);

  /* 검색 및 페이지네이션 상태 */
  const urlTypeParam = (searchParams.get("searchType") || searchParams.get("type") || "title") as SearchType;
  const validSearchType: SearchType = ["title", "author", "content"].includes(urlTypeParam) ? urlTypeParam : "title";
  const urlKeyword = searchParams.get("keyword") || searchParams.get("searchKeyword") || "";
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const pageFromUrl = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [searchType, setSearchType] = useState<SearchType>(validSearchType);
  const [searchKeyword, setSearchKeyword] = useState(urlKeyword);

  const POSTS_PER_PAGE = 5;

  const filteredPosts = useMemo(() => {
    const keyword = urlKeyword.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      switch (validSearchType) {
        case "title":
          return post.title.toLowerCase().includes(keyword);
        case "author":
          return post.author.toLowerCase().includes(keyword);
        case "content":
          return post.content.toLowerCase().includes(keyword);
        default:
          return true;
      }
    });
  }, [posts, urlKeyword, validSearchType]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(pageFromUrl, totalPages);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (currentQuery) sessionStorage.setItem("qna_last_query", currentQuery);
    else sessionStorage.removeItem("qna_last_query");
  }, [searchParams]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchKeyword.trim();
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (trimmed) {
        newParams.set("searchType", searchType);
        newParams.set("keyword", trimmed);
      } else {
        newParams.delete("searchType");
        newParams.delete("type");
        newParams.delete("keyword");
        newParams.delete("searchKeyword");
      }
      newParams.set("page", "1");
      return newParams;
    });
  };

  const handleRowClick = (item: QnaPost) => {
    const isSecret = item.publicQuestion === false || item.isPublic === false;
    const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);

    if (isSecret && !isMyPost && !isAdmin) {
      return alert("작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다.");
    }
    navigate(`/qna/${item.id}`, { state: { fromPage: currentPage } });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("page", String(page));
      return newParams;
    });
  };

  return (
    <div className="min-h-screen bg-[#F5FAFC] py-12 px-5 sm:px-8">
      <div className="max-w-[1000px] mx-auto space-y-8">
        {/* 상단 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#DCE8ED]">
          <div>
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[28px] font-black text-[#13202B] tracking-tight">질의응답 (Q&amp;A)</h1>
            <p className="text-[14px] text-[#6B7280] mt-1 font-medium">
              서비스 이용에 대한 궁금한 점을 질문해 주시면 성심성의껏 답변해 드립니다.
            </p>
          </div>
          <div>
            <Button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  alert("로그인 후 질의응답을 작성할 수 있습니다.");
                  return navigate("/login");
                }
                navigate("/qna/write");
              }}
              className="bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold h-11 px-5 rounded-[10px] shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>질문 작성하기</span>
            </Button>
          </div>
        </div>

        {/* 검색 폼 */}
        <div className="flex justify-end">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-[400px] w-full">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
              className="h-10 px-3 bg-white border border-[#DCE8ED] rounded-[8px] text-[13px] font-semibold text-[#13202B] outline-none focus:border-[#0F8AA8]"
            >
              <option value="title">제목</option>
              <option value="author">작성자</option>
              <option value="content">내용</option>
            </select>
            <Input
              type="text"
              placeholder="검색어를 입력하세요"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-10 bg-white border-[#DCE8ED] text-[13px]"
            />
            <Button type="submit" className="h-10 px-4 bg-[#13202B] hover:bg-[#0F172A] text-white font-bold rounded-[8px]">
              검색
            </Button>
          </form>
        </div>

        {/* 목록 테이블 */}
        <div className="border border-[#DCE8ED] rounded-[16px] overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-[#F5FAFC] border-b border-[#DCE8ED]">
              <TableRow>
                <TableHead className="w-[9%] text-center text-[#13202B] font-extrabold text-[13px]">번호</TableHead>
                <TableHead className="w-[10%] text-center text-[#13202B] font-extrabold text-[13px]">상태</TableHead>
                <TableHead className="w-[43%] text-left text-[#13202B] font-extrabold text-[13px]">제목</TableHead>
                <TableHead className="w-[14%] text-center text-[#13202B] font-extrabold text-[13px]">작성자</TableHead>
                <TableHead className="w-[15%] text-center text-[#13202B] font-extrabold text-[13px]">작성일</TableHead>
                <TableHead className="w-[9%] text-center text-[#13202B] font-extrabold text-[13px]">조회수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#DCE8ED]">
              {paginatedPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-[#6B7280] font-medium">
                    등록된 질의응답이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPosts.map((post, idx) => {
                  const displayNo = filteredPosts.length - ((currentPage - 1) * POSTS_PER_PAGE + idx);
                  return (
                    <QnaRow
                      key={post.id}
                      item={post}
                      displayNo={displayNo}
                      onClick={handleRowClick}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === currentPage}
                      onClick={() => handlePageChange(pageNum)}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
