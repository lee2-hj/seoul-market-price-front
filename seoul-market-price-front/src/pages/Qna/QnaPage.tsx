import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

interface QnaAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface QnaPost {
  id: number;
  authorId: string;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
  answer?: string;
  attachments?: QnaAttachment[];
  publicQuestion?: boolean;
  isPublic?: boolean;
}

type SearchType = "title" | "author" | "content";

/* 제거할 고정 샘플 게시글 ID */
const SAMPLE_POST_IDS = new Set([1, 2, 3, 16, 17, 18]);

/*
 * 게시글 정렬: 날짜 최신순
 * - 날짜(YYYY.MM.DD) 기준 내림차순
 * - 같은 날짜면 서버 게시글(소형 ID)을 타임스탬프 ID보다 먼저 표시
 * - 같은 유형이면 ID 내림차순
 */
const TIMESTAMP_THRESHOLD = 1_000_000_000_000;
const sortPosts = (a: QnaPost, b: QnaPost): number => {
  const dateA = a.date && a.date !== "-" ? a.date : "0000.00.00";
  const dateB = b.date && b.date !== "-" ? b.date : "0000.00.00";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  const aIsTs = a.id >= TIMESTAMP_THRESHOLD;
  const bIsTs = b.id >= TIMESTAMP_THRESHOLD;
  if (aIsTs !== bIsTs) return aIsTs ? 1 : -1;
  return b.id - a.id;
};

const getInitialPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");
  if (storedPosts) {
    try {
      const parsed = JSON.parse(storedPosts);
      if (Array.isArray(parsed)) {
        const filtered = (parsed as QnaPost[]).filter(
          (p) => !SAMPLE_POST_IDS.has(p.id),
        );
        localStorage.setItem("qnaPosts", JSON.stringify(filtered));
        return filtered.sort(sortPosts);
      }
    } catch (error) {
      console.error("질의응답 게시글 불러오기 실패:", error);
    }
  }
  return [];
};

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
      {/* 1. 번호 (9%) */}
      <TableCell className="w-[9%] text-center text-[#5a6459] font-medium align-middle">
        {displayNo}
      </TableCell>

      {/* 2. 답변 상태 (10%) */}
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


      {/* 3. 제목 + 하단 답변 상태 표시 (43%) */}
      <TableCell className="w-[43%] text-left max-w-0 align-middle py-3">
        <button
          type="button"
          onClick={() => onClick(item)}
          className="block truncate w-full text-[14px] font-semibold text-[#13202B] hover:text-[#0F8AA8] text-left bg-transparent border-0 p-0 cursor-pointer"
          title={displayTitle}
        >
          {displayTitle}
        </button>

        {/* 답변 완료 시만 하단 답변 완료 표시 */}
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

      {/* 4. 작성자 (14%) */}
      <TableCell className="w-[14%] text-center text-[#6B7280] align-middle">
        {item.author}
      </TableCell>

      {/* 5. 작성일 (15%) */}
      <TableCell className="w-[15%] text-center text-[#6B7280] align-middle">
        {item.date || "-"}
      </TableCell>

      {/* 6. 조회수 (9%) */}
      <TableCell className="w-[9%] text-center text-[#6B7280] align-middle">
        {item.views}
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

  const loginUserId = loginUser?.userId ?? "";
  const isAdmin = useMemo(() => {
    if (!loginUser?.role) return false;
    const role = loginUser.role.toUpperCase();
    return role === "ADMIN" || role === "ROLE_ADMIN";
  }, [loginUser]);

  const [posts, setPosts] = useState<QnaPost[]>(getInitialPosts);

  /* 마운트 시 샘플 게시글 state에서 즉시 제거 */
  useEffect(() => {
    setPosts((prev) => {
      const filtered = prev.filter((p) => !SAMPLE_POST_IDS.has(p.id));
      localStorage.setItem("qnaPosts", JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  /* 백엔드 API 연동 (서버에 등록된 글도 병합하여 표시) */
  useEffect(() => {
    const fetchServerQnas = async () => {
      try {
        const response = await getQnasApi(0, 50);
        if (response?.content && Array.isArray(response.content) && response.content.length > 0) {
          const apiPosts: QnaPost[] = response.content.map((item) => ({
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

          setPosts((prevPosts) => {
            const combined = prevPosts.filter((p) => !SAMPLE_POST_IDS.has(p.id));
            apiPosts
              .filter((apiItem) => !SAMPLE_POST_IDS.has(apiItem.id))
              .forEach((apiItem) => {
                const idx = combined.findIndex((p) => p.id === apiItem.id);
                if (idx >= 0) {
                  combined[idx] = { ...combined[idx], ...apiItem };
                } else {
                  combined.push(apiItem);
                }
              });
            return combined.sort(sortPosts);
          });
        }
      } catch (err) {
        console.warn("백엔드 Q&A 목록 불러오기 실패 (로컬 데이터 사용):", err);
      }
    };

    void fetchServerQnas();
  }, []);

  const [searchType, setSearchType] = useState<SearchType>("title");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  /* 한 페이지에 게시글 5개씩 표기 */
  const POSTS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    const keyword = appliedKeyword.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      switch (searchType) {
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
  }, [posts, appliedKeyword, searchType]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(searchKeyword.trim());
    setCurrentPage(1);
  };

  const handleResetSearch = () => {
    setSearchKeyword("");
    setAppliedKeyword("");
    setSearchType("title");
    setCurrentPage(1);
  };

  /* 글쓰기는 로그인한 사용자만 가능 */
  const handleWriteClick = () => {
    if (!isLoggedIn || !loginUserId) {
      alert("로그인 후 글쓰기가 가능합니다.");
      sessionStorage.setItem("redirectUrl", "/qna/write");
      navigate("/login", { state: { from: "/qna/write" } });
      return;
    }
    navigate("/qna/write");
  };

  /* 비공개 게시글인 경우 작성자 본인 및 관리자만 상세 이동 가능 */
  const handlePostClick = (post: QnaPost) => {
    if (!isLoggedIn || !loginUserId) {
      alert("로그인 후 게시글 내용을 확인할 수 있습니다.");
      sessionStorage.setItem("redirectUrl", `/qna/${post.id}`);
      navigate("/login", { state: { from: `/qna/${post.id}` } });
      return;
    }


    const isSecret = post.publicQuestion === false || post.isPublic === false;
    const isMyPost = Boolean(loginUserId) && Boolean(post.authorId) && String(loginUserId) === String(post.authorId);

    if (isSecret && !isMyPost && !isAdmin) {
      alert("작성자 본인과 관리자만 확인할 수 있는 비공개 글입니다.");
      return;
    }

    const updatedPosts = posts.map((item) => {
      if (item.id === post.id) {
        return {
          ...item,
          views: item.views + 1,
        };
      }
      return item;
    });

    setPosts(updatedPosts);
    localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));
    navigate(`/qna/${post.id}`);
  };


  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* 페이지 수는 5페이지씩 그룹화하여 넘어가도록 설정 */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const PAGE_GROUP_SIZE = 5;
    const currentGroup = Math.ceil(currentPage / PAGE_GROUP_SIZE);
    const startPage = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
    const endPage = Math.min(totalPages, startPage + PAGE_GROUP_SIZE - 1);

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="min-h-screen bg-[#fafcf9]">
      <div className="py-12 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* 헤더 영역 */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-block px-3 py-1 bg-[#EBF5F8] text-[#0F8AA8] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
              CUSTOMER CENTER
            </span>
            <h1 className="text-[36px] font-black text-[#0B5E73] tracking-tight">
              질의응답
            </h1>
            <p className="text-[15px] text-[#6B7280]">
              서울시 농수산물 가격 정보 서비스의 질의응답 게시판입니다.
            </p>
          </div>


          {/* 카테고리 탭 ([공지사항] [질의응답] [자주 묻는 질문]) */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#DCE8ED] shadow-sm">
              <button
                type="button"
                onClick={() => navigate("/board")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#EBF5F8] hover:text-[#0F8AA8] transition-all cursor-pointer"
              >
                공지사항
              </button>
              <button
                type="button"
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#0F8AA8] text-white transition-all cursor-pointer"
              >
                질의응답
              </button>
              <button
                type="button"
                onClick={() => navigate("/faq")}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#EBF5F8] hover:text-[#0F8AA8] transition-all cursor-pointer"
              >
                자주 묻는 질문
              </button>
            </div>
          </div>

          {/* 검색 영역 */}
          <div className="bg-[#F5FAFC] border border-[#DCE8ED] rounded-[12px] p-5 mb-6">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#DCE8ED] bg-white px-3 text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8]"
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
                className="h-[44px] flex-1 bg-white border-[#DCE8ED] text-[14px] placeholder:text-[#6B7280] focus-visible:ring-[#0F8AA8]"
              />
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  type="submit"
                  className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] flex-1 md:flex-none"
                >
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSearch}
                  className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#EBF5F8] text-[14px] font-bold rounded-[7px] flex-1 md:flex-none"
                >
                  초기화
                </Button>
              </div>
            </form>
          </div>

          {/* 목록 건수 정보 & 글쓰기 버튼 영역 */}
          <div className="flex items-center justify-between mb-3 min-h-[44px]">
            <p className="text-[14px] text-[#6B7280]">
              전체 <strong className="text-[#0F8AA8] font-extrabold">{filteredPosts.length}</strong>개의 게시글이 있습니다.
            </p>
            <button
              type="button"
              onClick={handleWriteClick}
              className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] transition-colors border border-[#0F8AA8] cursor-pointer"
            >
              글쓰기
            </button>
          </div>

          {/* Table 영역 */}
          <div className="w-full bg-white border border-[#DCE8ED] rounded-[12px] shadow-[0_7px_24px_rgba(15,138,168,0.08)] overflow-hidden">
            {paginatedPosts.length === 0 ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">
                등록된 게시글이 없습니다.
              </div>

            ) : (
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[9%] text-center">번호</TableHead>
                    <TableHead className="w-[10%] text-center">답변상태</TableHead>
                    <TableHead className="w-[43%] text-center">제목</TableHead>
                    <TableHead className="w-[14%] text-center">작성자</TableHead>
                    <TableHead className="w-[15%] text-center">작성일</TableHead>
                    <TableHead className="w-[9%] text-center">조회수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPosts.map((item, index) => {
                    const displayNo = filteredPosts.length - ((currentPage - 1) * POSTS_PER_PAGE + index);
                    return (
                      <QnaRow
                        key={`qna-${item.id}`}
                        item={item}
                        displayNo={displayNo > 0 ? displayNo : index + 1}
                        onClick={handlePostClick}
                        currentUserId={loginUserId}
                        isAdmin={isAdmin}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination 영역 (5페이지 그룹 단위) */}
          {totalPages > 1 && (
            <Pagination className="pt-6">
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
  );
}
