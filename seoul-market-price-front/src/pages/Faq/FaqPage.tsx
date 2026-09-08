import { useState, useMemo, useEffect } from 'react';
import { getPublicFaqsApi, getPublicFaqApi, type FaqPublicResponse } from '@/api/api';
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
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionSidebarLayout from '@/components/SectionSidebarLayout';
import { CUSTOMER_CENTER_NAVIGATION } from '@/config/sectionNavigation';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

// URL 쿼리 파라미터 타입 정의
type FaqQueryParamKeys = 'page' | 'keyword';

interface FaqQueryState {
  page: number;
  keyword: string;
}

export default function FaqPage() {
  // 1. URL 쿼리 파라미터 상태 관리
  const [searchParams, setSearchParams] = useSearchParams();
  const getParam = (key: FaqQueryParamKeys): string | null => searchParams.get(key);

  const query: FaqQueryState = {
    page: Number(getParam('page')) || 1,
    keyword: getParam('keyword') || searchParams.get('search') || '',
  };

  const setQuery = (updates: Partial<FaqQueryState>) => {
    const next: FaqQueryState = { ...query, ...updates };
    const params: Partial<Record<FaqQueryParamKeys, string>> = { page: String(next.page) };

    if (next.keyword) {
      params.keyword = next.keyword;
    }

    setSearchParams(params);
  };

  // 아코디언 열림 상태 및 페이지네이션 번호 배열 상태
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);

  const itemsPerPage = 5;

  // 2. React Query 데이터 조회
  const { data: apiFaqs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => getPublicFaqsApi(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // 데이터 가공 및 클라이언트 사이드 필터링
  const faqsData: FaqItem[] = useMemo(() => {
    if (apiFaqs && Array.isArray(apiFaqs) && apiFaqs.length > 0) {
      return apiFaqs.map((f: FaqPublicResponse) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }));
    }
    return [];
  }, [apiFaqs]);

  const filteredFaqs = useMemo(() => {
    return faqsData.filter((item) => {
      const matchesSearch =
        !query.keyword ||
        item.question.includes(query.keyword) ||
        item.answer.includes(query.keyword);
      return matchesSearch;
    });
  }, [faqsData, query.keyword]);

  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);
  const validPage = Math.min(Math.max(query.page, 1), Math.max(totalPages, 1));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedFaqs = filteredFaqs.slice(startIndex, startIndex + itemsPerPage);

  // 3. React Query 데이터 수신 후 실행되는 useEffect (페이지네이션 번호 관리)
  useEffect(() => {
    if (!totalPages) {
      setPageNumbers([]);
      return;
    }

    const currentGroup: number = Math.ceil(query.page / 5);
    const startPage: number = (currentGroup - 1) * 5 + 1;
    const endPage: number = Math.min(startPage + 4, totalPages);

    const nums: number[] = Array.from(
      { length: Math.max(0, endPage - startPage + 1) },
      (_: unknown, i: number): number => startPage + i
    );

    setPageNumbers(nums);
  }, [totalPages, query.page]);

  // 페이지 이동 처리 (상단 스크롤 포함)
  const changePage = (targetPage: number) => {
    setQuery({ page: targetPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFaq = (id: number) => {
    const isExpanding = !openIds.includes(id);
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (isExpanding) {
      void getPublicFaqApi(id).catch(() => {});
    }
  };

  // 모두 열기/닫기 토글 상태 및 핸들러
  const isAllOpen = useMemo(() => {
    return filteredFaqs.length > 0 && filteredFaqs.every((item) => openIds.includes(item.id));
  }, [filteredFaqs, openIds]);

  const handleToggleAll = () => {
    if (isAllOpen) {
      setOpenIds([]);
    } else {
      setOpenIds(filteredFaqs.map((item) => item.id));
    }
  };

  return (
    <SectionSidebarLayout
      sectionTitle={CUSTOMER_CENTER_NAVIGATION.sectionTitle}
      menuItems={CUSTOMER_CENTER_NAVIGATION.menuItems}
    >
      <div className="min-h-screen bg-[#F5FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            {/* 상단 타이틀 */}
            <div className="mb-6">
              <h1 className="text-[24px] font-black text-[#13202B]">자주 묻는 질문</h1>
              <p className="mt-1 text-[13px] font-medium text-[#6B7280]">
                싸부(SSABU) 서비스 이용 관련 자주 묻는 질문과 답변입니다.
              </p>
            </div>

            {/* 검색 영역 */}
            <div className="bg-[#FFFFFF] rounded-[14px] border border-[#DCE8ED] p-4 sm:p-5 shadow-xs mb-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  setQuery({
                    page: 1,
                    keyword: (formData.get('keyword') as string).trim(),
                  });
                  refetch();
                }}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                <Input
                  name="keyword"
                  key={`input-${query.keyword}`}
                  type="text"
                  defaultValue={query.keyword}
                  placeholder="궁금한 단어나 키워드를 검색하세요..."
                  className="h-[44px] flex-1 bg-[#F5FAFC] border-[#DCE8ED] text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-[#0F8AA8] rounded-[8px]"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="submit"
                    className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] cursor-pointer shadow-xs transition-all shrink-0"
                  >
                    검색
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setQuery({ page: 1, keyword: '' });
                      refetch();
                    }}
                    className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[8px] cursor-pointer shrink-0 transition-colors"
                  >
                    초기화
                  </Button>
                </div>
              </form>
            </div>

            {/* 건수 및 통합 토글 버튼 */}
            <div className="flex items-center justify-between mb-3.5 min-h-[40px]">
              <p className="text-[14px] text-[#6B7280]">
                전체 <strong className="text-[#0F8AA8] font-extrabold">{filteredFaqs.length}</strong>개의 자주 묻는 질문이 있습니다.
              </p>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAll}
                  className="h-[36px] px-3.5 bg-white border-[#DCE8ED] text-[#4B6B7C] hover:bg-[#F0F7FA] hover:text-[#0F8AA8] hover:border-[#7CC9D8] text-[13px] font-bold rounded-[8px] cursor-pointer transition-colors shadow-2xs"
                >
                  <span>{isAllOpen ? '모두 닫기 ▴' : '모두 열기 ▾'}</span>
                </Button>
              </div>
            </div>

            {/* FAQ 목록 (통합 아코디언 카드) */}
            <div className="overflow-hidden rounded-[16px] border border-[#DCE8ED] bg-[#FFFFFF] shadow-xs divide-y divide-[#EBF2F5]">
              {isLoading ? (
                <div className="p-16 text-center text-[#88A6B3] text-[14px] font-medium">
                  자주 묻는 질문을 불러오는 중입니다...
                </div>
              ) : isError ? (
                <div className="p-16 text-center text-rose-500 text-[14px] font-semibold">
                  오류가 발생했습니다: {(error as Error).message}
                </div>
              ) : !paginatedFaqs.length ? (
                <div className="p-16 text-center text-[#88A6B3] text-[14px] font-medium">
                  등록된 자주 묻는 질문이 없거나 검색 결과가 없습니다.
                </div>
              ) : (
                paginatedFaqs.map((faq) => {
                  const isOpen = openIds.includes(faq.id);
                  return (
                    <div key={faq.id} className="transition-colors">
                      {/* 질문 행 */}
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        className={cn(
                          "flex w-full items-center justify-between px-5 sm:px-6 py-4 text-left transition-all cursor-pointer group",
                          isOpen ? "bg-[#F5FAFC]" : "hover:bg-[#F0F7FA]/70"
                        )}
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-3.5 pr-4 flex-1 min-w-0">
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black transition-colors",
                              isOpen ? "bg-[#0F8AA8] text-white" : "bg-[#E0F3F7] text-[#0F8AA8]"
                            )}
                          >
                            Q
                          </span>
                          <span
                            className={cn(
                              "text-[15px] font-bold transition-colors truncate",
                              isOpen ? "text-[#0F8AA8]" : "text-[#13202B] group-hover:text-[#0F8AA8]"
                            )}
                          >
                            {faq.question}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "size-4.5 text-[#88A6B3] shrink-0 transition-transform duration-300",
                            isOpen && "rotate-180 text-[#0F8AA8]"
                          )}
                        />
                      </button>

                      {/* 부드럽게 흘러내리는 답변 영역 */}
                      <div
                        className={cn(
                          "grid transition-all duration-300 ease-in-out",
                          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="bg-[#F8FCFD] px-5 sm:px-6 py-5 border-t border-[#EBF2F5] flex items-start gap-3.5 text-[14px] text-[#334155] leading-[1.75]">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EBF0FF] text-[13px] font-black text-[#4F46E5] mt-0.5">
                              A
                            </span>
                            <p className="whitespace-pre-line flex-1 pt-0.5 text-[#334155] leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <Pagination className="pt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => changePage(Math.max(1, query.page - 1))}
                      disabled={query.page <= 1}
                    />
                  </PaginationItem>

                  {pageNumbers.map((p: number) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === query.page}
                        onClick={() => changePage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => changePage(Math.min(totalPages, query.page + 1))}
                      disabled={query.page >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
