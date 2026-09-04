import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PenSquare } from "lucide-react";
import { getLoginUser, isLogin } from "@/features/auth/utils/auth";
import { getQnasApi } from "@/api/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { CUSTOMER_CENTER_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 정의 */
interface QnaPost { id: number; authorId: string; author: string; title: string; content: string; date: string; views: number; answer?: string; publicQuestion?: boolean; isPublic?: boolean; }
type SearchType = "title" | "author" | "content";

/* 2. 게시글 정렬 헬퍼 함수 */
const sortPosts = (a: QnaPost, b: QnaPost): number => {
  const dateA = a.date && a.date !== "-" ? a.date : "0000.00.00";
  const dateB = b.date && b.date !== "-" ? b.date : "0000.00.00";
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return b.id - a.id;
};

/* 3. 데이터 페칭 커스텀 훅 (백엔드 DB 연동) */
function useQnaData() {
  const { data: serverResponse, isLoading, isError } = useQuery({
    queryKey: ["qnas"],
    queryFn: () => getQnasApi(0, 100),
  });

  const serverQnas: QnaPost[] = useMemo(() => {
    if (!serverResponse) return [];
    const res = serverResponse as unknown as Record<string, unknown>;
    const list = Array.isArray(serverResponse) ? serverResponse : (res.content as unknown[]) || (res.items as unknown[]) || (res.data as unknown[]) || [];
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
  }, [serverResponse]);

  return { serverQnas, isLoading, isError };
}

/* 4. 테이블 및 모바일 카드 UI 서브 컴포넌트 */
interface QnaRowProps { item: QnaPost; displayNo: number; onClick: (item: QnaPost) => void; currentUserId?: string; isAdmin?: boolean; }

function QnaRow({ item, displayNo, onClick, currentUserId, isAdmin }: QnaRowProps) {
  const answered = typeof item.answer === "string" && item.answer.trim().length > 0;
  const isSecret = item.publicQuestion === false || item.isPublic === false;
  const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
  const canAccess = !isSecret || isMyPost || isAdmin;
  const displayTitle = isSecret ? (canAccess ? `🔒 ${item.title}` : "🔒 비밀글입니다.") : item.title;
  const shortDate = item.date ? item.date.replace(/^\d{4}\./, "") : "-";

  return (
    <TableRow className="bg-white hover:bg-[#F5FAFC]">
      <TableCell className="w-[8%] sm:w-[9%] text-center text-[#6B7280] font-medium align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3">{displayNo}</TableCell>
      <TableCell className="w-[15%] sm:w-[10%] text-center align-middle px-0.5 sm:px-2 py-2 sm:py-3">
        <span className={cn("inline-flex items-center justify-center px-1 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-extrabold whitespace-nowrap", answered ? "bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]" : "bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]")}>
          <span className="sm:hidden">{answered ? "완료" : "대기"}</span>
          <span className="hidden sm:inline">{answered ? "답변완료" : "답변대기"}</span>
        </span>
      </TableCell>
      <TableCell className="w-[40%] sm:w-[43%] text-left max-w-0 align-middle px-0.5 sm:px-3 py-2 sm:py-3">
        <button type="button" onClick={() => onClick(item)} className="block truncate w-full text-[11px] sm:text-[14px] font-semibold text-[#13202B] hover:text-[#0F8AA8] text-left bg-transparent border-0 p-0 cursor-pointer" title={displayTitle}>{displayTitle}</button>
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
      <TableCell className="w-[13%] sm:w-[14%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3 truncate">{item.author || "익명"}</TableCell>
      <TableCell className="w-[15%] sm:w-[15%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3"><span className="hidden sm:inline">{item.date || "-"}</span><span className="sm:hidden">{shortDate}</span></TableCell>
      <TableCell className="w-[9%] sm:w-[9%] text-center text-[#6B7280] align-middle text-[9.5px] sm:text-[13px] px-0.5 sm:px-2 py-2 sm:py-3">{item.views ?? 0}</TableCell>
    </TableRow>
  );
}

