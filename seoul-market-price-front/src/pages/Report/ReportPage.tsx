import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isLogin } from "@/features/auth/utils/auth";
import {
  getStoredReports,
  REPORT_STATUS_MAP,
  maskName,
} from "@/features/report/services/reportService";
import type { ReportItem } from "@/features/report/types/report.types";
import { Button } from "@/components/ui/button";

const SECRET_REPORT_TITLE = "작성자와 관리자만 열람할 수 있는 비공개 문의글입니다.";
const SECRET_REPORT_TARGET = "문의 대상 정보 비공개";

export default function ReportPage() {
  const navigate = useNavigate();
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
      const searchableTitle = item.isSecret ? SECRET_REPORT_TITLE : item.title;
      const matchKeyword =
        !activeKeyword ||
        searchableTitle.toLowerCase().includes(activeKeyword.toLowerCase());
      return matchKeyword;
    });
  }, [reports, activeKeyword]);

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
      <div className="mx-auto max-w-[1000px] space-y-8">
        {/* 상단 헤더 영역 */}
        <div className="mb-8 space-y-2 text-center">
          <span className="inline-block rounded-full bg-[#E6F4F2] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0F766E]">
            SSABU CUSTOMER CENTER
          </span>
          <h1 className="text-[36px] font-black tracking-tight text-[#123047]">문의사항</h1>
          <p className="text-[15px] text-[#6B7280]">
            서비스 이용 중 발생한 불편 사항이나 개선이 필요한 내용을 접수해 주세요. 담당자가 확인 후 답변드리겠습니다.
          </p>
        </div>

        {/* 고객센터 이동 탭 */}
        <div className="flex justify-center mb-6">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] border border-[#DCE8ED] bg-white p-1 shadow-sm">
            <button type="button" onClick={() => navigate("/board")} className="rounded-[8px] px-6 py-2.5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA]">게시판</button>
            <button type="button" onClick={() => navigate("/qna")} className="rounded-[8px] px-6 py-2.5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA]">질의응답</button>
            <button type="button" onClick={() => navigate("/faq")} className="rounded-[8px] px-6 py-2.5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA]">자주 묻는 질문</button>
            <button type="button" className="rounded-[8px] bg-[#123047] px-6 py-2.5 text-[14px] font-bold text-white">문의사항</button>
          </div>
        </div>

        {/* 검색 영역 */}
        <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-5 shadow-xs">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col items-center gap-3 md:flex-row"
          >
            <select
              aria-label="검색 조건"
              className="h-[44px] w-full rounded-[7px] border border-[#DCE8ED] bg-[#F5FAFC] px-3 text-[14px] text-[#13202B] focus:border-[#0F8AA8] focus:outline-none md:w-[130px]"
            >
              <option>제목</option>
            </select>
            <input
              type="text"
              placeholder="검색어를 입력하세요."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-[44px] w-full flex-1 rounded-[7px] border border-[#DCE8ED] bg-[#F5FAFC] px-3.5 text-[14px] text-[#13202B] placeholder:text-[#9CA3AF] focus:border-[#0F8AA8] focus:outline-none"
            />
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Button
                type="submit"
                className="h-[44px] flex-1 rounded-[7px] bg-[#0F8AA8] px-6 text-[14px] font-bold text-white hover:bg-[#0B5E73] md:flex-none"
              >
                검색
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-[44px] flex-1 rounded-[7px] border-[#DCE8ED] bg-white px-5 text-[14px] font-bold text-[#6B7280] hover:bg-[#F0F7FA] md:flex-none"
              >
                초기화
              </Button>
            </div>
          </form>
        </div>

        <div className="flex min-h-[44px] items-center justify-between">
          <p className="text-[14px] text-[#6B7280]">
            총 <strong className="font-extrabold text-[#0F8AA8]">{filteredReports.length}</strong>건의 문의 접수 내역이 있습니다.
          </p>
          <button
            type="button"
            onClick={handleWriteClick}
            className="inline-flex h-[42px] min-w-[120px] items-center justify-center rounded-[7px] border border-[#0F8AA8] bg-[#0F8AA8] px-5 text-[14px] font-bold text-white shadow-xs transition-colors hover:bg-[#0B5E73]"
          >
            문의 접수하기
          </button>
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
                  {paginatedReports.map((item, index) => {
                    const statusMeta = REPORT_STATUS_MAP[item.status];
                    const displayNo = filteredReports.length - ((currentPage - 1) * itemsPerPage + index);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F5FAFC] transition-colors"
                      >
                        <td className="py-4 px-4 text-center text-[#6B7280] font-medium">
                          {displayNo}
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
                                {item.isSecret
                                  ? SECRET_REPORT_TITLE
                                  : item.title}
                              </span>
                            </div>
                            <span className="text-[12px] text-[#6B7280] block mt-0.5 font-normal truncate max-w-[500px]">
                              {item.isSecret
                                ? SECRET_REPORT_TARGET
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
