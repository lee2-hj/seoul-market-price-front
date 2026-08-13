import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import styles from "./FaqPage.module.css";
import {
  getPublicFaqsApi,
  getPublicFaqApi,
  type FaqPublicResponse,
} from "@/api/api";

interface FaqItem {
  id: number;
  category: "가격변동" | "알뜰구매" | "유통구조" | "품질/보관" | string;
  question: string;
  answer: string;
}

export interface PostItem {
  id: number;
  title: string;
  author: string;
  date: string;
  views?: number;
  replies?: number;
  status?: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 1,
    category: "가격변동",
    question: "장마나 폭염 후 야채 값이 급등하는 이유는 무엇인가요?",
    answer:
      "농산물은 기후 변화에 매우 민감하여 폭염이나 집중호우 발생 시 수확량이 급감하고 부패율이 높아집니다. 출하량이 감소함에 따라 도매시장의 경락 가격이 오르고, 이는 소매 가격 인상으로 이어집니다. 특히 상추, 배추 등 엽채류는 생육 기간이 짧아 기상 악화의 영향을 즉각적으로 받습니다. 기상 여건이 개선되고 신규 물량이 출하되기까지 일정 기간 가격 고공행진이 유지되는 경향이 있습니다.",
  },
  {
    id: 2,
    category: "유통구조",
    question: "대형마트와 전통시장의 농산물 가격 차이가 나는 이유는 무엇인가요?",
    answer:
      "대형마트는 대규모 사전 계약 재배나 산지 직거래를 통해 물량을 대량으로 유통하며 포장 및 유통 비용이 포함됩니다. 반면 전통시장은 도매시장에서 당일 경매된 상품을 직접 입고하여 개별 판매하므로 유통 단계와 포장 방식이 다릅니다. 또한 행사 할인, 품질 등급(크기, 외관), 유통 기한 관리 방식에 따라서도 가격 차이가 발생합니다. 소비자는 장보기 목적과 가성비, 행사 유무에 맞춰 구매처를 선택하는 것이 유리합니다.",
  },
  {
    id: 3,
    category: "알뜰구매",
    question: "산지 직거래를 이용하면 소비자가 항상 더 싸게 살 수 있나요?",
    answer:
      "산지 직거래는 중간 유통 단계를 줄여 산지 농가의 수취 가격을 높이고 소비자에게 신선한 농산물을 제공합니다. 하지만 소량 주문 시 개별 택배비와 포장비가 추가되어 소량 구매 시에는 일반 소매점보다 비쌀 수 있습니다. 또한 제철 대량 생산 시기에는 대형 유통업체의 초특가 행사 가격이 산지 직거래보다 저렴할 수 있습니다. 따라서 묶음 구매나 대량 구매 시 직거래를 이용하는 것이 훨씬 경제적입니다.",
  },
  {
    id: 4,
    category: "알뜰구매",
    question: "농산물 가격 정보를 실시간으로 확인하는 가장 좋은 방법은 무엇인가요?",
    answer:
      "한국농수산식품유통공사(aT)에서 운영하는 'KAMIS 농축수산물 유통정보' 웹사이트 및 앱을 활용하면 됩니다. 또한 서울시 농수산식품공사 웹사이트에서 가락시장 등 주요 도매시장의 실시간 경매가를 조회할 수 있습니다. 본 서비스('싸.농')와 같은 가격 정보 앱을 이용하면 내 주변 시장과 마트의 시세를 한눈에 비교할 수 있습니다. 일별, 지역별 가격 동향을 모니터링하면 장보기 시점을 보다 스마트하게 결정할 수 있습니다.",
  },
  {
    id: 5,
    category: "유통구조",
    question: "농산물도 공산품처럼 정가제가 적용될 수 없나요?",
    answer:
      "농산물은 공산품과 달리 공장에서 일정량 생산하는 것이 불가능하며 날씨와 계절에 따라 생산량이 크게 달라집니다. 또한 저장 기간이 짧고 신선도 저하가 빨라 재고 처리를 위한 가격 변동이 불가피합니다. 당일 수급 상황과 도매시장 경매 결과에 따라 일일 시세가 변동하는 구조적 특징을 가지고 있습니다. 따라서 정부의 수급 조절(비축 물량 방출 등) 정책을 제외하고는 정가제 적용이 어렵습니다.",
  },
  {
    id: 6,
    category: "알뜰구매",
    question: "제철 농산물이 비제철 농산물보다 더 저렴하고 신선한가요?",
    answer:
      "제철 농산물은 해당 시기에 기후 조건이 맞아 생산량이 극대화되므로 출하량이 많아 가격이 저렴해집니다. 또한 시설 재배(비닐하우스 난방 등)에 필요한 에너지 비용이 들지 않아 생산 단가가 낮아집니다. 자연 상태에서 충분히 영양을 받고 자라 신선도와 맛, 영양가도 가장 우수한 상태입니다. 따라서 제철 농산물을 구매하는 것이 가계 부담을 줄이고 건강한 식단을 꾸리는 최고의 방법입니다.",
  },
  {
    id: 7,
    category: "알뜰구매",
    question: "정부에서 지원하는 농축수산물할인쿠폰은 어떻게 적용받나요?",
    answer:
      "정부는 물가 안정을 위해 주요 대형마트, 중소형 마트, 전통시장 등에서 농산물 할인 행사를 지원합니다. 대형마트나 온라인몰에서는 결제 시 자동으로 20~30% 할인이 적용되거나 회원 쿠폰 형태로 발급됩니다. 전통시장에서는 온누리상품권 환급 행사나 제로페이 농할상품권(20% 할인 구매)을 활용할 수 있습니다. 행사 품목과 할인 한도(주당 1~2만 원 선)는 주차별 정책에 따라 달라지므로 사전 확인이 필요합니다.",
  },
  {
    id: 8,
    category: "품질/보관",
    question: "흠집이 있거나 못생긴 '못난이 농산물'은 가격이 왜 저렴하며 품질 차이가 있나요?",
    answer:
      "못난이 농산물은 크기나 모양이 고르지 않거나 겉면에 미세한 흠집이 있어 등급 규격에서 제외된 제품입니다. 외관상의 이유로 상품성이 낮게 평가되어 일반 정품 대비 30~50% 이상 저렴하게 판매됩니다. 하지만 당도, 영양 성분, 맛 등 내실 면에서는 일반 농산물과 차이가 거의 없습니다. 가공용이나 즉시 소비할 가정용 식재료로 구매하면 비용을 대폭 절감할 수 있는 실속 선택입니다.",
  },
  {
    id: 9,
    category: "가격변동",
    question: "명절(추석, 설) 직전에 농산물 가격이 급등하는 이유와 알뜰 구매 팁은?",
    answer:
      "명절 기간에는 차례상 차림과 선물용 제수용품 수요가 전국적으로 한꺼번에 폭증하기 때문입니다. 수요가 공급을 훨씬 초과하면서 사과, 배, 대추, 밤 등 대표 명절 품목의 가격이 큰 폭으로 상승합니다. 알뜰 구매를 위해서는 명절 1~2주 전이나, 수요가 줄어드는 명절 직전 1~2일 전 떨이 행사를 노리는 것이 좋습니다. 또한 정부의 농할쿠폰 행사 품목이나 선물세트 사전예약 할인을 활용하면 비용을 절감할 수 있습니다.",
  },
  {
    id: 10,
    category: "품질/보관",
    question: "유기농 및 무농약 인증 농산물은 일반 농산물보다 왜 비싼가요?",
    answer:
      "친환경 농산물은 화학합성 농약이나 화학비료를 사용하지 않거나 최소화하여 재배하는 농산물입니다. 잡초 제거와 병충해 관리를 일일이 사람 손으로 진행해야 하므로 노동력과 인건비 투입이 월등히 높습니다. 또한 단위 면적당 수확량이 일반 재배 대비 적고 출하 전 인증 검사 비용 등이 추가됩니다. 이러한 안전성과 환경 보전 가치, 높은 생산 원가가 가격에 반영되어 약 1.5~2배 높게 형성됩니다.",
  },
];

function FaqPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const categoryParam = searchParams.get("category") || "전체";
  const keywordParam = searchParams.get("keyword") || searchParams.get("search") || "";

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [inputSearchTerm, setInputSearchTerm] = useState<string>(keywordParam);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState<string>(keywordParam);
  const [openIds, setOpenIds] = useState<number[]>([1]);

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setInputSearchTerm(keywordParam);
    setAppliedSearchTerm(keywordParam);
  }, [categoryParam, keywordParam]);

  const itemsPerPage = 5;

  const { data: apiFaqs, isLoading } = useQuery({
    queryKey: ["faqs", selectedCategory],
    queryFn: () => getPublicFaqsApi(selectedCategory),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const faqsData: FaqItem[] = useMemo(() => {
    if (apiFaqs && apiFaqs.length > 0) {
      return apiFaqs.map((f: FaqPublicResponse) => ({
        id: f.id,
        category: f.category || "기타",
        question: f.question,
        answer: f.answer,
      }));
    }
    return FAQ_DATA;
  }, [apiFaqs]);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set("page", String(newPage));
      return nextParams;
    });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (cat !== "전체") {
        nextParams.set("category", cat);
      } else {
        nextParams.delete("category");
      }
      nextParams.set("page", "1");
      return nextParams;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputSearchTerm.trim();
    setAppliedSearchTerm(trimmed);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (trimmed) {
        nextParams.set("keyword", trimmed);
      } else {
        nextParams.delete("keyword");
      }
      nextParams.set("page", "1");
      return nextParams;
    });
  };

  const toggleFaq = (id: number) => {
    const isExpanding = !openIds.includes(id);
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (isExpanding) {
      void getPublicFaqApi(id).catch(() => { });
    }
  };

  const filteredFaqs = useMemo(() => {
    return faqsData.filter((item) => {
      const matchesCategory =
        selectedCategory === "전체" || item.category === selectedCategory;
      const matchesSearch =
        !appliedSearchTerm ||
        item.question.includes(appliedSearchTerm) ||
        item.answer.includes(appliedSearchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [faqsData, selectedCategory, appliedSearchTerm]);

  const handleExpandAll = () => {
    setOpenIds(filteredFaqs.map((item) => item.id));
  };

  const handleCollapseAll = () => {
    setOpenIds([]);
  };

  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);
  const validPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedFaqs = filteredFaqs.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className={styles.faqPageContainer}>
      <main className={styles.mainArea}>
        {/* 헤더 영역 */}
        <div className="text-center space-y-2 mb-8">
          <span className="inline-block px-3 py-1 bg-[#EAF5F8] text-[#0F8AA8] border border-[#DCE8ED] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
            CUSTOMER CENTER
          </span>
          <h1 className="text-[36px] font-black text-[#13202B] tracking-tight">
            자주 묻는 질문
          </h1>
          <p className="text-[15px] text-[#6B7280]">
            서울시 농수산물 가격 정보 서비스의 자주 묻는 질문과 답변입니다.
          </p>
        </div>

        {/* 카테고리 탭 ([공지사항] [질의응답] [자주 묻는 질문]) */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 p-1 bg-white rounded-[10px] border border-[#DCE8ED] shadow-sm">
            <button
              type="button"
              onClick={() => navigate("/board")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F5FAFC] hover:text-[#13202B] transition-all cursor-pointer"
            >
              공지사항
            </button>
            <button
              type="button"
              onClick={() => navigate("/qna")}
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] text-[#6B7280] hover:bg-[#F5FAFC] hover:text-[#13202B] transition-all cursor-pointer"
            >
              질의응답
            </button>
            <button
              type="button"
              className="py-2.5 px-6 text-[14px] font-bold rounded-[8px] bg-[#0F8AA8] text-white transition-all cursor-pointer shadow-sm"
            >
              자주 묻는 질문
            </button>
          </div>
        </div>

        {/* Search & Category Filter Section */}
        <div className={styles.controlBar}>
          <div className={styles.categories}>
            {["전체", "가격변동", "알뜰구매", "유통구조", "품질/보관"].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.catTab} ${selectedCategory === cat ? styles.activeCat : ""}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <form className={styles.searchBox} onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="궁금한 단어나 키워드를 검색하세요..."
              value={inputSearchTerm}
              onChange={(e) => setInputSearchTerm(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              🔍 검색
            </button>
          </form>
        </div>

        {/* Global Controls */}
        <div className={styles.actionControls}>
          <div className={styles.btnGroup}>
            <button type="button" onClick={handleExpandAll}>
              모두 열기 ▾
            </button>
            <button type="button" onClick={handleCollapseAll}>
              모두 닫기 ▴
            </button>
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className={styles.accordionList}>
          {isLoading ? (
            <div className={styles.emptyNotice}>
              <p>⏳ 자주 묻는 질문을 불러오는 중입니다...</p>
            </div>
          ) : paginatedFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div key={faq.id} className={styles.faqCard}>
                <button
                  type="button"
                  className={styles.questionBtn}
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.qTextGroup}>
                    <span className={styles.qIcon}>Q.</span>
                    <span className={styles.catBadge}>{faq.category}</span>
                    <span className={styles.questionText}>
                      {faq.question}
                    </span>
                  </div>
                  <span
                    className={`${styles.arrowIcon} ${isOpen ? styles.rotated : ""}`}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className={styles.answerBox}>
                    <span className={styles.aIcon}>A.</span>
                    <p className={styles.answerText}>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}

          {!isLoading && filteredFaqs.length === 0 && (
            <div className={styles.emptyNotice}>
              <p>🔍 검색 결과에 일치하는 자주 묻는 질문이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(Math.max(validPage - 1, 1))}
              disabled={validPage === 1}
            >
              ◀ 이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`${styles.pageBtn} ${styles.numBtn} ${validPage === pageNum ? styles.activePage : ""}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}

            <button
              type="button"
              className={styles.pageBtn}
              onClick={() =>
                handlePageChange(Math.min(validPage + 1, totalPages))
              }
              disabled={validPage === totalPages}
            >
              다음 ▶
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default FaqPage;
