import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Edit2, Paperclip, Search } from "lucide-react";

import {
  downloadBoardAttachmentApi,
  downloadQnaAttachmentApi,
  getBoardAttachmentsApi,
  getMyBoardPostsApi,
  getMyCommentsApi,
  getMyQnasApi,
  getQnaAttachmentsApi,
  type MyBoardPostResponse,
  type QnaListResponse,
} from "@/api/api";
import { isLogin } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { toBoardAttachmentView } from "@/features/board/utils/boardMappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ActivityType = "POST" | "COMMENT" | "QNA";

const ACTIVITY_TAB_BASE_CLASS =
  "h-[40px] px-1.5 sm:px-4 rounded-[8px] border font-bold text-[12.5px] sm:text-[14px] cursor-pointer flex items-center justify-center text-center transition-all whitespace-nowrap";
const ACTIVITY_TAB_ACTIVE_CLASS = "bg-[#0F8AA8] border-[#0F8AA8] text-white shadow-xs";
const ACTIVITY_TAB_INACTIVE_CLASS =
  "bg-white border-[#DCE8ED] text-[#6B7280] hover:bg-[#F0F7FA]";
const MY_ACTIVITY_TAB_KEY_PREFIX = "mypage_activity_tab_";
const PAGE_SIZE = 10;
const PAGE_WINDOW_SIZE = 5;

const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

/** 0-based 현재 페이지 기준으로 페이지네이션에 표시할 1-based 페이지 번호 목록을 계산한다. */
function getPageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const currentPage = page + 1;
  const currentGroup = Math.ceil(currentPage / PAGE_WINDOW_SIZE);
  const startPage = (currentGroup - 1) * PAGE_WINDOW_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_WINDOW_SIZE - 1, totalPages);
  return Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, i) => startPage + i,
  );
}

interface ActivityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

function ActivityPagination({ page, totalPages, onPageChange }: ActivityPaginationProps) {
  const pageNumbers = useMemo(() => getPageWindow(page, totalPages), [page, totalPages]);
  if (totalPages <= 1) return null;

  return (
    <Pagination className="pt-5 pb-1">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page <= 0}
          />
        </PaginationItem>
        {pageNumbers.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink isActive={p === page + 1} onClick={() => onPageChange(p - 1)}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

interface ActivitySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}

function ActivitySearchBar({ value, onChange, onSubmit, placeholder }: ActivitySearchBarProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="h-[42px] flex-1 rounded-[8px] border-[#DCE8ED] text-[14px]"
      />
      <Button
        type="button"
        onClick={onSubmit}
        className="h-[42px] shrink-0 gap-1.5 rounded-lg bg-[#0F8AA8] px-5 font-bold text-white hover:bg-[#0D748E]"
      >
        <Search className="size-4" aria-hidden="true" />
        검색
      </Button>
    </div>
  );
}

