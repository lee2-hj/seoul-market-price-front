import { useState, useMemo, useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import apiMiddleware from "@/api/middleware";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";
import BoardPageHeader from "@/features/board/components/BoardPageHeader";
import { cn, maskAuthorName } from "@/lib/utils";

/* 1. TypeScript 타입 선언 */
type QnaPostType = {
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
};

type SearchCategoryType = "title" | "author" | "content";

type QnaSearchFormType = {
  searchType: SearchCategoryType;
  keywordInput: string;
};

type QnaRowPropsType = {
  item: QnaPostType;
  displayNo: number;
  onClick: (item: QnaPostType) => void;
  currentUserId?: string;
  isAdmin?: boolean;
};

type QnaMobileCardPropsType = {
  item: QnaPostType;
  onClick: (item: QnaPostType) => void;
  currentUserId?: string;
  isAdmin?: boolean;
};

/* 2. API 엔드포인트 은닉 및 조회 함수 */
const getMaskedEndpoint = (token: string): string => {
  try {
    return atob(token);
  } catch {
    return "";
  }
};
const URL_QNAS = getMaskedEndpoint("L2FwaS9xbmFz");

async function fetchQnas(page: number = 0, size: number = 100, keyword?: string) {
  const response = await apiMiddleware.get(URL_QNAS, {
    params: {
      page,
      size,
      keyword: keyword?.trim() || undefined,
    },
  });
  return response.data;
}

/* 3. 게시글 정렬 헬퍼 함수 */
const sortPosts = (a: QnaPostType, b: QnaPostType): number => {
  const dateA = a.date && a.date !== "-" ? a.date : "0000.00.00";
  const dateB = b.date && b.date !== "-" ? b.date : "0000.00.00";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return b.id - a.id;
};

/* 4. 테이블 및 모바일 카드 서브 컴포넌트 */
function QnaRow({ item, displayNo, onClick, currentUserId, isAdmin }: QnaRowPropsType) {
  const answered = typeof item.answer === "string" && item.answer.trim().length > 0;
  const isSecret = item.publicQuestion === false || item.isPublic === false;
  const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
  const canAccess = !isSecret || isMyPost || isAdmin;
  const displayTitle = isSecret ? (canAccess ? `🔒 ${item.title}` : "🔒 비밀글입니다.") : item.title;
  const shortDate = item.date ? item.date.replace(/^\d{4}\./, "") : "-";

  return (
    <TableRow className="bg-white hover:bg-[#F5FAFC]">
      <TableCell className="w-[8%] sm:w-[9%] text-center text-[#6B7280] font-medium align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3">
        {displayNo}
      </TableCell>
      <TableCell className="w-[15%] sm:w-[10%] text-center align-middle px-0.5 sm:px-2 py-2 sm:py-3">
        <span
          className={cn(
            "inline-flex items-center justify-center px-1 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-extrabold whitespace-nowrap",
            answered ? "bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]" : "bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]"
          )}
        >
          <span className="sm:hidden">{answered ? "완료" : "대기"}</span>
          <span className="hidden sm:inline">{answered ? "답변완료" : "답변대기"}</span>
        </span>
      </TableCell>
      <TableCell className="w-[40%] sm:w-[43%] text-left max-w-0 align-middle px-0.5 sm:px-3 py-2 sm:py-3">
        <button
          type="button"
          onClick={() => onClick(item)}
          className="block truncate w-full text-[11px] sm:text-[14px] font-semibold text-[#13202B] hover:text-[#0F8AA8] text-left bg-transparent border-0 p-0 cursor-pointer"
          title={displayTitle}
        >
          {displayTitle}
        </button>
        {answered && (
          <div className="hidden sm:flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-[#6B7280] font-semibold">↳</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0F766E]">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#EBF5F8] text-[10px] font-extrabold text-[#0F766E]">답변 완료</span>
              <span>답변이 완료되었습니다.</span>
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="w-[13%] sm:w-[14%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3 truncate">
        {maskAuthorName(item.author)}
      </TableCell>
      <TableCell className="w-[15%] sm:w-[15%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3">
        <span className="hidden sm:inline">{item.date || "-"}</span>
        <span className="sm:hidden">{shortDate}</span>
      </TableCell>
      <TableCell className="w-[9%] sm:w-[9%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3">
        {item.views ?? 0}
      </TableCell>
    </TableRow>
  );
}

function QnaMobileCard({ item, onClick, currentUserId, isAdmin }: QnaMobileCardPropsType) {
  const answered = typeof item.answer === "string" && item.answer.trim().length > 0;
  const isSecret = item.publicQuestion === false || item.isPublic === false;
  const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
  const canAccess = !isSecret || isMyPost || isAdmin;
  const displayTitle = isSecret ? (canAccess ? `🔒 ${item.title}` : "🔒 비밀글입니다.") : item.title;

  return (
    <div
      onClick={() => onClick(item)}
      className="p-3.5 hover:bg-[#F5FAFC] active:bg-[#EFF6FF] cursor-pointer transition-colors border-b border-[#F1F5F9] last:border-b-0"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-extrabold",
            answered ? "bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]" : "bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]"
          )}
        >
          {answered ? "답변완료" : "답변대기"}
        </span>
      </div>
      <h4 className="text-[14px] font-bold text-[#0F172A] leading-snug tracking-tight mb-2 hover:text-[#0F8AA8] transition-colors">
        {displayTitle}
      </h4>
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#64748B]">
        <span>{maskAuthorName(item.author)}</span>
        <span className="text-[#CBD5E1] font-normal">·</span>
        <span>{item.date || "-"}</span>
        <span className="text-[#CBD5E1] font-normal">·</span>
        <span>조회 {item.views ?? 0}</span>
      </div>
      {answered && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#F1F5F9] text-[11.5px] font-semibold text-[#0F766E]">
          <span className="text-[#6B7280]">↳</span>
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#EBF5F8] text-[10px] font-extrabold text-[#0F766E] shrink-0">
            답변 완료
          </span>
          <span className="truncate">
            {canAccess && typeof item.answer === "string" && item.answer.trim().length > 0 ? item.answer : "답변이 완료되었습니다."}
          </span>
        </div>
      )}
    </div>
  );
}

