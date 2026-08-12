import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { isLogin } from "@/features/auth/utils/auth";
import {
  createReport,
  REPORT_CATEGORY_MAP,
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
      alert("로그인 후 신고를 접수할 수 있습니다.");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    defaultValues: {
      category: "FAKE_LISTING",
      targetProperty: "",
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

      const authorName = loginUser?.name || "익명제보자";

      const newReport = createReport({
        category: data.category,
        targetProperty: data.targetProperty,
        title: data.title,
        content: data.content,
        isSecret: data.isSecret,
        authorName,
        authorUserId: loginUser?.userId,
        files: selectedFiles,
      });

      alert("신고가 안전하게 접수되었습니다. 신속히 사실 확인하겠습니다.");
      navigate(`/report/${newReport.id}`);
    } catch (err) {
      console.error("신고 접수 오류:", err);
      alert("신고 접수 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8faf8] text-[#2d3a2f] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[840px] mx-auto space-y-6">
        {/* 상단 헤더 */}
        <div className="bg-white border border-[#e2ece2] rounded-[16px] p-6 sm:p-8 shadow-xs">
          <span className="text-[13px] font-bold text-[#4c9b55] uppercase tracking-wider block mb-1">
            REPORT SUBMISSION
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#222b23] tracking-tight">
            허위 매물 및 불공정 거래 신고 접수
          </h1>
          <p className="text-[14px] text-[#6b7c6d] mt-1.5 leading-relaxed">
            허위 호가, 계약 완료 후 미삭제 매물, 담합 등 의심되는 상황을 제보해
            주시면 신속하게 사실 확인 및 시정 조치합니다.
          </p>
        </div>

        {/* 신고 접수 폼 */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-[#e2ece2] rounded-[16px] p-6 sm:p-8 space-y-6 shadow-xs"
        >
          {/* 1. 신고 유형 선택 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#2d3a2f]">
              신고 유형 <span className="text-rose-500">*</span>
            </label>
            <select
              {...register("category", { required: true })}
              className="w-full h-[44px] px-3.5 rounded-[8px] border border-[#d3dfd3] bg-[#fafcfa] text-[14px] text-[#2d3a2f] focus:outline-none focus:border-[#4c9b55]"
            >
              {(
                [
                  "FAKE_LISTING",
                  "PRICE_DISTORTION",
                  "DUPLICATE",
                  "UNFAIR_BROKERAGE",
                  "OTHER",
                ] as ReportCategory[]
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {REPORT_CATEGORY_MAP[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 대상 단지 및 매물 정보 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#2d3a2f]">
              신고 대상 단지 / 매물명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 송파구 가락동 헬리오시티 105동 84㎡ (또는 중개업소명)"
              {...register("targetProperty", {
                required: "신고 대상 단지 또는 매물명을 입력해 주세요.",
              })}
              className="w-full h-[44px] px-3.5 rounded-[8px] border border-[#d3dfd3] bg-[#fafcfa] text-[14px] text-[#2d3a2f] focus:outline-none focus:border-[#4c9b55]"
            />
            {errors.targetProperty && (
              <p className="text-[12px] text-rose-500 font-medium mt-1">
                {errors.targetProperty.message}
              </p>
            )}
          </div>

          {/* 3. 신고 제목 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#2d3a2f]">
              신고 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="신고 핵심 요약을 한 줄로 작성해 주세요"
              {...register("title", {
                required: "신고 제목을 입력해 주세요.",
              })}
              className="w-full h-[44px] px-3.5 rounded-[8px] border border-[#d3dfd3] bg-[#fafcfa] text-[14px] text-[#2d3a2f] focus:outline-none focus:border-[#4c9b55]"
            />
            {errors.title && (
              <p className="text-[12px] text-rose-500 font-medium mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* 4. 상세 신고 내용 */}
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#2d3a2f]">
              상세 신고 사유 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={7}
              placeholder="방문 또는 문의 시 확인된 구체적인 허위 매물 정황, 포털 등록 가격과 실제 제시 가격의 차이, 중개사 대응 내용 등을 상세히 적어주세요."
              {...register("content", {
                required: "상세 신고 내용을 입력해 주세요.",
              })}
              className="w-full p-3.5 rounded-[8px] border border-[#d3dfd3] bg-[#fafcfa] text-[14px] text-[#2d3a2f] focus:outline-none focus:border-[#4c9b55] leading-relaxed resize-y"
            />
            {errors.content && (
              <p className="text-[12px] text-rose-500 font-medium mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* 5. 비공개 여부 (보안) */}
          <div className="p-4 bg-[#f6f9f6] border border-[#e2ece2] rounded-[10px] flex items-center justify-between">
            <div>
              <span className="text-[14px] font-bold text-[#2d3a2f] block">
                비공개로 접수하기 (보안 권장)
              </span>
              <span className="text-[12px] text-[#68786a] block mt-0.5">
                체크 시 신고자 본인과 관리자만 내용을 열람할 수 있도록 보호됩니다.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register("isSecret")}
                className="w-5 h-5 accent-[#4c9b55] cursor-pointer"
              />
            </label>
          </div>

          {/* 6. 증빙 자료 첨부파일 (보안 확장자 검증 적용) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[14px] font-bold text-[#2d3a2f]">
                증빙 자료 첨부 (최대 5개)
              </label>
              <span className="text-[11px] text-[#78887a]">
                허용: {ALLOWED_FILE_EXTENSIONS.join(", ")} (파일당 10MB 이하)
              </span>
            </div>
            <div className="p-4 border border-dashed border-[#c8d8c8] rounded-[10px] bg-[#fafcfa] text-center space-y-3">
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
                className="inline-block px-4 py-2 bg-white border border-[#c2d4c2] hover:bg-[#f0f5f0] text-[#344036] text-[13px] font-bold rounded-[6px] cursor-pointer transition-colors"
              >
                파일 선택하기
              </label>
              <p className="text-[12px] text-[#78887a]">
                매물 캡처 사진, 문자 상담 내역, 녹취록 등 사실 증빙 파일을
                등록해 주세요.
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-[#f4f7f4] border border-[#e2ece2] rounded-[8px] text-[13px]"
                  >
                    <span className="font-medium text-[#2d3a2f] truncate">
                      {file.name}{" "}
                      <span className="text-[11px] text-[#78887a]">
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
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#edf3ed]">
            <button
              type="button"
              onClick={() => navigate("/report")}
              className="h-[44px] px-5 rounded-[8px] bg-white border border-[#dce4da] hover:bg-[#f0f4f0] text-[#556457] text-[14px] font-bold cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[44px] px-7 rounded-[8px] bg-[#4c9b55] hover:bg-[#438b4b] text-white text-[14px] font-bold border-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "접수 처리 중..." : "신고 접수하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