function QnaMobileCard({ item, onClick, currentUserId, isAdmin }: { item: QnaPost; onClick: (item: QnaPost) => void; currentUserId?: string; isAdmin?: boolean; }) {
  const answered = typeof item.answer === "string" && item.answer.trim().length > 0;
  const isSecret = item.publicQuestion === false || item.isPublic === false;
  const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
  const canAccess = !isSecret || isMyPost || isAdmin;
  const displayTitle = isSecret ? (canAccess ? `🔒 ${item.title}` : "🔒 비밀글입니다.") : item.title;

  return (
    <div onClick={() => onClick(item)} className="p-3.5 hover:bg-[#F5FAFC] active:bg-[#EFF6FF] cursor-pointer transition-colors border-b border-[#F1F5F9] last:border-b-0">
      <div className="flex items-center gap-1.5 mb-1.5"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-extrabold", answered ? "bg-[#EBF5F8] text-[#0F766E] border border-[#7CC9D8]" : "bg-[#F5FAFC] text-[#6B7280] border border-[#DCE8ED]")}>{answered ? "답변완료" : "답변대기"}</span></div>
      <h4 className="text-[14px] font-bold text-[#0F172A] leading-snug tracking-tight mb-2 hover:text-[#0F8AA8] transition-colors">{displayTitle}</h4>
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#64748B]"><span>{item.author || "익명"}</span><span className="text-[#CBD5E1] font-normal">·</span><span>{item.date || "-"}</span><span className="text-[#CBD5E1] font-normal">·</span><span>조회 {item.views ?? 0}</span></div>
      {answered && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#F1F5F9] text-[11.5px] font-semibold text-[#0F766E]">
          <span className="text-[#6B7280]">↳</span>
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#EBF5F8] text-[10px] font-extrabold text-[#0F766E] shrink-0">답변 완료</span>
          <span className="truncate">{canAccess && typeof item.answer === "string" && item.answer.trim().length > 0 ? item.answer : "답변이 완료되었습니다."}</span>
        </div>
      )}
    </div>
  );
}

