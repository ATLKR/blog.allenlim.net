export type Locale = "en" | "ko";
export const LOCALES: Locale[] = ["en", "ko"];

/** Resolve the UI locale: explicit cookie wins, else Accept-Language, else 'en'. */
export function resolveLocale(acceptLanguage: string | null | undefined, cookieLang: string | null | undefined): Locale {
	if (cookieLang === "en" || cookieLang === "ko") return cookieLang;
	if (acceptLanguage && /(^|,|\s)ko\b/i.test(acceptLanguage)) return "ko";
	return "en";
}

interface Strings {
	posts: string;
	notes: string;
	notesTagline: string;
	notesCount: (n: number) => string;
	noNotes: string;
	tags: string;
	topics: string;
	admin: string;
	login: string;
	search: string;
	searchPlaceholder: string;
	allPosts: string;
	categories: string;
	tagsHeading: string;
	postsCount: (n: number) => string;
	resultsFor: (n: number, q: string) => string;
	noPosts: string;
	popular: string;
	minRead: (n: number) => string;
	contents: string;
	related: string;
	comments: string;
	noComments: string;
	leaveComment: string;
	name: string;
	emailOptional: string;
	commentLabel: string;
	postComment: string;
	posting: string;
	posted: string;
	pending: string;
	commentsClosed: string;
	captchaIncomplete: string;
	commentingAs: string;
	reply: string;
	replyingTo: string;
	cancel: string;
	notFound: string;
	notFoundMsg: string;
	backHome: string;
	scheduledNote: (v: string) => string;
	readInKo: string;
	readInEn: string;
	langName: string;
}

const en: Strings = {
	posts: "Posts",
	notes: "Notes",
	notesTagline: "Short notes & memos.",
	notesCount: (n) => `${n} ${n === 1 ? "note" : "notes"}`,
	noNotes: "No notes yet.",
	tags: "Tags",
	topics: "Topics",
	admin: "Admin",
	login: "Log in",
	search: "Search",
	searchPlaceholder: "Search…",
	allPosts: "All Posts",
	categories: "Categories",
	tagsHeading: "Tags",
	postsCount: (n) => `${n} ${n === 1 ? "post" : "posts"}`,
	resultsFor: (n, q) => `${n} result${n === 1 ? "" : "s"} for “${q}”`,
	noPosts: "No posts published yet.",
	popular: "Popular",
	minRead: (n) => `${n} min read`,
	contents: "Contents",
	related: "Related",
	comments: "Comments",
	noComments: "No comments yet. Be the first.",
	leaveComment: "Leave a comment",
	name: "Name",
	emailOptional: "Email (optional, private)",
	commentLabel: "Comment",
	postComment: "Post comment",
	posting: "Posting…",
	posted: "Posted.",
	pending: "Thanks! Your comment will appear after review.",
	commentsClosed: "Comments are closed.",
	captchaIncomplete: "Please complete the captcha.",
	commentingAs: "Commenting as",
	reply: "Reply",
	replyingTo: "Replying to",
	cancel: "Cancel",
	notFound: "Page not found",
	notFoundMsg: "That page doesn't exist, or it's private.",
	backHome: "← Back home",
	scheduledNote: (v) => `This entry is ${v} — visible because you're logged in.`,
	readInKo: "한국어로 보기",
	readInEn: "Read in English",
	langName: "English",
};

const ko: Strings = {
	posts: "글",
	notes: "메모",
	notesTagline: "짧은 노트와 메모.",
	notesCount: (n) => `메모 ${n}개`,
	noNotes: "아직 메모가 없습니다.",
	tags: "태그",
	topics: "주제",
	admin: "관리",
	login: "로그인",
	search: "검색",
	searchPlaceholder: "검색…",
	allPosts: "전체 글",
	categories: "카테고리",
	tagsHeading: "태그",
	postsCount: (n) => `글 ${n}개`,
	resultsFor: (n, q) => `“${q}” 검색 결과 ${n}개`,
	noPosts: "아직 발행된 글이 없습니다.",
	popular: "인기 글",
	minRead: (n) => `${n}분 읽기`,
	contents: "목차",
	related: "관련 글",
	comments: "댓글",
	noComments: "아직 댓글이 없습니다. 첫 댓글을 남겨보세요.",
	leaveComment: "댓글 남기기",
	name: "이름",
	emailOptional: "이메일 (선택, 비공개)",
	commentLabel: "댓글",
	postComment: "댓글 등록",
	posting: "등록 중…",
	posted: "등록되었습니다.",
	pending: "감사합니다! 검토 후 게시됩니다.",
	commentsClosed: "댓글이 닫혀 있습니다.",
	captchaIncomplete: "캡차를 완료해 주세요.",
	commentingAs: "작성자",
	reply: "답글",
	replyingTo: "답글 대상",
	cancel: "취소",
	notFound: "페이지를 찾을 수 없습니다",
	notFoundMsg: "존재하지 않거나 비공개 페이지입니다.",
	backHome: "← 홈으로",
	scheduledNote: (v) => `이 글은 ${v} 상태입니다 — 로그인 상태라 보입니다.`,
	readInKo: "한국어로 보기",
	readInEn: "Read in English",
	langName: "한국어",
};

const DICT: Record<Locale, Strings> = { en, ko };
export const t = (locale: Locale): Strings => DICT[locale] ?? en;
