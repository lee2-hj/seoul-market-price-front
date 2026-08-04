import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./board.module.css";

interface FaqItem {
  id: number;
  category: "가격변동" | "알뜰구매" | "유통구조" | "품질/보관";
  question: string;
  answer: string;
}

interface PostItem {
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
  {
    id: 11,
    category: "유통구조",
    question: "농산물 유통 구조는 어떻게 이루어져 있으며, 왜 유통 비용 비중이 높은가요?",
    answer:
      "일반적으로 '산지농가 ➔ 산지유통인 ➔ 도매시장(경매) ➔ 중도매인 ➔ 소매상 ➔ 소비자'의 5~6단계를 거칩니다. 농산물은 부피가 크고 무게가 나가 운송비와 포장비가 많이 들며, 부패 위험으로 냉장 유통비가 필수적입니다. 중간 단계마다 운송료, 상하차비, 경매 수수료, 매장 임대료 및 폐기 손실 비용이 누적됩니다. 이로 인해 전체 소비자 가격 중 유통 비용이 평균 40~50% 수준을 차지하게 됩니다.",
  },
  {
    id: 12,
    category: "유통구조",
    question: "수입산 농산물과 국산 농산물의 가격 차이가 크게 나는 원인은 무엇인가요?",
    answer:
      "수입산 농산물은 해외 대규모 농장에서 기계화 재배로 생산되어 단위당 생산 원가가 매우 낮습니다. 반면 국내 농가는 소규모 필지 위주이고 인건비와 자재비가 높아 생산 단가가 상대적으로 높습니다. 또한 냉동·건조 등 가공 상태로 대량 수입되는 경우가 많아 물류 효율성이 높습니다. 다만 국산 농산물은 신선도, 유통 기간, 안전성 검사 측면에서 품질 우위를 가지고 있습니다.",
  },
  {
    id: 13,
    category: "가격변동",
    question: "농산물 수급 불균형 시 발표되는 '비축 물량 방출'이란 무엇인가요?",
    answer:
      "정부(농림축산식품부 및 aT)가 수급 불안에 대비해 수매하여 저장해 둔 농산물을 시장에 푸는 정책입니다. 배추, 무, 고추, 마늘, 양파 등 주요 대중성 무기물량을 가격 급등 시 도매시장이나 마트에 공급합니다. 시장의 공급 부족분을 메워 도매 시세를 낮추고 소매 가격 인상을 억제하는 효과가 있습니다. 소비자는 비축 물량 방출 기간 동안 지정된 마트나 시장에서 할인된 가격으로 구매할 수 있습니다.",
  },
  {
    id: 14,
    category: "품질/보관",
    question: "사둔 농산물이 금방 망가져 버려지는 비용을 줄이는 보관 꿀팁은?",
    answer:
      "농산물별 특성에 맞는 보관법을 적용하면 보관 기간을 2~3배 늘려 버리는 비용을 아낄 수 있습니다. 엽채류(상추, 깻잎)는 키친타올로 감싸 수분을 조절한 뒤 밀폐용기에 세워 냉장 보관합니다. 감자는 빛을 차단하고 사과와 함께 두면 싹이 트는 것을 방지할 수 있습니다(사과의 에틸렌 가스 효과). 대파나 양파는 손질 후 냉동 보관하거나, 필요한 만큼만 소량 구매하는 습관이 가장 경제적입니다.",
  },
  {
    id: 15,
    category: "가격변동",
    question: "기후변화와 애그플레이션(Agflation)이 향후 농산물 가격에 어떤 영향을 미치나요?",
    answer:
      "이상 기후로 인한 가뭄, 폭염, 한파가 정례화되면서 농산물 생산의 불확실성이 점점 커지고 있습니다. 이는 농산물 가격 상승이 전체 물가 상승을 유발하는 '애그플레이션' 현상을 심화시킵니다. 향후 농축산물 평균 가격대 자체가 상향 조정될 가능성이 높아 장바구니 물가 부담이 가중될 수 있습니다. 이에 따라 스마트팜 확대, 기후 대응 품종 개발 및 효율적 소비 습관 형성이 중요해지고 있습니다.",
  },
];



const NAV_ITEMS = [
  "대시보드",
  "가격상세정보",
  "자치구별 가격정보",
  "스마트추천",
  "고객센터",
  "마이페이지",
];

function HomeBoardPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<string>("고객센터");
  const [activeBoard, setActiveBoard] = useState<string>("자주묻는질문");

  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [openIds, setOpenIds] = useState<number[]>([1]); // 첫 번째 질문 기본 열림
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 5;

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const toggleFaq = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExpandAll = () => {
    setOpenIds(FAQ_DATA.map((item) => item.id));
  };

  const handleCollapseAll = () => {
    setOpenIds([]);
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory =
      selectedCategory === "전체" || item.category === selectedCategory;
    const matchesSearch =
      item.question.includes(searchTerm) || item.answer.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFaqs = filteredFaqs.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className={styles.faqPageContainer}>
      {/* GNB Navigation Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoBox}>
            <span className={styles.logoBadge}>싸.농</span>
            <span className={styles.logoTitle}>농산물 가격 정보 서비스</span>
          </div>

          <button
            type="button"
            className={styles.loginNavBtn}
            onClick={() => navigate("/login")}
          >
            로그인 화면으로
          </button>
        </div>

        {/* 상단 가로 메뉴바 */}
        <nav className={styles.topMenuBar}>
          <div className={styles.menuContainer}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.menuBtn} ${
                  activeNav === item ? styles.activeMenuBtn : ""
                }`}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              className={styles.hamburgerBtn}
              aria-label="메뉴 열기"
            >
              ☰
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainArea}>
        {/* Sub Header Section: Title + Sub-board Tab Navigation */}
        <section className={styles.subHeaderArea}>
          <div className={styles.subHeaderLeft}>
            <h2 className={styles.boardTitle}>
              {activeBoard === "자주묻는질문" && "자주묻는 질문"}
              {activeBoard === "일반게시판" && "일반게시판"}
              {activeBoard === "Q&A게시판" && "Q&A게시판"}
            </h2>
            <p className={styles.boardSubtitle}>
              {activeBoard === "자주묻는질문" &&
                "공지사항과 사용자 게시글을 확인하세요"}
              {activeBoard === "일반게시판" &&
                "농산물 관련 자유로운 소통과 소식을 나눠보세요"}
              {activeBoard === "Q&A게시판" &&
                "궁금한 질문을 남기고 실시간 답변을 받아보세요"}
            </p>
          </div>

          <div className={styles.subHeaderRight}>
            {["일반게시판", "Q&A게시판", "자주묻는질문"].map((boardName) => (
              <button
                key={boardName}
                type="button"
                className={`${styles.boardTabBtn} ${
                  activeBoard === boardName ? styles.activeBoardTab : ""
                }`}
                onClick={() => setActiveBoard(boardName)}
              >
                {boardName}
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================
            1. 자주묻는질문 (FAQ)
        ======================================================== */}
        {activeBoard === "자주묻는질문" && (
          <>
            {/* Search & Category Filter Section */}
            <div className={styles.controlBar}>
              <div className={styles.categories}>
                {["전체", "가격변동", "알뜰구매", "유통구조", "품질/보관"].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.catTab} ${
                        selectedCategory === cat ? styles.activeCat : ""
                      }`}
                      onClick={() => handleCategoryChange(cat)}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder="궁금한 단어나 키워드를 검색하세요..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
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
              {paginatedFaqs.map((faq) => {
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
                        className={`${styles.arrowIcon} ${
                          isOpen ? styles.rotated : ""
                        }`}
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

              {filteredFaqs.length === 0 && (
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  ◀ 이전
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`${styles.pageBtn} ${styles.numBtn} ${
                        currentPage === pageNum ? styles.activePage : ""
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  다음 ▶
                </button>
              </div>
            )}
          </>
        )}

        {/* ========================================================
            2. 일반게시판 (추후 페이지 연결 예정)
        ======================================================== */}
        {activeBoard === "일반게시판" && (
          <div className={styles.emptyNotice}>
            <p>🔍 일반게시판 페이지 준비 중입니다.</p>
            <span style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "8px", display: "block" }}>
              추후 일반게시판 페이지가 연결될 예정입니다.
            </span>
          </div>
        )}

        {/* ========================================================
            3. Q&A게시판 (추후 페이지 연결 예정)
        ======================================================== */}
        {activeBoard === "Q&A게시판" && (
          <div className={styles.emptyNotice}>
            <p>🔍 Q&A게시판 페이지 준비 중입니다.</p>
            <span style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "8px", display: "block" }}>
              추후 Q&A게시판 페이지가 연결될 예정입니다.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

export default HomeBoardPage;
