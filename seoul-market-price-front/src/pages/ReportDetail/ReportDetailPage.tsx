import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getReportById,
  deleteReport,
  REPORT_STATUS_MAP,
  canUserViewReport,
  canUserDeleteReport,
} from "@/features/report/services/reportService";
import type { ReportItem } from "@/features/report/types/report.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.user);
  const [report, setReport] = useState<ReportItem | null>(null);

  useEffect(() => {
    if (reportId) {
      const data = getReportById(Number(reportId));
      if (data) {
        setReport(data);
      }
    }
  }, [reportId]);

  const handleGoToList = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/report");
    }
  };

  if (!report) {
    return (
      <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-16 px-4 flex flex-col items-center justify-center">
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-8 max-w-[460px] text-center space-y-4 shadow-xs">
          <p className="text-[16px] font-bold text-[#123047]">
            해당 신고 내역을 찾을 수 없습니다.
          </p>
          <p className="text-[13px] text-[#6B7280]">
            존재하지 않거나 삭제된 신고 게시글입니다.
          </p>
          <button
            type="button"
            onClick={handleGoToList}
            className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] border-none cursor-pointer"
          >
            신고 목록으로 이동
          </button>
        </div>
      </div>
    );
  }

  // 🛡️ 보안: 비공개 글 열람 권한 확인 (본인 또는 관리자만 열람 가능)
  const isAccessible = canUserViewReport(report, loginUser);

  if (!isAccessible) {
    return (
      <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-16 px-4 flex flex-col items-center justify-center">
        <div className="bg-[#FFFFFF] border border-rose-200 rounded-[16px] p-8 max-w-[480px] text-center space-y-4 shadow-xs">
          <span className="inline-block px-3 py-1 rounded-full text-[12px] font-extrabold bg-rose-100 text-rose-700">
            비공개 신고글 보호
          </span>
          <h2 className="text-[18px] font-extrabold text-[#123047]">
            열람 권한이 없는 비공개 게시글입니다
          </h2>
          <p className="text-[13px] text-[#6B7280] leading-relaxed">
            신고자의 개인정보 및 제보 내용 보호를 위해{" "}
            <strong>작성자 본인 및 관리자</strong>만 내용을 확인할 수 있습니다.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGoToList}
              className="px-4 py-2 bg-white border border-[#DCE8ED] hover:bg-[#F0F7FA] text-[#13202B] text-[13px] font-bold rounded-[7px] cursor-pointer"
            >
              목록으로
            </button>
            {!loginUser && (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="px-5 py-2 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[7px] border-none cursor-pointer"
              >
                로그인하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = REPORT_STATUS_MAP[report.status];
  const canDelete = canUserDeleteReport(report, loginUser);

  const handleDelete = () => {
    if (window.confirm("이 문의 내역을 삭제하시겠습니까?")) {
      deleteReport(report.id);
      alert("문의 내역이 삭제되었습니다.");
      navigate("/report");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[840px] mx-auto space-y-6">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleGoToList}
            className="h-[38px] px-4 rounded-[7px] bg-white border border-[#DCE8ED] hover:bg-[#F0F7FA] text-[#13202B] text-[13px] font-bold cursor-pointer transition-colors"
          >
            ← 문의 목록으로
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[12px] font-extrabold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* 문의 본문 카드 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 space-y-6 shadow-xs">
          {/* 헤더 */}
          <div className="border-b border-[#DCE8ED] pb-5 space-y-2">
            <div className="flex items-center gap-2">
              {report.isSecret && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                  비공개 접수건
                </span>
              )}
            </div>
            <h1 className="text-[20px] sm:text-[23px] font-extrabold text-[#123047] leading-snug">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B7280] pt-1">
              <span>
                작성자:{" "}
                <strong className="text-[#13202B] font-semibold">
                  {report.authorName}
                </strong>
              </span>
              <span>접수일자: {report.createdAt}</span>
              <span>문의번호: #{report.id}</span>
            </div>
          </div>

          {/* 문의 대상 단지/매물 박스 */}
          <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[10px] space-y-1">
            <span className="text-[12px] font-bold text-[#0F8AA8] block">
              문의 대상 매물 / 단지
            </span>
            <p className="text-[14px] font-bold text-[#123047]">
              {report.targetProperty}
            </p>
          </div>

          {/* 상세 내용 */}
          <div className="space-y-2">
            <span className="text-[13px] font-bold text-[#6B7280] block">
              상세 문의 내용
            </span>
            <div className="p-4 bg-[#F5FAFC] border border-[#DCE8ED] rounded-[10px] text-[14px] text-[#13202B] leading-relaxed whitespace-pre-wrap min-h-[120px]">
              {report.content}
            </div>
          </div>

          {/* 첨부파일 목록 */}
          {report.attachments && report.attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-[13px] font-bold text-[#6B7280] block">
                제출된 첨부 자료 ({report.attachments.length}개)
              </span>
              <div className="space-y-1.5">
                {report.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[8px] text-[13px]"
                  >
                    <span className="font-medium text-[#13202B] truncate">
                      {file.fileName}{" "}
                      <span className="text-[11px] text-[#6B7280]">
                        ({(file.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          `'${file.fileName}' 다운로드 시뮬레이션입니다 (개발용).`,
                        )
                      }
                      className="px-3 py-1 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[12px] font-bold rounded-[5px] border-none cursor-pointer shrink-0"
                    >
                      다운로드
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 관리자 공식 답변 영역 */}
        {report.adminReply ? (
          <div className="bg-[#E6F4F2] border border-[#7CC9D8] rounded-[16px] p-6 sm:p-8 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#B8E4ED] pb-3">
              <div>
                <span className="text-[14px] font-extrabold text-[#0F766E] block">
                  {report.adminReply.adminName}
                </span>
                <span className="text-[11px] text-[#0B5E73]">
                  답변일시: {report.adminReply.repliedAt}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#0F8AA8] text-white">
                공식 조치 답변
              </span>
            </div>
            <p className="text-[14px] text-[#123047] leading-relaxed whitespace-pre-wrap pt-1">
              {report.adminReply.replyContent}
            </p>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[14px] p-5 text-center text-[#6B7280] text-[13px]">
            현재 담당자가 접수된 문의 내용을 확인 및 검토 중입니다. 검토가
            완료되면 조치 결과가 이곳에 등록됩니다.
          </div>
        )}

        {/* 하단 제어 버튼 */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleGoToList}
            className="h-[42px] px-5 rounded-[8px] bg-white border border-[#DCE8ED] hover:bg-[#F0F7FA] text-[#13202B] text-[13px] font-bold cursor-pointer"
          >
            목록으로
          </button>
          {canDelete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/report/${report.id}/edit`)}
                className="h-[42px] px-4 rounded-[8px] bg-[#0F8AA8] border border-[#0F8AA8] text-white hover:bg-[#0B5E73] text-[13px] font-bold cursor-pointer transition-colors"
              >
                문의 수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-[42px] px-4 rounded-[8px] bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-bold cursor-pointer transition-colors"
              >
                문의 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
