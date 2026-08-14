import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLogin } from "@/features/auth/utils/auth";
import {
  getStoredReports,
  REPORT_STATUS_MAP,
  canUserViewReport,
  maskName,
} from "@/features/report/services/reportService";
import type { ReportItem } from "@/features/report/types/report.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export default function ReportPage() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.user);
  const [reports] = useState<ReportItem[]>(getStoredReports);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveKeyword(searchKeyword.trim());
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchKeyword("");
    setActiveKeyword("");
    setCurrentPage(1);
  };

  // 필터링된 문의 목록 (제목 전용 검색)
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const isAccessible = canUserViewReport(item, loginUser);
      const searchableTitle = isAccessible
        ? item.title
        : "작성자와 관리자만 열람할 수 있는 비공개 문의글입니다.";
      const matchKeyword =
        !activeKeyword ||
        searchableTitle.toLowerCase().includes(activeKeyword.toLowerCase());
      return matchKeyword;
    });
  }, [reports, activeKeyword, loginUser]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const handleWriteClick = () => {
    if (!isLogin()) {
      alert("로그인 후 문의를 접수할 수 있습니다.");
      navigate("/login");
      return;
    }
    navigate("/report/write");
  };

  return (
    <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1140px] mx-auto space-y-6">
        {/* 상단 헤더 영역 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[13px] font-extrabold text-[#0F8AA8] uppercase tracking-wider block mb-1">
                SSABU CUSTOMER CENTER
              </span>
              <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#123047] tracking-tight">
                문의사항
              </h1>
              <p className="text-[14px] text-[#6B7280] mt-1.5 leading-relaxed">
                싸부(SSABU) 서비스 이용 중 궁금하신 점이나 건의사항을 문의해 주시면 신속하게 답변해 드립니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWriteClick}
              className="inline-flex items-center justify-center h-[46px] px-6 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold rounded-[8px] transition-colors shadow-xs cursor-pointer border-none shrink-0"
            >
              문의 접수하기
            </button>
          </div>
        </div>

        {/* 검색 및 건수 바 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <p className="text-[14px] text-[#6B7280]">
            총{" "}
            <strong className="text-[#0F8AA8] font-extrabold">
              {filteredReports.length}
            </strong>
            건의 문의 접수 내역이 있습니다.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              placeholder="문의 제목 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-[38px] px-3.5 rounded-[7px] border border-[#DCE8ED] text-[13px] text-[#13202B] bg-[#F5FAFC] focus:outline-none focus:border-[#0F8AA8] w-full sm:w-[240px]"
            />
            <button
              type="submit"
              className="h-[38px] px-4 rounded-[7px] bg-[#123047] hover:bg-[#0B5E73] text-white text-[13px] font-bold border-none cursor-pointer transition-colors shrink-0"
            >
              검색
            </button>
            {activeKeyword && (
              <button
                type="button"
                onClick={handleReset}
                className="h-[38px] px-3 rounded-[7px] bg-white border border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA] text-[13px] font-medium cursor-pointer shrink-0"
              >
                초기화
              </button>
            )}
          </form>
        </div>

        {/* 문의 목록 테이블 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] overflow-hidden shadow-xs">
          {paginatedReports.length === 0 ? (
            <div className="py-20 text-center text-[#6B7280] text-[14px]">
              접수된 문의 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F0F7FA] border-b border-[#DCE8ED] text-[13px] text-[#123047] font-bold">
                    <th className="py-3.5 px-4 text-center w-[70px]">번호</th>
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
                <tbody className="divide-y divide-[#DCE8ED] text-[13px]">
                  {paginatedReports.map((item) => {
                    const statusMeta = REPORT_STATUS_MAP[item.status];
                    const canView = canUserViewReport(item, loginUser);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F5FAFC] transition-colors"
                      >
                        <td className="py-4 px-4 text-center text-[#6B7280] font-medium">
                          {item.id}
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            to={`/report/${item.id}`}
                            className="block group text-decoration-none"
                            style={{ textDecoration: "none" }}
                          >
                            <div className="flex items-center gap-2">
                              {item.isSecret && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                                  비공개
                                </span>
                              )}
                              <span className="font-bold text-[#13202B] group-hover:text-[#0F8AA8] transition-colors truncate max-w-[480px]">
                                {item.isSecret && !canView
                                  ? "작성자와 관리자만 열람할 수 있는 비공개 문의글입니다."
                                  : item.title}
                              </span>
                            </div>
                            <span className="text-[12px] text-[#6B7280] block mt-0.5 font-normal truncate max-w-[500px]">
                              {item.isSecret && !canView
                                ? "문의 대상 정보 비공개"
                                : `대상: ${item.targetProperty}`}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-center text-[#6B7280]">
                          {maskName(item.authorName)}
                        </td>
                        <td className="py-4 px-4 text-center text-[#6B7280]">
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

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#DCE8ED] flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-[6px] border border-[#DCE8ED] text-[12px] text-[#6B7280] disabled:opacity-40 hover:bg-[#F0F7FA] cursor-pointer disabled:cursor-not-allowed"
              >
                이전
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-[32px] h-[32px] rounded-[6px] text-[13px] font-bold cursor-pointer transition-colors border ${
                        isActive
                          ? "bg-[#0F8AA8] text-white border-[#0F8AA8]"
                          : "bg-white text-[#6B7280] border-[#DCE8ED] hover:bg-[#F0F7FA]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-[6px] border border-[#DCE8ED] text-[12px] text-[#6B7280] disabled:opacity-40 hover:bg-[#F0F7FA] cursor-pointer disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
