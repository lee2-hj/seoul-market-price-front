import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  getBoardCommentsApi,
  getBoardPostsApi,
  type QnaPageResponse,
} from "@/api/api";
import apiMiddleware from "@/api/middleware";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

type ActivityType = "POST" | "COMMENT" | "QNA";

const ACTIVITY_TAB_BASE_CLASS =
  "h-[38px] px-4 rounded-[8px] border font-bold text-[14px] cursor-pointer shrink-0";
const ACTIVITY_TAB_ACTIVE_CLASS = "bg-[#0F8AA8] border-[#0F8AA8] text-white";
const ACTIVITY_TAB_INACTIVE_CLASS =
  "bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA]";

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
  const [activityType, setActivityType] = useState<ActivityType>("POST");
  const currentUserIdentity = normalizeIdentity(authUser?.userId);

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

  // 내가 작성한 댓글 조회 & 필터링
  const [myComments, setMyComments] = useState<
    Array<{
      commentId: number;
      boardId: number;
      boardTitle: string;
      content: string;
      createdAt: string;
    }>
  >([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentRequestFailureCount, setCommentRequestFailureCount] = useState(0);
  const [commentsLoadedForUser, setCommentsLoadedForUser] = useState("");
  const commentsRequestUserRef = useRef("");
  const commentsStateUserRef = useRef(currentUserIdentity);
  const isComponentMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (commentsStateUserRef.current === currentUserIdentity) return;

    commentsStateUserRef.current = currentUserIdentity;
    commentsRequestUserRef.current = "";
    queueMicrotask(() => {
      if (!isComponentMountedRef.current) return;
      setMyComments([]);
      setIsCommentsLoading(false);
      setCommentRequestFailureCount(0);
      setCommentsLoadedForUser("");
    });
  }, [currentUserIdentity]);

  useEffect(() => {
    if (
      activityType !== "COMMENT" ||
      !isLoggedIn ||
      !authUser ||
      !currentUserIdentity ||
      commentsLoadedForUser === currentUserIdentity ||
      commentsRequestUserRef.current === currentUserIdentity
    ) {
      return;
    }

    if (!boardData?.items) return;

    if (boardData.items.length === 0) {
      commentsRequestUserRef.current = currentUserIdentity;
      queueMicrotask(() => {
        if (!isComponentMountedRef.current) return;
        setMyComments([]);
        setIsCommentsLoading(false);
        setCommentRequestFailureCount(0);
        setCommentsLoadedForUser(currentUserIdentity);
        commentsRequestUserRef.current = "";
      });
      return;
    }

    commentsRequestUserRef.current = currentUserIdentity;
    queueMicrotask(() => {
      if (isComponentMountedRef.current) setIsCommentsLoading(true);
    });

    const currentName = normalizeIdentity(authUser.name);
    const currentId = normalizeIdentity(authUser.userId);

    // 상위 최근 게시글들에 대해 댓글을 병렬 조회하여 내가 작성한 댓글 추출
    Promise.all(
      boardData.items.slice(0, 30).map(async (post) => {
        try {
          const comments = await getBoardCommentsApi(post.boardId);
          if (!Array.isArray(comments)) return { comments: [], failed: false };

          const matchedComments = comments
            .filter((c) => {
              const cAuthorName = normalizeIdentity(c.writerName || c.name);
              const cAuthorId = normalizeIdentity(String(c.writerId || ""));

              return (
                (currentId && cAuthorId === currentId) ||
                (currentName && cAuthorName === currentName) ||
                (currentId && cAuthorName === currentId)
              );
            })
            .map((c) => ({
              commentId: c.id || 0,
              boardId: post.boardId,
              boardTitle: post.title,
              content: c.content || "",
              createdAt: c.createdAt || "",
            }));
          return { comments: matchedComments, failed: false };
        } catch {
          return { comments: [], failed: true };
        }
      })
    )
      .then((results) => {
        if (
          isComponentMountedRef.current &&
          commentsStateUserRef.current === currentUserIdentity
        ) {
          const flat = results
            .flatMap((result) => result.comments)
            .sort((a, b) => (b.commentId || 0) - (a.commentId || 0));
          setMyComments(flat);
          setCommentRequestFailureCount(
            results.filter((result) => result.failed).length,
          );
          setIsCommentsLoading(false);
          setCommentsLoadedForUser(currentUserIdentity);
        }
        if (commentsRequestUserRef.current === currentUserIdentity) {
          commentsRequestUserRef.current = "";
        }
      })
      .catch(() => {
        if (
          isComponentMountedRef.current &&
          commentsStateUserRef.current === currentUserIdentity
        ) {
          setCommentRequestFailureCount(boardData.items.slice(0, 30).length);
          setIsCommentsLoading(false);
          setCommentsLoadedForUser(currentUserIdentity);
        }
        if (commentsRequestUserRef.current === currentUserIdentity) {
          commentsRequestUserRef.current = "";
        }
      });
  }, [
    activityType,
    isLoggedIn,
    authUser,
    currentUserIdentity,
    commentsLoadedForUser,
    boardData,
  ]);

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
    <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-8 shadow-xs md:p-10">
      <div className="space-y-6">
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-[20px] font-bold text-[#123047]">내 활동</h2>
          <p className="text-[14px] text-[#6B7280]">
            내가 작성한 게시글, 댓글 및 질의응답 현황을 확인하고 바로 이동할 수 있습니다.
          </p>
        </div>

        {/* 내 활동 서브 탭 */}
        <div className="flex items-center gap-2 pb-3 border-b border-[#DCE8ED] overflow-x-auto">
          {activityTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActivityType(tab.type)}
              className={`${ACTIVITY_TAB_BASE_CLASS} ${
                activityType === tab.type
                  ? ACTIVITY_TAB_ACTIVE_CLASS
                  : ACTIVITY_TAB_INACTIVE_CLASS
              }`}
            >
              {tab.label}{" "}
              {isLoggedIn &&
                !tab.isLoading &&
                (tab.type !== "COMMENT" ||
                  commentsLoadedForUser === currentUserIdentity) &&
                `(${tab.count})`}
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
              ) : isBoardError ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#123047]">
                    댓글 내역을 불러오지 못했습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    게시글 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.
                  </p>
                </div>
              ) : commentRequestFailureCount > 0 &&
                commentRequestFailureCount ===
                  Math.min(boardData?.items.length ?? 0, 30) ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#123047]">
                    댓글 내역을 불러오지 못했습니다.
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    잠시 후 다시 시도해 주세요.
                  </p>
                </div>
              ) : myComments.length > 0 ? (
                <>
                  {commentRequestFailureCount > 0 && (
                    <div className="bg-[#FFF8E6] px-5 py-3 text-[13px] text-[#B47500]">
                      일부 댓글을 불러오지 못했습니다. 표시된 내역은 정상적으로 조회된 결과입니다.
                    </div>
                  )}
                  {myComments.map((comment) => {
                    const formattedDate = comment.createdAt?.includes("T")
                      ? `${comment.createdAt.split("T")[0].replace(/-/g, ".")} ${comment.createdAt.split("T")[1].slice(0, 5)}`
                      : comment.createdAt || "-";

                    return (
                      <Link
                        key={`${comment.boardId}-${comment.commentId}`}
                        to={`/board/${comment.boardId}`}
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
                            원문 글: {comment.boardTitle} · 작성일 {formattedDate}
                          </span>
                        </div>
                        <b aria-hidden="true" className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline">
                          ›
                        </b>
                      </Link>
                    );
                  })}
                </>
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
