import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  getBoardPostsApi,
  getMyCommentsApi,
  type QnaPageResponse,
} from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

type ActivityType = "POST" | "COMMENT" | "QNA";

const ACTIVITY_TAB_BASE_CLASS =
  "h-[40px] px-1.5 sm:px-4 rounded-[8px] border font-bold text-[12.5px] sm:text-[14px] cursor-pointer flex items-center justify-center text-center transition-all whitespace-nowrap";
const ACTIVITY_TAB_ACTIVE_CLASS = "bg-[#0F8AA8] border-[#0F8AA8] text-white shadow-xs";
const ACTIVITY_TAB_INACTIVE_CLASS =
  "bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA]";
const MY_ACTIVITY_TAB_KEY_PREFIX = "mypage_activity_tab_";

const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

async function getMyQnas() {
  const { data } = await apiMiddleware.get<QnaPageResponse>("/api/qnas/me", {
    params: { page: 0, size: 100 },
  });
  return data;
}

export default function MyActivityPage() {
  const isLoggedIn = isLogin();
  const authUser = useAuthStore((state) => state.user);
  const currentUserIdentity = normalizeIdentity(authUser?.userId);
  const activityTabKey = `${MY_ACTIVITY_TAB_KEY_PREFIX}${currentUserIdentity || "guest"}`;
  const [activityType, setActivityType] = useState<ActivityType>(() => {
    const savedType = sessionStorage.getItem(activityTabKey);
    return savedType === "COMMENT" || savedType === "QNA" ? savedType : "POST";
  });

  useEffect(() => {
    const savedType = sessionStorage.getItem(activityTabKey);
    const nextType: ActivityType = savedType === "COMMENT" || savedType === "QNA"
      ? savedType
      : "POST";
    queueMicrotask(() => setActivityType(nextType));
  }, [activityTabKey]);

  const selectActivityType = (nextType: ActivityType) => {
    setActivityType(nextType);
    sessionStorage.setItem(activityTabKey, nextType);
  };

  // 실제 게시판 데이터 조회 (API 연동)
  const {
    data: boardData,
    isLoading: isBoardLoading,
    isError: isBoardError,
  } = useQuery({
    queryKey: ["myBoardPosts"],
    queryFn: () => getBoardPostsApi({ page: 1, size: 100 }),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // 내가 작성한 게시글 필터링
  const myPosts = useMemo(() => {
    if (!boardData?.items || !authUser) return [];
    const currentName = normalizeIdentity(authUser.name);
    const currentId = normalizeIdentity(authUser.userId);

    return boardData.items.filter((item) => {
      const author = normalizeIdentity(item.authorName);
      return (currentName && author === currentName) || (currentId && author === currentId);
    });
  }, [boardData, authUser]);

  const {
    data: myQnaData,
    isLoading: isMyQnasLoading,
    isError: isMyQnasError,
  } = useQuery({
    queryKey: ["myQnas"],
    queryFn: getMyQnas,
    enabled: isLoggedIn,
  });

  const myQnas = myQnaData?.content ?? [];

  // 내가 작성한 댓글 조회 (GET /api/comments/me 연동)
  const {
    data: myCommentsData,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
  } = useQuery({
    queryKey: ["myComments", currentUserIdentity],
    queryFn: () => getMyCommentsApi({ page: 0, size: 100 }),
    enabled: isLoggedIn && Boolean(currentUserIdentity),
  });

  const myComments = myCommentsData?.content ?? [];

  const activityTabs: Array<{
    type: ActivityType;
    label: string;
    count: number;
    isLoading: boolean;
  }> = [
    { type: "POST", label: "작성한 게시글", count: myPosts.length, isLoading: isBoardLoading },
    { type: "COMMENT", label: "작성한 댓글", count: myComments.length, isLoading: isCommentsLoading },
    { type: "QNA", label: "질의응답", count: myQnas.length, isLoading: isMyQnasLoading },
  ];

  return (
    <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-4 sm:p-8 shadow-xs md:p-10">
      <div className="space-y-6">
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-[20px] font-bold text-[#123047]">내 활동</h2>
          <p className="text-[13px] sm:text-[14px] text-[#6B7280]">
            내가 작성한 게시글, 댓글 및 질의응답 현황을 확인하고 바로 이동할 수 있습니다.
          </p>
        </div>

        {/* 내 활동 서브 탭: 모바일에서는 3등분 그리드로 한눈에 표시 */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 pb-3 border-b border-[#DCE8ED]">
          {activityTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => selectActivityType(tab.type)}
              className={`${ACTIVITY_TAB_BASE_CLASS} ${
                activityType === tab.type
                  ? ACTIVITY_TAB_ACTIVE_CLASS
                  : ACTIVITY_TAB_INACTIVE_CLASS
              }`}
            >
              <span>{tab.label}</span>
              {isLoggedIn && !tab.isLoading && (
                <span className="hidden sm:inline ml-1 opacity-90">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* 실제 게시글/댓글 목록 리스트 */}
        <div className="border border-[#DCE8ED] rounded-[10px] divide-y divide-[#DCE8ED] bg-white overflow-hidden">
          {activityType === "POST" && (
            <>
              {isBoardLoading ? (
                <div className="p-12 text-center text-[#6B7280] text-[14px]">
                  내가 작성한 게시글을 불러오는 중입니다...
                </div>
              ) : isBoardError ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#123047]">
                    게시글 내역을 불러오지 못했습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    잠시 후 다시 시도해 주세요.
                  </p>
                </div>
              ) : myPosts.length > 0 ? (
                myPosts.map((post) => {
                  const formattedDate = post.createdAt?.includes("T")
                    ? `${post.createdAt.split("T")[0].replace(/-/g, ".")} ${post.createdAt.split("T")[1].slice(0, 5)}`
                    : post.createdAt;

                  return (
                    <Link
                      key={post.boardId}
                      to={`/board/${post.boardId}`}
                      className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold px-2 py-0.5 bg-[#E6F4F2] text-[#0F766E] rounded-full shrink-0 no-underline">
                            {post.postType === "NOTICE" ? "공지" : "일반"}
                          </span>
                          <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                            {post.title}
                          </strong>
                        </div>
                        <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                          작성일 {formattedDate} · 조회수 {post.viewCount}
                        </span>
                      </div>
                      <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                        ›
                      </b>
                    </Link>
                  );
                })
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="text-[32px]">📝</div>
                  <p className="text-[15px] font-bold text-[#123047]">
                    작성하신 게시글이 없습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    게시판에서 새로운 게시글을 작성해보세요!
                  </p>
                  <Link
                    to="/board/write"
                    className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                    style={{ textDecoration: "none" }}
                  >
                    새 게시글 작성하러 가기 →
                  </Link>
                </div>
              )}
            </>
          )}

          {activityType === "COMMENT" && (
            <>
              {isCommentsLoading ? (
                <div className="p-12 text-center text-[#6B7280] text-[14px]">
                  내가 작성한 댓글을 불러오는 중입니다...
                </div>
              ) : isCommentsError ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#123047]">
                    댓글 내역을 불러오지 못했습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    잠시 후 다시 시도해 주세요.
                  </p>
                </div>
              ) : myComments.length > 0 ? (
                myComments.map((comment) => {
                  const formattedDate = comment.createdAt?.includes("T")
                    ? `${comment.createdAt.split("T")[0].replace(/-/g, ".")} ${comment.createdAt.split("T")[1].slice(0, 5)}`
                    : comment.createdAt || "-";

                  return (
                    <Link
                      key={`${comment.postId}-${comment.id}`}
                      to={`/board/${comment.postId}`}
                      className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold px-2 py-0.5 bg-[#E6F4F2] text-[#0F766E] rounded-full shrink-0 no-underline">
                            댓글
                          </span>
                          <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                            {comment.content}
                          </strong>
                        </div>
                        <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                          원문 글: {comment.postTitle} · 작성일 {formattedDate}
                        </span>
                      </div>
                      <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                        ›
                      </b>
                    </Link>
                  );
                })
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="text-[32px]">💬</div>
                  <p className="text-[15px] font-bold text-[#123047]">
                    작성하신 댓글이 없습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    게시글을 읽고 자유롭게 댓글을 남겨보세요!
                  </p>
                  <Link
                    to="/board"
                    className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                    style={{ textDecoration: "none" }}
                  >
                    게시판 둘러보기 →
                  </Link>
                </div>
              )}
            </>
          )}

          {activityType === "QNA" && (
            <>
              {isMyQnasLoading ? (
                <div className="p-12 text-center text-[#6B7280] text-[14px]">
                  내가 작성한 질의응답을 불러오는 중입니다...
                </div>
              ) : isMyQnasError ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#123047]">
                    질의응답 내역을 불러오지 못했습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    잠시 후 다시 시도해 주세요.
                  </p>
                </div>
              ) : myQnas.length > 0 ? (
                myQnas.map((qna) => {
                  const isAnswered =
                    qna.answerStatus === "ANSWERED" || Boolean(qna.answeredAt);
                  const formattedDate = qna.createdAt?.includes("T")
                    ? qna.createdAt.split("T")[0].replace(/-/g, ".")
                    : qna.createdAt || "-";

                  return (
                    <Link
                      key={qna.id}
                      to={`/qna/${qna.id}`}
                      className="flex items-center justify-between p-5 hover:bg-[#F0F7FA] transition-colors group no-underline text-inherit"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          {!qna.publicQuestion && (
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] shrink-0">
                              비공개
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                              isAnswered
                                ? "border-[#BBE3C4] bg-[#EDF9F0] text-[#23813A]"
                                : "border-[#FAE3A8] bg-[#FFF8E6] text-[#B47500]"
                            }`}
                          >
                            {isAnswered ? "답변완료" : "답변대기"}
                          </span>
                          <strong className="text-[15px] font-bold text-[#123047] group-hover:text-[#0F8AA8] transition-colors block truncate no-underline">
                            {qna.title}
                          </strong>
                        </div>
                        <span className="text-[13px] text-[#6B7280] block mt-1.5 no-underline">
                          작성일 {formattedDate} · 조회수 {qna.viewCount}
                        </span>
                      </div>
                      <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                        ›
                      </b>
                    </Link>
                  );
                })
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="text-[32px]">❓</div>
                  <p className="text-[15px] font-bold text-[#123047]">
                    작성하신 질의응답이 없습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    서비스 이용 중 궁금한 점을 질문해보세요!
                  </p>
                  <Link
                    to="/qna/write"
                    className="inline-block px-5 py-2.5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white text-[13px] font-bold rounded-[8px] transition-colors shadow-xs no-underline"
                    style={{ textDecoration: "none" }}
                  >
                    질의응답 작성하러 가기 →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
