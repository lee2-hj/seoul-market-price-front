import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import {
  canUserDeleteReport,
  getReportById,
  updateReport,
} from "@/features/report/services/reportService";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

interface ReportEditFormData {
  title: string;
  content: string;
  isSecret: boolean;
}

export default function ReportEditPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportEditFormData>();

  const numericReportId = Number(reportId);
  const report = useMemo(
    () => getReportById(numericReportId),
    [numericReportId],
  );
  const canEdit = Boolean(report && canUserDeleteReport(report, loginUser));

  useEffect(() => {
    if (!report) {
      alert("수정할 문의를 찾을 수 없습니다.");
      navigate("/report", { replace: true });
      return;
    }

    if (!canEdit) {
      alert("문의 수정 권한이 없습니다.");
      navigate(`/report/${report.id}`, { replace: true });
      return;
    }

    reset({
      title: report.title,
      content: report.content,
      isSecret: report.isSecret,
    });
  }, [canEdit, navigate, report, reset]);

  const onSubmit = (data: ReportEditFormData) => {
    const currentReport = getReportById(numericReportId);
    if (!currentReport) {
      alert("수정할 문의를 찾을 수 없습니다.");
      return;
    }

    const updated = updateReport(
      numericReportId,
      { ...data, targetProperty: currentReport.targetProperty },
      loginUser,
    );

    if (!updated) {
      alert("문의 수정 권한이 없거나 문의를 찾을 수 없습니다.");
      return;
    }

    alert("문의사항이 수정되었습니다.");
    navigate(`/report/${updated.id}`, { replace: true });
  };

  if (!report || !canEdit) return null;

  return (
    <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[840px] mx-auto space-y-6">
        <div className="bg-white border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <span className="text-[13px] font-extrabold text-[#0F8AA8] block mb-1">
            CUSTOMER INQUIRY
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#123047]">
            문의사항 수정
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1.5">
            접수한 문의의 제목, 내용과 공개 여부를 수정할 수 있습니다.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="space-y-2">
            <label className="block text-[14px] font-bold">문의 제목 <span className="text-rose-500">*</span></label>
            <input
              {...register("title", { required: "문의 제목을 입력해 주세요." })}
              className="w-full h-[44px] px-3.5 rounded-[8px] border border-[#DCE8ED] bg-[#F5FAFC] focus:outline-none focus:border-[#0F8AA8]"
            />
            {errors.title && <p className="text-[12px] text-rose-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-[14px] font-bold">상세 문의 내용 <span className="text-rose-500">*</span></label>
            <textarea
              rows={8}
              {...register("content", { required: "상세 문의 내용을 입력해 주세요." })}
              className="w-full p-3.5 rounded-[8px] border border-[#DCE8ED] bg-[#F5FAFC] leading-relaxed resize-y focus:outline-none focus:border-[#0F8AA8]"
            />
            {errors.content && <p className="text-[12px] text-rose-500">{errors.content.message}</p>}
          </div>

          <label className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[10px] flex items-center justify-between cursor-pointer">
            <span>
              <strong className="text-[14px] block">비공개 문의</strong>
              <span className="text-[12px] text-[#6B7280]">작성자와 관리자만 내용을 볼 수 있습니다.</span>
            </span>
            <input type="checkbox" {...register("isSecret")} className="w-5 h-5 accent-[#0F8AA8]" />
          </label>

          <div className="flex justify-end gap-3 pt-6 border-t border-[#DCE8ED]">
            <button
              type="button"
              onClick={() => navigate(`/report/${numericReportId}`)}
              className="h-[44px] px-5 rounded-[8px] bg-white border border-[#DCE8ED] text-[#6B7280] font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[44px] px-7 rounded-[8px] bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold border-none cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "수정 중..." : "수정 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
