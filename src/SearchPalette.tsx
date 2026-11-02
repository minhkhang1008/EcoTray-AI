import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import Icon, { type IconName } from "./Icon";

export type SearchDishItem = {
  menu: string;
  count: number;
  mean: number | null;
  vegetables?: { mean: number | null; n: number };
};

export type SystemFeature = {
  id: string;
  title: string;
  category: "Trang chính" | "Ghi nhận" | "Dữ liệu" | "Cấu hình" | "Thao tác" | "Trợ giúp" | "Tài khoản";
  badge: "Trang" | "Chức năng" | "Thao tác" | "Trợ giúp";
  description: string;
  keywords: string[];
  icon: IconName;
  action: () => void;
};

export type SearchPaletteProps = {
  search: string;
  onSearch: (value: string) => void;
  onSubmit: () => void;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onSelectLogView?: (view: string) => void;
  onSelectDataView?: (view: string) => void;
  onSelectDish?: (dish: string) => void;
  onExportCSV?: () => void;
  onLogout?: () => void;
  allDishes?: SearchDishItem[];
};

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

export function SearchPalette({
  search,
  onSearch,
  onSubmit,
  currentTab = "overview",
  onSelectTab,
  onSelectLogView,
  onSelectDataView,
  onSelectDish,
  onExportCSV,
  onLogout,
  allDishes = [],
}: SearchPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState(search);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external search state
  useEffect(() => {
    setQuery(search);
  }, [search]);

  // Global shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsExpanded(true);
        setDropdownOpen(true);
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to collapse
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCollapse = () => {
    setIsExpanded(false);
    setDropdownOpen(false);
    setQuery("");
    onSearch("");
    setActiveIndex(0);
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setDropdownOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  // Catalog of searchable system features
  const systemFeatures: SystemFeature[] = useMemo(() => [
    {
      id: "overview",
      title: "Tổng quan căn tin",
      category: "Trang chính",
      badge: "Trang",
      description: "Xem tỷ lệ lãng phí, chỉ số cốt lõi và cảnh báo căn tin",
      keywords: ["tong quan", "dashboard", "trang chu", "home", "chi so", "bao cao", "bieu do", "ty le", "phan con lai"],
      icon: "overview",
      action: () => {
        onSelectTab?.("overview");
        handleCollapse();
      },
    },
    {
      id: "menu",
      title: "Thực đơn: Lịch thực đơn",
      category: "Trang chính",
      badge: "Trang",
      description: "Lịch thực đơn hằng ngày, chi tiết các món ăn trong tháng",
      keywords: ["menu", "thuc don", "lich", "lich an", "mon an", "calendar", "ngay an", "thang"],
      icon: "calendar",
      action: () => {
        onSelectTab?.("menu");
        handleCollapse();
      },
    },
    {
      id: "menus",
      title: "Thực đơn: Thống kê",
      category: "Trang chính",
      badge: "Trang",
      description: "Thống kê phần còn lại theo từng món ăn và nhóm thành phần",
      keywords: ["thong ke", "bang", "thuc don", "mon an", "hao hut", "lang phi", "rau", "com", "mon chinh", "canh", "uu tien"],
      icon: "data",
      action: () => {
        onSelectTab?.("menus");
        handleCollapse();
      },
    },
    {
      id: "analysis",
      title: "Thực đơn: Phân tích",
      category: "Trang chính",
      badge: "Trang",
      description: "So sánh món, xu hướng theo ngày, nhận định và gợi ý cho bếp",
      keywords: ["phan tich", "bieu do", "xu huong", "so sanh", "nhan dinh", "goi y", "chart"],
      icon: "chart",
      action: () => {
        onSelectTab?.("analysis");
        handleCollapse();
      },
    },
    {
      id: "vision",
      title: "EcoTray Vision (Camera AI ESP32)",
      category: "Trang chính",
      badge: "Trang",
      description: "Nhận diện phần còn lại bằng mô hình AI trực tiếp từ camera",
      keywords: ["vision", "camera", "ai", "esp32", "esp32-cam", "nhan dien", "khay an", "thi giac may tinh", "chup anh"],
      icon: "vision",
      action: () => {
        onSelectTab?.("vision");
        handleCollapse();
      },
    },
    {
      id: "log",
      title: "Trạm ghi nhận khay ăn",
      category: "Trang chính",
      badge: "Trang",
      description: "Ghi nhận khay qua NFC, cân đối chứng hoặc nhập thủ công",
      keywords: ["ghi nhan", "nhap khay", "nhap lieu", "quet", "can", "log", "tram ghi nhan"],
      icon: "log",
      action: () => {
        onSelectTab?.("log");
        handleCollapse();
      },
    },
    {
      id: "log-nfc",
      title: "Cổng quét thẻ NFC",
      category: "Ghi nhận",
      badge: "Chức năng",
      description: "Quản lý cổng quét thẻ NFC nhận suất ăn của học sinh",
      keywords: ["nfc", "quet the", "the hoc sinh", "tram nfc", "suat an", "quet the nhan suat", "cong nfc"],
      icon: "play",
      action: () => {
        onSelectTab?.("log");
        onSelectLogView?.("nfc");
        handleCollapse();
      },
    },
    {
      id: "log-calibration",
      title: "Cân mẫu đối chứng (Calibration)",
      category: "Ghi nhận",
      badge: "Chức năng",
      description: "Hiệu chuẩn khối lượng gram với khay mẫu thực tế",
      keywords: ["can mau", "can doi chung", "calibration", "khoi luong", "gram", "do luong", "hieu chuan"],
      icon: "plus",
      action: () => {
        onSelectTab?.("log");
        onSelectLogView?.("calibration");
        handleCollapse();
      },
    },
    {
      id: "log-manual",
      title: "Ghi nhận khay thủ công",
      category: "Ghi nhận",
      badge: "Chức năng",
      description: "Nhập tỷ lệ hao hụt của từng phần cơm, rau, món chính, canh",
      keywords: ["thu cong", "nhap tay", "ghi nhan thu cong", "nhap suat an", "tao ban ghi"],
      icon: "plus",
      action: () => {
        onSelectTab?.("log");
        onSelectLogView?.("manual");
        handleCollapse();
      },
    },
    {
      id: "data-records",
      title: "Bản ghi khay (Dữ liệu chi tiết)",
      category: "Dữ liệu",
      badge: "Chức năng",
      description: "Xem và lọc bảng dữ liệu tất cả các lượt khay đã ghi nhận",
      keywords: ["ban ghi", "records", "du lieu", "danh sach khay", "bang du lieu", "lich su"],
      icon: "data",
      action: () => {
        onSelectTab?.("data");
        onSelectDataView?.("records");
        handleCollapse();
      },
    },
    {
      id: "data-interventions",
      title: "Lịch sử quyết định & Can thiệp",
      category: "Dữ liệu",
      badge: "Chức năng",
      description: "Xem nhật ký các hành động can thiệp giảm lãng phí căn tin",
      keywords: ["quyet dinh", "can thiep", "interventions", "dieu chinh", "khau phan", "lich su quyet dinh"],
      icon: "leaf",
      action: () => {
        onSelectTab?.("data");
        onSelectDataView?.("interventions");
        handleCollapse();
      },
    },
    {
      id: "data-settings",
      title: "Cấu hình trường & Thiết bị IoT",
      category: "Cấu hình",
      badge: "Chức năng",
      description: "Thiết lập thông tin trường, kết nối IoT và thông số căn tin",
      keywords: ["cau hinh truong", "settings", "thiet bi", "iot", "tram", "camera", "nfc", "cai dat"],
      icon: "data",
      action: () => {
        onSelectTab?.("data");
        onSelectDataView?.("settings");
        handleCollapse();
      },
    },
    {
      id: "data-thresholds",
      title: "Cấu hình ngưỡng ưu tiên",
      category: "Cấu hình",
      badge: "Chức năng",
      description: "Đặt ngưỡng Cao, Trung bình và số quan sát tối thiểu",
      keywords: ["cau hinh nguong", "nguong", "uu tien", "tieu chi", "thresholds", "cao", "trung binh"],
      icon: "data",
      action: () => {
        onSelectTab?.("data");
        onSelectDataView?.("thresholds");
        handleCollapse();
      },
    },
    {
      id: "data-project",
      title: "Phương pháp & Trợ giúp kỹ thuật",
      category: "Trợ giúp",
      badge: "Trợ giúp",
      description: "Xem tài liệu phương pháp đo lường, công thức và trợ giúp",
      keywords: ["phuong phap", "tro giup", "huong dan", "help", "du an", "cong thuc", "tai lieu"],
      icon: "help",
      action: () => {
        onSelectTab?.("data");
        onSelectDataView?.("project");
        handleCollapse();
      },
    },
    {
      id: "export-csv",
      title: "Xuất dữ liệu báo cáo (CSV)",
      category: "Thao tác",
      badge: "Thao tác",
      description: "Tải xuống toàn bộ bảng dữ liệu khay dưới dạng file CSV",
      keywords: ["xuat csv", "export", "tai csv", "download", "excel", "xuat du lieu", "bao cao"],
      icon: "download",
      action: () => {
        onExportCSV?.();
        handleCollapse();
      },
    },
    {
      id: "filter-priority",
      title: "Lọc món cần xem lại (Rau > 20%)",
      category: "Thao tác",
      badge: "Thao tác",
      description: "Xem danh sách các món có tỷ lệ dư thừa rau cao cần điều chỉnh",
      keywords: ["can xem lai", "uu tien", "canh bao", "rau hao hut", "lang phi rau", "mon can sua"],
      icon: "leaf",
      action: () => {
        onSelectTab?.("menus");
        handleCollapse();
      },
    },
    {
      id: "logout",
      title: "Đăng xuất tài khoản",
      category: "Tài khoản",
      badge: "Thao tác",
      description: "Đăng xuất khỏi tài khoản căn tin hiện tại",
      keywords: ["dang xuat", "logout", "thoat", "doi tai khoan"],
      icon: "logout",
      action: () => {
        onLogout?.();
        handleCollapse();
      },
    },
  ], [onSelectTab, onSelectLogView, onSelectDataView, onExportCSV, onLogout]);

  // Filter system features based on query
  const filteredFeatures = useMemo(() => {
    const q = fold(query);
    if (!q) {
      // Default suggested features when query is empty
      return systemFeatures.filter((f) =>
        ["overview", "menu", "menus", "vision", "log", "export-csv"].includes(f.id)
      );
    }

    return systemFeatures
      .map((f) => {
        const titleFold = fold(f.title);
        const descFold = fold(f.description);
        let score = 0;

        if (titleFold === q) score += 100;
        else if (titleFold.startsWith(q)) score += 80;
        else if (titleFold.includes(q)) score += 60;

        for (const kw of f.keywords) {
          const kwFold = fold(kw);
          if (kwFold === q) score += 70;
          else if (kwFold.startsWith(q)) score += 50;
          else if (kwFold.includes(q)) score += 40;
        }

        if (descFold.includes(q)) score += 20;

        return { feature: f, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.feature);
  }, [query, systemFeatures]);

  // Filter dishes based on query
  const filteredDishes = useMemo(() => {
    const q = fold(query);
    if (!q || !allDishes.length) return [];

    return allDishes
      .filter((d) => fold(d.menu).includes(q))
      .slice(0, 5)
      .map((d) => ({
        id: `dish-${d.menu}`,
        title: d.menu,
        category: "Món ăn trong thực đơn" as const,
        badge: "Món ăn" as const,
        description: d.vegetables?.mean != null
          ? `Thừa rau: ${(d.vegetables.mean).toFixed(1)}% • ${d.count} lượt quan sát`
          : d.mean != null
          ? `Thừa TB: ${(d.mean).toFixed(1)}% • ${d.count} lượt quan sát`
          : `${d.count} lượt quan sát`,
        icon: "menus" as IconName,
        action: () => {
          onSelectDish?.(d.menu);
          handleCollapse();
        },
      }));
  }, [query, allDishes, onSelectDish]);

  // Combined flat list for keyboard navigation
  const flatItems = useMemo(() => {
    return [
      ...filteredFeatures.map((f) => ({ type: "feature" as const, item: f })),
      ...filteredDishes.map((d) => ({ type: "dish" as const, item: d })),
    ];
  }, [filteredFeatures, filteredDishes]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(".search-palette-item.is-active");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[activeIndex]) {
        flatItems[activeIndex].item.action();
      } else if (query.trim()) {
        onSubmit();
        handleCollapse();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCollapse();
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (flatItems[activeIndex]) {
      flatItems[activeIndex].item.action();
    } else {
      onSubmit();
      handleCollapse();
    }
  };

  return (
    <div className="topbar-search-container" ref={containerRef}>
      <form
        className={`topbar-search ${isExpanded ? "is-expanded" : ""}`}
        role="search"
        onSubmit={handleFormSubmit}
        onClick={() => {
          if (!isExpanded) handleExpand();
        }}
      >
        <button
          type="button"
          className="search-trigger-btn"
          aria-label={isExpanded ? "Tìm kiếm" : "Mở tìm kiếm (Ctrl+K)"}
          title={isExpanded ? undefined : "Tìm kiếm chức năng & món ăn (Ctrl+K)"}
          onClick={(e) => {
            if (!isExpanded) {
              e.preventDefault();
              handleExpand();
            }
          }}
        >
          <Icon name="search" size={17} />
        </button>

        <input
          ref={inputRef}
          type="search"
          aria-label="Tìm kiếm chức năng và món ăn"
          placeholder="Tìm chức năng, món ăn… (Ctrl+K)"
          value={query}
          tabIndex={isExpanded ? 0 : -1}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
            if (!dropdownOpen) setDropdownOpen(true);
          }}
          onFocus={() => {
            if (!dropdownOpen) setDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="topbar-search-actions">
          {query ? (
            <button
              type="button"
              className="topbar-search-btn-clear"
              aria-label="Xóa nội dung tìm kiếm"
              title="Xóa tìm kiếm"
              onClick={handleClear}
            >
              <Icon name="close" size={12} />
            </button>
          ) : (
            <span className="topbar-search-kbd" title="Nhấn ESC để đóng">
              ESC
            </span>
          )}
        </div>
      </form>

      {isExpanded && dropdownOpen && (
        <div
          className="topbar-search-dropdown"
          role="listbox"
          aria-label="Kết quả tìm kiếm chức năng"
        >
          <ul className="search-palette-list-wrapper" ref={listRef}>
            {filteredFeatures.length > 0 && (
              <li className="search-palette-section">
                <div className="search-palette-title">
                  <span>{query ? "Chức năng hệ thống" : "Gợi ý truy cập nhanh"}</span>
                  <span className="search-palette-count">{filteredFeatures.length}</span>
                </div>
                <ul className="search-palette-list">
                  {filteredFeatures.map((f, i) => {
                    const isCurrent = currentTab === f.id;
                    const isActive = activeIndex === i;
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          className={`search-palette-item ${isActive ? "is-active" : ""}`}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => f.action()}
                          onMouseEnter={() => setActiveIndex(i)}
                        >
                          <span className="search-palette-item-icon">
                            <Icon name={f.icon} size={18} />
                          </span>
                          <span className="search-palette-item-content">
                            <span className="search-palette-item-title">
                              {f.title}
                              {isCurrent && (
                                <span className="search-palette-current-tag">Hiện tại</span>
                              )}
                            </span>
                            <span className="search-palette-item-desc">{f.description}</span>
                          </span>
                          <span
                            className={`search-palette-item-badge ${
                              f.badge === "Thao tác" ? "badge-action" : ""
                            }`}
                          >
                            {f.badge}
                          </span>
                          <span className="search-palette-item-enter" aria-hidden="true">
                            <Icon name="enter" size={13} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}

            {filteredDishes.length > 0 && (
              <li className="search-palette-section">
                <div className="search-palette-title">
                  <span>Món ăn trong thực đơn</span>
                  <span className="search-palette-count">{filteredDishes.length}</span>
                </div>
                <ul className="search-palette-list">
                  {filteredDishes.map((d, i) => {
                    const globalIdx = filteredFeatures.length + i;
                    const isActive = activeIndex === globalIdx;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          className={`search-palette-item ${isActive ? "is-active" : ""}`}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => d.action()}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          <span className="search-palette-item-icon">
                            <Icon name="menus" size={18} />
                          </span>
                          <span className="search-palette-item-content">
                            <span className="search-palette-item-title">{d.title}</span>
                            <span className="search-palette-item-desc">{d.description}</span>
                          </span>
                          <span className="search-palette-item-badge badge-food">
                            {d.badge}
                          </span>
                          <span className="search-palette-item-enter" aria-hidden="true">
                            <Icon name="enter" size={13} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}

            {flatItems.length === 0 && (
              <li className="search-palette-empty">
                <Icon name="search" size={28} style={{ opacity: 0.5 }} />
                <strong>Không tìm thấy chức năng hoặc món ăn</strong>
                <p>
                  Không có kết quả nào khớp với &quot;<b>{query}</b>&quot;. Hãy thử tìm với &quot;Tổng quan&quot;, &quot;Vision&quot;, &quot;NFC&quot;, &quot;CSV&quot;, &quot;Thực đơn&quot;...
                </p>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