/* 5. 메인 QnA 목록 페이지 컴포넌트 */
export default function QnaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl;

  const loginUser = getLoginUser() as unknown as Record<string, unknown> | null;
  const userIsLogin = isLogin();
  const currentUserId = String(loginUser?.userId ?? loginUser?.id ?? "");
  const isAdmin = String(loginUser?.role).toUpperCase() === "ADMIN" || Boolean(loginUser?.isAdmin);

  const { serverQnas, isLoading } = useQnaData();

  const sortedPosts = useMemo(() => {
    const list = Array.isArray(serverQnas) ? [...serverQnas] : [];
    return list.sort(sortPosts);
  }, [serverQnas]);

  const filteredPosts = useMemo(() => {
    if (!searchKeyword.trim()) return sortedPosts;
    const q = searchKeyword.toLowerCase();
    return sortedPosts.filter((item) => {
      if (searchType === "title") return (item.title || "").toLowerCase().includes(q);
      if (searchType === "author") return (item.author || "").toLowerCase().includes(q);
      if (searchType === "content") return (item.content || "").toLowerCase().includes(q);
      return true;
    });
  }, [sortedPosts, searchKeyword, searchType]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => { const start = (validPage - 1) * itemsPerPage; return filteredPosts.slice(start, start + itemsPerPage); }, [filteredPosts, validPage]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setSearchKeyword(keywordInput); setSearchParams({ page: "1" }); };
  const handlePageChange = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) setSearchParams({ page: String(newPage) }); };

  const handleRowClick = (item: QnaPost) => {
    const isSecret = item.publicQuestion === false || item.isPublic === false;
    const isMyPost = Boolean(currentUserId) && Boolean(item.authorId) && String(currentUserId) === String(item.authorId);
    if (isSecret && !isMyPost && !isAdmin) { alert("비밀글입니다. 작성자와 관리자만 볼 수 있습니다."); return; }
    navigate(`/qna/${item.id}`);
  };

  const handleWriteClick = () => {
    if (!userIsLogin) {
      alert("로그인이 필요한 서비스입니다. 작성글 등록을 위해 로그인해 주세요.");
      navigate("/login");
      return;
    }
    navigate("/qna/write");
  };

  return (
    <SectionSidebarLayout sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle} menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}>
      <div className="min-w-0 w-full font-sans bg-[#F8FAFC]">
        <main className="py-5 sm:py-8">
          <section className="min-w-0">
            {/* 상단 타이틀 */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-[20px] sm:text-[26px] font-black text-[#13202B] tracking-tight">Q&A 문의 게시판</h1>
              <p className="mt-1 text-[12px] sm:text-[14px] text-[#6B7280] font-medium">부동산 시세 정보에 관해 궁금한 점을 질문하고 답변을 받아보세요.</p>
            </div>

            {/* 검색바 */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] p-3 sm:p-5 shadow-sm mb-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <select value={searchType} onChange={(e) => setSearchType(e.target.value as SearchType)} className="h-10 sm:h-11 px-2.5 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#13202B] bg-[#F5FAFC] border border-[#DCE8ED] rounded-lg sm:rounded-xl outline-none focus:border-[#0F8AA8]">
                    <option value="title">제목</option><option value="author">작성자</option><option value="content">내용</option>
                  </select>
                  <Input type="text" placeholder="검색어를 입력하세요..." value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} className="h-10 sm:h-11 flex-1 min-w-0 text-[12px] sm:text-[13px] border-[#DCE8ED] bg-[#F5FAFC] focus:bg-white rounded-lg sm:rounded-xl" />
                  <Button type="submit" className="h-10 sm:h-11 px-4 sm:px-5 bg-[#13202B] hover:bg-[#1E2E3D] text-white font-bold text-[12px] sm:text-[13px] rounded-lg sm:rounded-xl shrink-0">검색</Button>
                </div>
              </form>
            </div>

            {/* 건수 및 글쓰기 버튼 */}
            <div className="flex items-center justify-between mb-4 min-h-[44px]">
              <p className="text-[13px] sm:text-[14px] text-[#6B7280]">
                전체 <strong className="text-[#0F8AA8] font-extrabold">{filteredPosts.length}</strong>개의 문의글이 있습니다.
              </p>
              <Button type="button" onClick={handleWriteClick} className="flex items-center justify-center gap-2 h-10 sm:h-11 px-5 sm:px-6 bg-[#0F8AA8] hover:bg-[#0D7893] text-white font-black text-[13px] sm:text-[13.5px] rounded-xl shadow-md shadow-[#0F8AA8]/20 shrink-0">
                <PenSquare className="size-4 stroke-[2.5]" /><span>글쓰기</span>
              </Button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-[#6B7280] font-medium bg-white rounded-2xl border border-[#E2E8F0]">게시글을 불러오는 중입니다...</div>
            ) : paginatedPosts.length === 0 ? (
              <div className="p-12 text-center text-[#6B7280] font-medium bg-white rounded-2xl border border-[#E2E8F0]">
                <p>등록된 문의글이 없습니다.</p>
                <button type="button" onClick={handleWriteClick} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F8AA8] hover:underline">
                  <PenSquare className="size-4" /><span>첫 번째 문의글 작성하기</span>
                </button>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-hidden bg-white rounded-2xl border border-[#E2E8F0] shadow-sm mb-6">
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
                      {paginatedPosts.map((item, index) => { const displayNo = filteredPosts.length - ((validPage - 1) * itemsPerPage + index); return <QnaRow key={item.id} item={item} displayNo={displayNo} onClick={handleRowClick} currentUserId={currentUserId} isAdmin={isAdmin} />; })}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden bg-white rounded-xl border border-[#E2E8F0] shadow-sm mb-6 divide-y divide-[#F1F5F9]">
                  {paginatedPosts.map((item) => <QnaMobileCard key={item.id} item={item} onClick={handleRowClick} currentUserId={currentUserId} isAdmin={isAdmin} />)}
                </div>
              </>
            )}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => handlePageChange(validPage - 1)} className={cn("cursor-pointer", validPage === 1 && "pointer-events-none opacity-50")} /></PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (<PaginationItem key={pageNum}><PaginationLink onClick={() => handlePageChange(pageNum)} isActive={pageNum === validPage} className="cursor-pointer">{pageNum}</PaginationLink></PaginationItem>))}
                    <PaginationItem><PaginationNext onClick={() => handlePageChange(validPage + 1)} className={cn("cursor-pointer", validPage === totalPages && "pointer-events-none opacity-50")} /></PaginationItem>
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