function MyPostItem({ post }: { post: MyBoardPostResponse }) {
  const formattedDate = post.createdAt?.includes("T")
    ? `${post.createdAt.split("T")[0].replace(/-/g, ".")} ${post.createdAt.split("T")[1].slice(0, 5)}`
    : post.createdAt;

  const { data: attachments = [] } = useQuery({
    queryKey: ["boardAttachments", post.boardId],
    queryFn: () => getBoardAttachmentsApi(post.boardId),
    staleTime: 1000 * 60 * 5,
  });

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (
    e: React.MouseEvent,
    attachmentId: number,
    originalFilename: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloadingId(attachmentId);
      const res = await downloadBoardAttachmentApi(post.boardId, attachmentId);
      const targetUrl = res?.url || res?.downloadUrl;
      if (targetUrl) {
        const a = document.createElement("a");
        a.href = targetUrl;
        a.download =
          res?.originalFilename || res?.fileName || originalFilename || "download";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("다운로드할 수 있는 파일 경로를 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("다운로드 실패:", err);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-5 hover:bg-[#F0F7FA]/70 transition-colors group">
      <div className="flex items-center justify-between">
        <Link
          to={`/board/${post.boardId}`}
          className="min-w-0 pr-4 flex-1 no-underline text-inherit block"
          style={{ textDecoration: "none", color: "inherit" }}
        >
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
        </Link>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Link
            to={`/board/${post.boardId}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#EBF5F8] hover:bg-[#0F8AA8] text-[#0F8AA8] hover:text-white text-[12px] font-bold transition-colors no-underline shadow-2xs border border-[#7CC9D8]/50"
            style={{ textDecoration: "none" }}
            title="게시글 수정"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>수정</span>
          </Link>
          <Link
            to={`/board/${post.boardId}`}
            className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline p-1"
            style={{ textDecoration: "none" }}
            aria-label="게시글 상세 이동"
          >
            ›
          </Link>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E8EFF2] flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0F8AA8] shrink-0 mr-1">
            <Paperclip className="w-3.5 h-3.5" />
            <span>첨부파일 ({attachments.length})</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {attachments.map((file, idx) => {
              const attachment = toBoardAttachmentView(file, idx);
              const isDownloading = downloadingId === attachment.id;
              return (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={(e) =>
                    handleDownload(e, attachment.id, attachment.name)
                  }
                  disabled={isDownloading}
                  title={`${attachment.name} 다운로드`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#EBF5F8] border border-[#DCE8ED] hover:border-[#0F8AA8] text-[#123047] hover:text-[#0F8AA8] text-[12px] font-medium rounded-[6px] transition-all cursor-pointer max-w-full truncate shadow-2xs"
                >
                  <Download className="w-3 h-3 text-[#0F8AA8] shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">
                    {attachment.name}
                  </span>
                  {attachment.size > 0 && (
                    <span className="text-[11px] text-[#6B7280] shrink-0">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                  {isDownloading && (
                    <span className="text-[10px] text-[#0F8AA8] animate-pulse">
                      ...
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MyQnaItem({ qna }: { qna: QnaListResponse }) {
  const isAnswered =
    qna.answerStatus === "ANSWERED" || Boolean(qna.answeredAt);
  const formattedDate = qna.createdAt?.includes("T")
    ? qna.createdAt.split("T")[0].replace(/-/g, ".")
    : qna.createdAt || "-";

  const { data: attachments = [] } = useQuery({
    queryKey: ["qnaAttachments", qna.id],
    queryFn: () => getQnaAttachmentsApi(qna.id),
    staleTime: 1000 * 60 * 5,
  });

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (
    e: React.MouseEvent,
    attachmentId: number,
    originalFilename: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloadingId(attachmentId);
      const res = await downloadQnaAttachmentApi(qna.id, attachmentId);
      const targetUrl = res?.url || res?.downloadUrl;
      if (targetUrl) {
        const a = document.createElement("a");
        a.href = targetUrl;
        a.download =
          res?.originalFilename || res?.fileName || originalFilename || "download";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("다운로드할 수 있는 파일 경로를 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("다운로드 실패:", err);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-5 hover:bg-[#F0F7FA]/70 transition-colors group">
      <div className="flex items-center justify-between">
        <Link
          to={`/qna/${qna.id}`}
          className="min-w-0 pr-4 flex-1 no-underline text-inherit block"
          style={{ textDecoration: "none", color: "inherit" }}
        >
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
        </Link>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Link
            to={`/qna/edit/${qna.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#EBF5F8] hover:bg-[#0F8AA8] text-[#0F8AA8] hover:text-white text-[12px] font-bold transition-colors no-underline shadow-2xs border border-[#7CC9D8]/50"
            style={{ textDecoration: "none" }}
            title="질의응답 수정"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>수정</span>
          </Link>
          <Link
            to={`/qna/${qna.id}`}
            className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline p-1"
            style={{ textDecoration: "none" }}
            aria-label="질의응답 상세 이동"
          >
            ›
          </Link>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E8EFF2] flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0F8AA8] shrink-0 mr-1">
            <Paperclip className="w-3.5 h-3.5" />
            <span>첨부파일 ({attachments.length})</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {attachments.map((file, idx) => {
              const attId = Number(file.attachmentId ?? file.id ?? idx + 1);
              const attName =
                file.originalName ||
                file.originalFilename ||
                file.fileName ||
                "첨부파일";
              const attSize = file.size ?? file.fileSize ?? 0;
              const isDownloading = downloadingId === attId;
              return (
                <button
                  key={attId}
                  type="button"
                  onClick={(e) => handleDownload(e, attId, attName)}
                  disabled={isDownloading}
                  title={`${attName} 다운로드`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#EBF5F8] border border-[#DCE8ED] hover:border-[#0F8AA8] text-[#123047] hover:text-[#0F8AA8] text-[12px] font-medium rounded-[6px] transition-all cursor-pointer max-w-full truncate shadow-2xs"
                >
                  <Download className="w-3 h-3 text-[#0F8AA8] shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">
                    {attName}
                  </span>
                  {attSize > 0 && (
                    <span className="text-[11px] text-[#6B7280] shrink-0">
                      ({(attSize / 1024).toFixed(1)} KB)
                    </span>
                  )}
                  {isDownloading && (
                    <span className="text-[10px] text-[#0F8AA8] animate-pulse">
                      ...
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
    const nextType: ActivityType =
      savedType === "COMMENT" || savedType === "QNA" ? savedType : "POST";
    queueMicrotask(() => setActivityType(nextType));
  }, [activityTabKey]);

  const selectActivityType = (nextType: ActivityType) => {
    setActivityType(nextType);
    sessionStorage.setItem(activityTabKey, nextType);
  };

  // 게시글 탭: 검색어(keyword) + 페이지 상태 (GET /api/boards/me)
  const [postPage, setPostPage] = useState(0);
  const [postKeywordInput, setPostKeywordInput] = useState("");
  const [postKeyword, setPostKeyword] = useState("");
  const submitPostSearch = () => {
    setPostKeyword(postKeywordInput.trim());
    setPostPage(0);
  };

  const {
    data: boardData,
    isLoading: isBoardLoading,
    isError: isBoardError,
  } = useQuery({
    queryKey: ["myBoardPosts", { userId: currentUserIdentity, page: postPage, keyword: postKeyword }],
    queryFn: () => getMyBoardPostsApi({ page: postPage, size: PAGE_SIZE, keyword: postKeyword || undefined }),
    // 3개 탭 데이터를 항상 동시에 불러오지 않고, 현재 보고 있는 탭만 호출한다.
    enabled: isLoggedIn && activityType === "POST",
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const myPosts = boardData?.content ?? [];

  // QnA 탭: 검색어(keyword) + 페이지 상태 (GET /api/qnas/me)
  const [qnaPage, setQnaPage] = useState(0);
  const [qnaKeywordInput, setQnaKeywordInput] = useState("");
  const [qnaKeyword, setQnaKeyword] = useState("");
  const submitQnaSearch = () => {
    setQnaKeyword(qnaKeywordInput.trim());
    setQnaPage(0);
  };

  const {
    data: myQnaData,
    isLoading: isMyQnasLoading,
    isError: isMyQnasError,
  } = useQuery({
    queryKey: ["myQnas", { userId: currentUserIdentity, page: qnaPage, keyword: qnaKeyword }],
    queryFn: () => getMyQnasApi({ page: qnaPage, size: PAGE_SIZE, keyword: qnaKeyword || undefined }),
    enabled: isLoggedIn && activityType === "QNA",
  });

  const myQnas = myQnaData?.content ?? [];

  // 댓글 탭: 페이지 상태만 사용한다.
  // 백엔드 MyCommentSearchCondition에 keyword 필드가 없어 댓글 내 검색은 지원되지 않는다.
  const [commentPage, setCommentPage] = useState(0);

  const {
    data: myCommentsData,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
  } = useQuery({
    queryKey: ["myComments", { userId: currentUserIdentity, page: commentPage }],
    queryFn: () => getMyCommentsApi({ page: commentPage, size: PAGE_SIZE }),
    enabled: isLoggedIn && Boolean(currentUserIdentity) && activityType === "COMMENT",
  });

  const myComments = myCommentsData?.content ?? [];

  const activityTabs: Array<{
    type: ActivityType;
    label: string;
    count: number;
    // 아직 한 번도 불러오지 않은(= 아직 방문하지 않은) 탭은 카운트를 알 수 없으므로
    // "0건"처럼 잘못된 숫자를 보여주지 않고 배지 자체를 숨긴다.
    hasLoaded: boolean;
  }> = [
    {
      type: "POST",
      label: "작성한 게시글",
      count: boardData?.totalElements ?? 0,
      hasLoaded: boardData !== undefined,
    },
    {
      type: "COMMENT",
      label: "작성한 댓글",
      count: myCommentsData?.totalElements ?? 0,
      hasLoaded: myCommentsData !== undefined,
    },
    {
      type: "QNA",
      label: "질의응답",
      count: myQnaData?.totalElements ?? 0,
      hasLoaded: myQnaData !== undefined,
    },
  ];

  return (
    <div className="rounded-[12px] border border-[#DCE8ED] bg-white p-4 sm:p-8 shadow-xs md:p-10">
      <div className="space-y-6">
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-[20px] font-bold text-[#123047]">내 활동</h2>
          <p className="text-[13px] sm:text-[14px] text-[#6B7280]">
            내가 작성한 게시글, 댓글 및 질의응답 현황을 확인하고 첨부파일을 바로 다운로드하거나 상세 페이지로 이동할 수 있습니다.
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
              {isLoggedIn && tab.hasLoaded && (
                <span className="hidden sm:inline ml-1 opacity-90">
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {activityType === "POST" && (
          <ActivitySearchBar
            value={postKeywordInput}
            onChange={setPostKeywordInput}
            onSubmit={submitPostSearch}
            placeholder="제목 또는 내용으로 검색"
          />
        )}
        {activityType === "QNA" && (
          <ActivitySearchBar
            value={qnaKeywordInput}
            onChange={setQnaKeywordInput}
            onSubmit={submitQnaSearch}
            placeholder="질문 제목으로 검색"
          />
        )}

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
                myPosts.map((post) => (
                  <MyPostItem key={post.boardId} post={post} />
                ))
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="text-[32px]">📝</div>
                  <p className="text-[15px] font-bold text-[#123047]">
                    {postKeyword ? "검색 결과가 없습니다." : "작성하신 게시글이 없습니다."}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    게시판에서 새로운 게시글을 작성해보세요!
                  </p>
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
                      <b
                        aria-hidden="true"
                        className="text-[#0F8AA8] text-[24px] font-normal leading-none shrink-0 group-hover:translate-x-1 transition-transform no-underline"
                      >
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
                myQnas.map((qna) => (
                  <MyQnaItem key={qna.id} qna={qna} />
                ))
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="text-[32px]">❓</div>
                  <p className="text-[15px] font-bold text-[#123047]">
                    {qnaKeyword ? "검색 결과가 없습니다." : "작성하신 질의응답이 없습니다."}
                  </p>
                  <p className="text-[13px] text-[#6B7280]">
                    서비스 이용 중 궁금한 점을 질문해보세요!
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {activityType === "POST" && (
          <ActivityPagination
            page={postPage}
            totalPages={boardData?.totalPages ?? 0}
            onPageChange={setPostPage}
          />
        )}
        {activityType === "COMMENT" && (
          <ActivityPagination
            page={commentPage}
            totalPages={myCommentsData?.totalPages ?? 0}
            onPageChange={setCommentPage}
          />
        )}
        {activityType === "QNA" && (
          <ActivityPagination
            page={qnaPage}
            totalPages={myQnaData?.totalPages ?? 0}
            onPageChange={setQnaPage}
          />
        )}
      </div>
    </div>
  );
}
