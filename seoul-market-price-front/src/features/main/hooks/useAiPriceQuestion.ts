import { useCallback, useRef, useState } from "react";
import axios from "axios";

import {
  searchNaturalWithAiApi,
  type AiSearchResponse,
  type DongRegionResponse,
} from "@/api/api";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { toAiDisplayResult } from "@/features/main/utils/aiSearchMappers";

const LOGIN_REQUIRED_MESSAGE = "AI 시세 질문은 로그인 후 이용할 수 있습니다.";
const DEFAULT_ERROR_MESSAGE = "AI 시세 답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

export function useAiPriceQuestion() {
  const user = useAuthStore((state) => state.user);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AiSearchResponse | null>(null);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [candidateGroups, setCandidateGroups] = useState<DongRegionResponse[][]>([]);
  const [candidateStep, setCandidateStep] = useState(0);
  const [selectedRegions, setSelectedRegions] = useState<DongRegionResponse[]>([]);
  const [singleCandidates, setSingleCandidates] = useState<DongRegionResponse[]>([]);
  const lastQuestionRef = useRef("");
  const requestInFlightRef = useRef(false);

  const runQuestion = useCallback(async (nextQuestion: string) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setIsLoading(true);
    setError("");
    setLoginRequired(false);
    lastQuestionRef.current = nextQuestion;

    try {
      const response = await searchNaturalWithAiApi(nextQuestion);
      if (response.status === "SUCCESS" && response.result) {
        setResult({
          ...toAiDisplayResult(response.result),
          interpretation: response.interpretation,
        });
        setQuestion("");
        return;
      }

      if (response.status === "NEED_CLARIFICATION") {
        const slots = [...new Set(response.candidates.map((candidate) => candidate.slot))];
        const groups = slots.map((slot) => response.candidates.filter((candidate) => candidate.slot === slot));
        if (groups.length === 1) {
          setSingleCandidates(groups[0] ?? []);
        } else if (groups.length > 1) {
          setCandidateGroups(groups);
          setSelectedRegions([]);
          setCandidateStep(0);
        } else {
          setError(response.message || "질문에 필요한 지역 정보를 조금 더 구체적으로 입력해 주세요.");
        }
        return;
      }

      setResult(null);
      setError(response.message || "검색 결과를 찾을 수 없습니다.");
    } catch (caughtError: unknown) {
      setResult(null);
      if (axios.isAxiosError(caughtError) && caughtError.response?.status === 401) {
        setLoginRequired(true);
        setError(LOGIN_REQUIRED_MESSAGE);
      } else {
        setError(DEFAULT_ERROR_MESSAGE);
      }
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const submit = useCallback(() => {
    if (!user) {
      setLoginRequired(true);
      setError(LOGIN_REQUIRED_MESSAGE);
      return;
    }
    const trimmed = question.trim();
    if (!trimmed) {
      setError("질문을 입력해 주세요.");
      return;
    }
    void runQuestion(trimmed);
  }, [question, runQuestion, user]);

  const chooseSingleCandidate = useCallback((candidate: DongRegionResponse) => {
    setSingleCandidates([]);
    void runQuestion(`${candidate.sggName} ${candidate.dongName} 가격 알려줘`);
  }, [runQuestion]);

  const chooseCandidate = useCallback((candidate: DongRegionResponse) => {
    const next = [...selectedRegions];
    next[candidateStep] = candidate;
    const nextStep = candidateStep + 1;
    const unresolved = candidateGroups.findIndex((group, index) => index >= nextStep && group.length > 1);
    if (unresolved >= 0) {
      setSelectedRegions(next);
      setCandidateStep(unresolved);
      return;
    }

    const selected = candidateGroups.map((group, index) => next[index] || group[0]).filter(Boolean);
    setCandidateGroups([]);
    if (selected.length >= 2) {
      void runQuestion(`${selected[0].sggName} ${selected[0].dongName}과 ${selected[1].sggName} ${selected[1].dongName} 가격 비교해줘`);
    } else if (selected[0]) {
      void runQuestion(`${selected[0].sggName} ${selected[0].dongName} 가격 알려줘`);
    }
  }, [candidateGroups, candidateStep, runQuestion, selectedRegions]);

  return {
    question,
    setQuestion,
    result,
    error,
    loginRequired,
    isLoading,
    singleCandidates,
    candidateGroups,
    candidateStep,
    submit,
    retry: () => lastQuestionRef.current && void runQuestion(lastQuestionRef.current),
    chooseSingleCandidate,
    chooseCandidate,
    closeResult: () => setResult(null),
    closeCandidates: () => { setSingleCandidates([]); setCandidateGroups([]); },
    clearMessage: () => { setError(""); setLoginRequired(false); },
  };
}
