import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { isLogin } from "@/features/auth/utils/auth";
import {
  createReport,
  validateFileSecurity,
  checkReportCooldown,
  ALLOWED_FILE_EXTENSIONS,
} from "@/features/report/services/reportService";
import type { ReportCategory } from "@/features/report/types/report.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

interface ReportFormData {
  category: ReportCategory;
  targetProperty: string;
  title: string;
  content: string;
  isSecret: boolean;
}

export default function ReportWritePage() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.user);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin()) {
      alert("로그인 후 문의를 접수할 수 있습니다.");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    defaultValues: {
      category: "OTHER",
      targetProperty: "일반 문의",
      title: "",
      content: "",
      isSecret: false,
    },
  });

  // 🛡️ 보안: 첨부파일 확장자 및 크기 검증
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      const validation = validateFileSecurity(file);
      if (!validation.valid) {
        alert(validation.message);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    // reset input value so re-selecting same file triggers change
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReportFormData) => {
    try {
      // 🛡️ 보안: 연속 신고 도배 방지 쿨다운 검사
      const cooldown = checkReportCooldown();
      if (!cooldown.canSubmit) {
        alert(
          `연속 접수 방지를 위해 ${cooldown.remainingSeconds}초 후에 다시 접수할 수 있습니다.`,
        );
        return;
      }

      setIsSubmitting(true);

      const authorName = loginUser?.name || "-";

      const newReport = createReport({
        category: "OTHER",
        targetProperty: data.targetProperty || "일반 문의",
        title: data.title,
        content: data.content,
        isSecret: data.isSecret,
        authorName,
        authorUserId: loginUser?.userId,
        files: selectedFiles,
      });

      alert("문의사항이 안전하게 접수되었습니다. 신속히 확인하여 답변드리겠습니다.");
      navigate(`/report/${newReport.id}`);
    } catch (err) {
      console.error("문의 접수 오류:", err);
      alert("문의 접수 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5FAFC] text-[#13202B] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[840px] mx-auto space-y-6">
        {/* 상단 헤더 */}
        <div className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <span className="text-[13px] font-extrabold text-[#0F8AA8] uppercase tracking-wider block mb-1">
            CUSTOMER INQUIRY
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#123047] tracking-tight">
            문의사항 접수
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1.5 leading-relaxed">
            서비스 이용 중 궁금하신 점이나 건의사항을 문의해 주시면 신속하게 답변해 드립니다.
          </p>
        </div>

        {/* 문의 접수 폼 */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#FFFFFF] border border-[#DCE8ED] rounded-[16px] p-6 sm:p-8 space-y-6 shadow-xs"
        >
          {/* 1. 문의 제목 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#13202B]">
              문의 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="문의 핵심 요약을 한 줄로 작성해 주세요"
              {...register("title", {
                required: "문의 제목을 입력해 주세요.",
              })}
              className="w-full h-[44px] px-3.5 rounded-[8px] border border-[#DCE8ED] bg-[#F5FAFC] text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8]"
            />
            {errors.title && (
              <p className="text-[12px] text-rose-500 font-medium mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* 2. 상세 문의 내용 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#13202B]">
              상세 문의 내용 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={7}
              placeholder="문의하실 구체적인 내용이나 요청 사항을 상세히 작성해 주세요."
              {...register("content", {
                required: "상세 문의 내용을 입력해 주세요.",
              })}
              className="w-full p-3.5 rounded-[8px] border border-[#DCE8ED] bg-[#F5FAFC] text-[14px] text-[#13202B] focus:outline-none focus:border-[#0F8AA8] leading-relaxed resize-y"
            />
            {errors.content && (
              <p className="text-[12px] text-rose-500 font-medium mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* 5. 비공개 여부 (보안) */}
          <div className="p-4 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[10px] flex items-center justify-between">
            <div>
              <span className="text-[14px] font-bold text-[#123047] block">
                비공개로 접수하기 (보안 권장)
              </span>
              <span className="text-[12px] text-[#6B7280] block mt-0.5">
                체크 시 신고자 본인과 관리자만 내용을 열람할 수 있도록 보호됩니다.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register("isSecret")}
                className="w-5 h-5 accent-[#0F8AA8] cursor-pointer"
              />
            </label>
          </div>

          {/* 6. 증빙 자료 첨부파일 (보안 확장자 검증 적용) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[14px] font-bold text-[#13202B]">
                증빙 자료 첨부 (최대 5개)
              </label>
              <span className="text-[11px] text-[#6B7280]">
                허용: {ALLOWED_FILE_EXTENSIONS.join(", ")} (파일당 10MB 이하)
              </span>
            </div>
            <div className="p-4 border border-dashed border-[#B8D5E0] rounded-[10px] bg-[#F5FAFC] text-center space-y-3">
              <input
                type="file"
                id="report-file-input"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.hwp,.zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="report-file-input"
                className="inline-block px-4 py-2 bg-white border border-[#DCE8ED] hover:bg-[#F0F7FA] text-[#123047] text-[13px] font-bold rounded-[6px] cursor-pointer transition-colors"
              >
                파일 선택하기
              </label>
              <p className="text-[12px] text-[#6B7280]">
                매물 캡처 사진, 문자 상담 내역, 녹취록 등 사실 증빙 파일을
                등록해 주세요.
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-[#F0F7FA] border border-[#DCE8ED] rounded-[8px] text-[13px]"
                  >
                    <span className="font-medium text-[#13202B] truncate">
                      {file.name}{" "}
                      <span className="text-[11px] text-[#6B7280]">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-rose-500 hover:text-rose-700 text-[12px] font-bold border-none bg-transparent cursor-pointer px-1"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#DCE8ED]">
            <button
              type="button"
              onClick={() => navigate("/report")}
              className="h-[44px] px-5 rounded-[8px] bg-white border border-[#DCE8ED] hover:bg-[#F0F7FA] text-[#6B7280] text-[14px] font-bold cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[44px] px-7 rounded-[8px] bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[14px] font-bold border-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "접수 처리 중..." : "신고 접수하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
