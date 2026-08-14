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
import { useNavigate, useSearchParams } from 'react-router-dom';

interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

// URL 쿼리 파라미터 타입 정의
type FaqQueryParamKeys = 'page' | 'category' | 'keyword';

interface FaqQueryState {
  page: number;
  category: string;
  keyword: string;
}

export default function FaqPage() {
  const navigate = useNavigate();

  // 1. URL 쿼리 파라미터 상태 관리
  const [searchParams, setSearchParams] = useSearchParams();
  const getParam = (key: FaqQueryParamKeys): string | null => searchParams.get(key);

  const query: FaqQueryState = {
    page: Number(getParam('page')) || 1,
    category: getParam('category') || '전체',
    keyword: getParam('keyword') || searchParams.get('search') || '',
  };

  const setQuery = (updates: Partial<FaqQueryState>) => {
    const next: FaqQueryState = { ...query, ...updates };
    const params: Partial<Record<FaqQueryParamKeys, string>> = { page: String(next.page) };

    if (next.category && next.category !== '전체') {
      params.category = next.category;
    }
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
    queryKey: ['faqs', query.category],
    queryFn: () => getPublicFaqsApi(query.category),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // 데이터 가공 및 클라이언트 사이드 필터링
  const faqsData: FaqItem[] = useMemo(() => {
    if (apiFaqs && Array.isArray(apiFaqs) && apiFaqs.length > 0) {
      return apiFaqs.map((f: FaqPublicResponse) => ({
        id: f.id,
        category: f.category || '기타',
        question: f.question,
        answer: f.answer,
      }));
    }
    return [];
  }, [apiFaqs]);

  const filteredFaqs = useMemo(() => {
    return faqsData.filter((item) => {
      const matchesCategory =
        query.category === '전체' || item.category === query.category;
      const matchesSearch =
        !query.keyword ||
        item.question.includes(query.keyword) ||
        item.answer.includes(query.keyword);
      return matchesCategory && matchesSearch;
    });
  }, [faqsData, query.category, query.keyword]);

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
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (isExpanding) {
      void getPublicFaqApi(id).catch(() => {});
    }
  };

  const handleExpandAll = () => {
    setOpenIds(filteredFaqs.map((item) => item.id));
  };

  const handleCollapseAll = () => {
    setOpenIds([]);
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
            <h1 className="text-[36px] font-black text-[#123047] tracking-tight">자주 묻는 질문</h1>
            <p className="text-[15px] text-[#6B7280]">싸부(SSABU) 서비스 이용 관련 자주 묻는 질문과 답변입니다.</p>
          </div>

          {/* 카테고리 탭 */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#DCE8ED] shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/board')}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F0F7FA]"
              >
                공지사항
              </button>
              <button
                type="button"
                onClick={() => navigate('/qna')}
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F0F7FA]"
              >
                질의응답
              </button>
              <button
                type="button"
                className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#123047] text-white"
              >
                자주 묻는 질문
              </button>
            </div>
          </div>

          {/* 카테고리 필터 및 검색 영역 */}
          <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-5 mb-6 shadow-xs space-y-4">
            <div className="flex flex-wrap gap-2">
              {['전체', '가격변동', '알뜰구매', '유통구조', '품질/보관'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setQuery({ category: cat, page: 1 })}
                  className={`px-4 py-2 text-[13px] font-bold rounded-[8px] transition-all cursor-pointer ${
                    query.category === cat
                      ? 'bg-[#0F8AA8] text-white shadow-xs'
                      : 'bg-[#F5FAFC] text-[#6B7280] hover:bg-[#EAF5F8] hover:text-[#0F8AA8] border border-[#DCE8ED]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

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
              className="flex flex-col md:flex-row items-center gap-3"
            >
              <Input
                name="keyword"
                key={`input-${query.keyword}`}
                type="text"
                defaultValue={query.keyword}
                placeholder="궁금한 단어나 키워드를 검색하세요..."
                className="h-[44px] flex-1 bg-[#F5FAFC] border-[#DCE8ED] text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus-visible:ring-[#0F8AA8]"
              />

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  type="submit"
                  className="h-[44px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[7px]"
                >
                  검색
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery({ page: 1, category: '전체', keyword: '' });
                    refetch();
                  }}
                  className="h-[44px] px-5 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[14px] font-bold rounded-[7px]"
                >
                  초기화
                </Button>
              </div>
            </form>
          </div>

          {/* 건수 및 컨트롤 버튼 */}
          <div className="flex items-center justify-between mb-3 min-h-[44px]">
            <p className="text-[14px] text-[#6B7280]">
              전체 <strong className="text-[#0F8AA8] font-extrabold">{filteredFaqs.length}</strong>개의 자주 묻는 질문이 있습니다.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExpandAll}
                className="h-[36px] px-3 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[13px] font-bold rounded-[6px]"
              >
                모두 열기 ▾
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                className="h-[36px] px-3 bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[13px] font-bold rounded-[6px]"
              >
                모두 닫기 ▴
              </Button>
            </div>
          </div>

          {/* FAQ 목록 (아코디언) */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">
                자주 묻는 질문을 불러오는 중입니다...
              </div>
            ) : isError ? (
              <div className="p-16 text-center text-rose-500 text-[14px]">
                오류가 발생했습니다: {(error as Error).message}
              </div>
            ) : !paginatedFaqs.length ? (
              <div className="p-16 text-center text-[#6B7280] text-[14px]">
                등록된 자주 묻는 질문이 없거나 검색 결과가 없습니다.
              </div>
            ) : (
              paginatedFaqs.map((faq) => {
                const isOpen = openIds.includes(faq.id);
                return (
                  <div
                    key={faq.id}
                    className="bg-white border border-[#DCE8ED] rounded-[12px] shadow-xs overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-[#F5FAFC] transition-colors cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 pr-4 flex-1 min-w-0">
                        <span className="text-[18px] font-black text-[#0F8AA8]">Q.</span>
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#E6F4F2] text-[#0F766E]">
                          {faq.category}
                        </span>
                        <span className="text-[15px] font-bold text-[#13202B] truncate">
                          {faq.question}
                        </span>
                      </div>
                      <span
                        className={`text-[12px] text-[#9CA3AF] transition-transform duration-200 ${
                          isOpen ? 'transform rotate-180 text-[#0F8AA8]' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div className="p-5 pt-3 bg-[#F0F7FA] border-t border-[#DCE8ED] flex items-start gap-3">
                        <span className="text-[18px] font-black text-[#123047] leading-none pt-0.5">A.</span>
                        <p className="text-[14px] text-[#4B5563] leading-relaxed whitespace-pre-line flex-1">
                          {faq.answer}
                        </p>
                      </div>
                    )}
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
        </div>
      </div>
    </div>
  );
}

