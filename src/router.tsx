import {
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

/**
 * Bộ định tuyến History API tối giản (không phụ thuộc thư viện).
 * Mỗi trang có đường dẫn riêng: /overview, /menus, /vision, /log/manual, /data/records, /project…
 * Máy chủ phải trả index.html cho các đường dẫn này (xem vercel.json, scripts/serve.mjs).
 */
export const PAGES = ["overview", "menus", "vision", "log", "data", "project"] as const;
export type Page = (typeof PAGES)[number];

/** Trang con (tab phụ) của từng trang; phần tử đầu tiên là mặc định. */
export const SUBPAGES = {
  log: ["manual", "nfc", "calibration"],
  data: ["records", "interventions", "settings"],
} as const satisfies Partial<Record<Page, readonly string[]>>;

export const pageTitles: Record<Page, string> = {
  overview: "Tổng quan",
  menus: "Phân tích thực đơn",
  vision: "EcoTray Vision",
  log: "Ghi nhận khay",
  data: "Dữ liệu & cấu hình",
  project: "Thông tin dự án",
};

export type Route = { page: Page; sub: string | null; path: string };

const isPage = (value: string): value is Page =>
  (PAGES as readonly string[]).includes(value);

/** Chuẩn hóa mọi đường dẫn thành một Route hợp lệ; đường dẫn lạ quay về Tổng quan. */
export function parsePath(pathname: string): Route {
  const [first = "", second = ""] = pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);
  // Liên kết cũ: Dữ liệu → Thông tin dự án.
  if (first === "data" && second === "project")
    return { page: "project", sub: null, path: "/project" };
  const page: Page = isPage(first) ? first : "overview";
  const subs = (SUBPAGES as Partial<Record<Page, readonly string[]>>)[page];
  const sub = subs ? (subs.includes(second) ? second : subs[0]) : null;
  return { page, sub, path: sub ? `/${page}/${sub}` : `/${page}` };
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
if (typeof window !== "undefined") window.addEventListener("popstate", notify);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Đưa URL đang mở về dạng chuẩn (ví dụ "/" → "/overview") mà không thêm lịch sử. */
export function canonicalizeLocation() {
  const route = parsePath(window.location.pathname);
  if (route.path !== window.location.pathname)
    window.history.replaceState(
      null,
      "",
      route.path + window.location.search + window.location.hash,
    );
}

let lastWorkspace = "/overview";
/** Ghi nhớ trang làm việc gần nhất để trang Thông tin dự án quay lại đúng chỗ. */
export const rememberWorkspace = (path: string) => void (lastWorkspace = path);
export const workspacePath = () => lastWorkspace;
export const isProjectPath = () => parsePath(window.location.pathname).page === "project";

export function navigate(to: string, replace = false) {
  const { path } = parsePath(to);
  if (window.location.pathname !== path)
    window.history[replace ? "replaceState" : "pushState"](null, "", path);
  notify();
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => "/",
  );
  return useMemo(() => parsePath(pathname), [pathname]);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  onNavigate?: () => void;
};

/** Thẻ <a> thật (mở tab mới, sao chép liên kết được) nhưng chuyển trang không tải lại. */
export function Link({ to, onNavigate, onClick, ...rest }: LinkProps) {
  return (
    <a
      {...rest}
      href={parsePath(to).path}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          (rest.target && rest.target !== "_self")
        )
          return;
        event.preventDefault();
        onNavigate?.();
        navigate(to);
      }}
    />
  );
}
