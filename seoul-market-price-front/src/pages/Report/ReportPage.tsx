import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLogin } from "@/features/auth/utils/auth";
import {
  getStoredReports,
  REPORT_CATEGORY_MAP,
  REPORT_STATUS_MAP,
  canUserViewReport,
} from "@/features/report/services/reportService";
import type {
  ReportItem,
  ReportCategory,
} from "@/features/report/types/report.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export default function ReportPage() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.user);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ReportCategory>("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setReports(getStoredReports());
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveKeyword(searchKeyword.trim());
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchKeyword("");
    setActiveKeyword("");
    setSelectedCategory("ALL");
    setCurrentPage(1);
  };

  // 필터링된 신고 목록
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const matchCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;
      const matchKeyword =
        !activeKeyword ||
        item.title.toLowerCase().includes(activeKeyword.toLowerCase()) ||
        item.targetProperty.toLowerCase().includes(activeKeyword.toLowerCase());
      return matchCategory && matchKeyword;
    });
  }, [reports, selectedCategory, activeKeyword]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const handleWriteClick = () => {
    if (!isLogin()) {
      alert("로그인 후 신고를 접수할 수 있습니다.");
      navigate("/login");
      return;
    }
    navigate("/report/write");
  };

  return (
    <div className="w-full min-h-screen bg-[#f8faf8] text-[#2d3a2f] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1140px] mx-auto space-y-6">
        {/* 상단 헤더 영역 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[13px] font-bold text-[#4c9b55] uppercase tracking-wider block mb-1">
                SSABU CLEAN REAL ESTATE
              </span>
              <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#222b23] tracking-tight">
                허위 매물 및 불공정 거래 신고 센터
              </h1>
              <p className="text-[14px] text-[#6b7c6d] mt-1.5 leading-relaxed">
                싸부(SSABU)는 허위 가격, 미존재 매물, 시세 왜곡 없는 투명한
                서울 부동산 거래 환경을 만들어갑니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWriteClick}
              className="inline-flex items-center justify-center h-[46px] px-6 bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold rounded-[8px] transition-colors shadow-xs cursor-pointer border-none shrink-0"
            >
              신고 접수하기
            </button>
          </div>

          {/* 카테고리 필터 탭 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 mt-6 border-t border-[#edf3ed] pb-1">
            {(
              [
                "ALL",
                "FAKE_LISTING",
                "PRICE_DISTORTION",
                "DUPLICATE",
                "UNFAIR_BROKERAGE",
                "OTHER",
              ] as ReportCategory[]
            ).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-colors shrink-0 cursor-pointer border ${
                    isActive
                      ? "bg-[#2d3a2f] text-white border-[#2d3a2f]"
                      : "bg-[#f4f7f4] text-[#556457] border-[#e2ece2] hover:bg-[#e8efe8]"
                  }`}
                >
                  {REPORT_CATEGORY_MAP[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 검색 및 건수 바 */}
        <div className="bg-white border border-[#e2ece2] rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <p className="text-[14px] text-[#6b7c6d]">
            총{" "}
            <strong className="text-[#4c9b55] font-extrabold">
              {filteredReports.length}
            </strong>
            건의 신고 접수 내역이 있습니다.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              placeholder="단지명 또는 신고 제목 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-[38px] px-3.5 rounded-[7px] border border-[#d3dfd3] text-[13px] text-[#2d3a2f] bg-[#fafcfa] focus:outline-none focus:border-[#4c9b55] w-full sm:w-[240px]"
            />
            <button
              type="submit"
              className="h-[38px] px-4 rounded-[7px] bg-[#343c33] hover:bg-[#252b24] text-white text-[13px] font-bold border-none cursor-pointer transition-colors shrink-0"
            >
              검색
            </button>
            {activeKeyword && (
              <button
                type="button"
                onClick={handleReset}
                className="h-[38px] px-3 rounded-[7px] bg-white border border-[#dce4da] text-[#5a6459] hover:bg-[#eef3ed] text-[13px] font-medium cursor-pointer shrink-0"
              >
                초기화
              </button>
            )}
          </form>
        </div>

        {/* 신고 목록 테이블 */}
        <div className="bg-white border border-[#e2ece2] rounded-[14px] overflow-hidden shadow-xs">
          {paginatedReports.length === 0 ? (
            <div className="py-20 text-center text-[#88988a] text-[14px]">
              접수된 신고 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#f5f8f5] border-b border-[#e2ece2] text-[13px] text-[#556457] font-bold">
                    <th className="py-3.5 px-4 text-center w-[70px]">번호</th>
                    <th className="py-3.5 px-4 text-center w-[130px]">
                      신고 유형
                    </th>
                    <th className="py-3.5 px-4">제목 및 대상 단지</th>
                    <th className="py-3.5 px-4 text-center w-[90px]">작성자</th>
                    <th className="py-3.5 px-4 text-center w-[110px]">
                      접수일자
                    </th>
                    <th className="py-3.5 px-4 text-center w-[100px]">
                      처리 상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3ed] text-[13px]">
                  {paginatedReports.map((item) => {
                    const statusMeta = REPORT_STATUS_MAP[item.status];
                    const canView = canUserViewReport(item, loginUser);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#f9fbf9] transition-colors"
                      >
                        <td className="py-4 px-4 text-center text-[#78887a] font-medium">
                          {item.id}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-[5px] bg-[#f0f4f0] text-[#4d5e4f] text-[12px] font-semibold">
                            {REPORT_CATEGORY_MAP[item.category]}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            to={`/report/${item.id}`}
                            className="block group text-decoration-none"
                            style={{ textDecoration: "none" }}
                          >
                            <div className="flex items-center gap-2">
                              {item.isSecret && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                                  비공개
                                </span>
                              )}
                              <span className="font-bold text-[#2d3a2f] group-hover:text-[#4c9b55] transition-colors truncate max-w-[480px]">
                                {item.isSecret && !canView
                                  ? "작성자와 관리자만 열람할 수 있는 비공개 신고글입니다."
                                  : item.title}
                              </span>
                            </div>
                            <span className="text-[12px] text-[#78887a] block mt-0.5 font-normal truncate max-w-[500px]">
                              {item.isSecret && !canView
                                ? "신고 대상 정보 비공개"
                                : `대상: ${item.targetProperty}`}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-center text-[#68786a]">
                          {item.authorName}
                        </td>
                        <td className="py-4 px-4 text-center text-[#78887a]">
                          {item.createdAt}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-[36px] px-3.5 rounded-[7px] border border-[#dce4da] bg-white text-[#4d5e4f] text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f4f7f4] cursor-pointer"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-[36px] h-[36px] rounded-[7px] text-[13px] font-bold transition-colors cursor-pointer border ${
                  currentPage === page
                    ? "bg-[#4c9b55] text-white border-[#4c9b55]"
                    : "bg-white text-[#556457] border-[#dce4da] hover:bg-[#f4f7f4]"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-[36px] px-3.5 rounded-[7px] border border-[#dce4da] bg-white text-[#4d5e4f] text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f4f7f4] cursor-pointer"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