/* 4. 메인 QnA 목록 페이지 컴포넌트 */
export default function QnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKeyword, setActiveKeyword] = useState("");

  const { control, setValue, getValues } = useForm<QnaSearchFormType>({
    defaultValues: {
      searchType: "title",
      keywordInput: "",
    },
  });

  const formValues = useWatch({ control });
  const searchCategory = (formValues?.searchType as SearchCategoryType) ?? "title";
  const keywordInput = formValues?.keywordInput ?? "";

  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl;

  const loginUser = getLoginUser() as unknown as Record<string, unknown> | null;
  const userIsLogin = isLogin();
  const currentUserId = String(loginUser?.userId ?? loginUser?.id ?? "");
  const isAdmin = Boolean(loginUser?.isAdmin);

  /* TanStack Query: QnA 목록 조회 및 Select 변환 */
  const { data: serverQnas = [], isLoading } = useQuery<unknown, Error, QnaPostType[]>({
    queryKey: ["qnas"],
    queryFn: () => fetchQnas(0, 100),
    select: (serverResponse: unknown): QnaPostType[] => {
      if (!serverResponse) return [];
      const res = serverResponse as Record<string, unknown>;
      const list = Array.isArray(serverResponse)
        ? serverResponse
        : (res.content as unknown[]) || (res.items as unknown[]) || (res.data as unknown[]) || [];
      return (list as Record<string, unknown>[]).map((item) => ({
        id: Number(item.id ?? item.qnaId ?? 0),
        authorId: String(item.writerLoginId ?? item.authorId ?? item.userId ?? ""),
        author: String(item.writerName ?? item.writerLoginId ?? item.author ?? "익명"),
        title: String(item.title ?? ""),
        content: String(item.questionContent ?? item.content ?? ""),
        date: item.createdAt ? String(item.createdAt).split("T")[0].replace(/-/g, ".") : String(item.date || "-"),
        views: Number(item.viewCount ?? item.views ?? 0),
        answer: String(item.answerContent ?? item.answer ?? ""),
        publicQuestion: Boolean(item.publicQuestion ?? item.isPublic ?? true),
        isPublic: Boolean(item.publicQuestion ?? item.isPublic ?? true),
      }));
    },
  });

  const sortedPosts = useMemo(() => {
    return [...serverQnas].sort(sortPosts);
  }, [serverQnas]);

  const filteredPosts = useMemo(() => {
    if (!activeKeyword.trim()) return sortedPosts;
    const q = activeKeyword.toLowerCase();
    return sortedPosts.filter((item) => {
      if (searchCategory === "title") return (item.title || "").toLowerCase().includes(q);
      if (searchCategory === "author") return (item.author || "").toLowerCase().includes(q);
      if (searchCategory === "content") return (item.content || "").toLowerCase().includes(q);
      return true;
    });
  }, [sortedPosts, activeKeyword, searchCategory]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return filteredPosts.slice(start, start + itemsPerPage);
  }, [filteredPosts, validPage]);

  const handleSearchSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setActiveKeyword(getValues("keywordInput"));
    setSearchParams({ page: "1" });
  }, [getValues, setSearchParams]);

  const handleResetSearch = useCallback(() => {
    setValue("searchType", "title");
    setValue("keywordInput", "");
    setActiveKeyword("");
    setSearchParams({ page: "1" });
  }, [setValue, setSearchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setSearchParams({ page: String(newPage) });
    }
  }, [totalPages, setSearchParams]);

  const handleRowClick = useCallback((item: QnaPostType) => {
    const isSecret = item.publicQuestion === false || item.isPublic === false;
    const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
    if (isSecret && !isMyPost && !isAdmin) {
      alert("비밀글입니다. 작성자와 관리자만 볼 수 있습니다.");
      return;
    }
    navigate(`/qna/${item.id}`);
  }, [currentUserId, isAdmin, navigate]);

  const handleWriteClick = useCallback(() => {
    if (!userIsLogin) {
      alert("로그인이 필요한 서비스입니다. 작성글 등록을 위해 로그인해 주세요.");
      navigate("/login");
      return;
    }
    navigate("/qna/write");
  }, [userIsLogin, navigate]);

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      <div className="min-w-0 w-full font-sans bg-[#F8FAFC]">
        <main className="py-5 sm:py-8">
          <section className="min-w-0">
            {/* 상단 타이틀 */}
            <BoardPageHeader
              eyebrow="SSABU CUSTOMER CENTER"
              title="질의응답"
              description="싸부(SSABU) 부동산 실거래 및 시세 분석 서비스에 관해 궁금한 점을 질문하고 답변을 나누는 공간입니다."
            />

            {/* 검색 영역 */}
            <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-5 mb-6 shadow-xs">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col md:flex-row items-center gap-3"
              >
                <select
                  value={searchCategory}
                  onChange={(e) => setValue("searchType", e.target.value as SearchCategoryType)}
                  className="h-[44px] w-full md:w-[130px] rounded-[7px] border border-[#DCE8ED] bg-[#F5FAFC] px-3 text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8] cursor-pointer"
                >
                  <option value="title">제목</option>
                  <option value="author">작성자</option>
                  <option value="content">내용</option>
                </select>

                <Input
                  id="keywordInput"
                  name="keywordInput"
                  type="text"
                  placeholder="검색어를 입력하세요."
                  value={keywordInput}
                  onChange={(e) => setValue("keywordInput", e.target.value)}
                  className="h-[44px] flex-1 bg-[#F5FAFC] border-[#DCE8ED] text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-[#0F8AA8] rounded-[7px]"
                />

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <Button
                    type="submit"
                    className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] cursor-pointer border-0 shadow-none"
                  >
                    검색
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetSearch}
                    className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[7px] cursor-pointer shadow-none"
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </div>

            {/* 건수 및 글쓰기 버튼 */}
            <div className="flex items-center justify-between mb-3 min-h-[44px]">
              <p className="text-[14px] text-[#6B7280]">
                전체 <strong className="text-[#0F8AA8] font-extrabold">{filteredPosts.length}</strong>개의 게시글이 있습니다.
              </p>
              <button
                type="button"
                onClick={handleWriteClick}
                className="inline-flex items-center justify-center min-w-[94px] h-[42px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px] border border-[#0F8AA8] cursor-pointer shadow-xs"
              >
                글쓰기
              </button>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px] bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs">
                게시글을 불러오는 중입니다...
              </div>
            ) : paginatedPosts.length === 0 ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px] bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs">
                등록된 문의글이 없습니다.
              </div>
            ) : (
              <>
                <div className="hidden md:block w-full bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs overflow-hidden mb-6">
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-[#F5FAFC] border-b border-[#E2E8F0]">
                      <TableRow>
                        <TableHead className="w-[9%] text-center text-[#13202B] font-extrabold text-[13px]">번호</TableHead>
                        <TableHead className="w-[10%] text-center text-[#13202B] font-extrabold text-[13px]">상태</TableHead>
                        <TableHead className="w-[43%] text-left text-[#13202B] font-extrabold text-[13px]">제목</TableHead>
                        <TableHead className="w-[14%] text-center text-[#13202B] font-extrabold text-[13px]">작성자</TableHead>
                        <TableHead className="w-[15%] text-center text-[#13202B] font-extrabold text-[13px]">작성일</TableHead>
                        <TableHead className="w-[9%] text-center text-[#13202B] font-extrabold text-[13px]">조회</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#E2E8F0]">
                      {paginatedPosts.map((item, index) => {
                        const displayNo = filteredPosts.length - ((validPage - 1) * itemsPerPage + index);
                        return (
                          <QnaRow
                            key={item.id}
                            item={item}
                            displayNo={displayNo}
                            onClick={handleRowClick}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden bg-white rounded-[12px] border border-[#DCE8ED] shadow-xs mb-6 divide-y divide-[#DCE8ED]">
                  {paginatedPosts.map((item) => (
                    <QnaMobileCard
                      key={item.id}
                      item={item}
                      onClick={handleRowClick}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(validPage - 1)}
                        className={cn("cursor-pointer", validPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pageNum === validPage}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(validPage + 1)}
                        className={cn("cursor-pointer", validPage === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
