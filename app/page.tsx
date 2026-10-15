"use client";

import { useEffect, useState } from "react";

type ItemType = "game" | "shader" | "inspiration" | "model_site";
type Find = {
  type: ItemType;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  tags?: string[];
  genres?: string[];
  style?: string;
  kind?: string;
  dim?: string;
  collectedAt: string;
};

type TopTab = "today" | "all" | "inspiration" | "model_sites";
type SubFilter = "all" | "game" | "shader";
type InspStyle = "all" | "pixel" | "cartoon";
type InspKind = "terrain" | "character" | "building" | "ui" | "other";
type InspDim = "2d" | "3d";

const INSP_KINDS: [InspKind, string][] = [
  ["terrain", "地形"],
  ["character", "人物"],
  ["building", "建筑"],
  ["ui", "UI"],
  ["other", "其他"],
];

// 灵感条目字段缺失时回退到 tags，保证旧数据也能筛
function inspStyleOf(x: Find): "pixel" | "cartoon" {
  if (x.style === "cartoon" || x.style === "pixel") return x.style;
  return x.tags?.includes("cartoon") ? "cartoon" : "pixel";
}
function inspKindOf(x: Find): InspKind {
  const k = x.kind ?? x.tags?.find((t) => ["terrain", "character", "building", "ui"].includes(t));
  return k === "terrain" || k === "character" || k === "building" || k === "ui" ? k : "other";
}
function inspDimOf(x: Find): InspDim {
  const d = x.dim ?? x.tags?.find((t) => t === "2d" || t === "3d");
  return d === "3d" ? "3d" : "2d";
}
type ModelSiteFilter = "all" | "packs" | "marketplace" | "textures" | "characters" | "voxels" | "tools";

// 没有 genres 的游戏(如新条目，构建时打标签失败)兜底归入「其他」，保证不消失
function genresOf(item: Find): string[] {
  return item.genres && item.genres.length > 0 ? item.genres : ["其他"];
}

const GENRE_ORDER = [
  "城建/殖民/经营",
  "神游/god-game",
  "策略/4X/RTS",
  "hex/六边形",
  "塔防",
  "自动化/工厂",
  "生存/建造",
  "PSX/复古恐怖",
  "体素/沙盒",
  "程序化/世界生成",
  "赛车/驾驶",
  "平台/动作/RPG",
  "解谜/物理玩具",
  "航海/开放世界",
  "温馨/治愈/园艺",
  "开发动态/工具",
  "其他",
];

function matchesQuery(item: Find, q: string): boolean {
  if (!q) return true;
  const hay = `${item.title} ${item.summary} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

function getTodayShanghai(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

function getItemDate(item: Find, today: string): string {
  return item.collectedAt || today;
}

function groupByDate(items: Find[], today: string): [string, Find[]][] {
  const map = new Map<string, Find[]>();
  for (const item of items) {
    const date = getItemDate(item, today);
    const arr = map.get(date) ?? [];
    arr.push(item);
    map.set(date, arr);
  }
  return [...map.entries()].sort((a, b) => (b[0] ?? "").localeCompare(a[0] ?? ""));
}

export default function Page() {
  const [topTab, setTopTab] = useState<TopTab>("today");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [inspStyle, setInspStyle] = useState<InspStyle>("all");
  const [inspKind, setInspKind] = useState<InspKind | "all">("all");
  const [inspDim, setInspDim] = useState<InspDim | "all">("all");
  const [modelSiteFilter, setModelSiteFilter] = useState<ModelSiteFilter>("all");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [finds, setFinds] = useState<Find[] | undefined>(undefined);

  useEffect(() => {
    fetch("/data/finds.json")
      .then((r) => r.json())
      .then((all: Find[]) => setFinds(all))
      .catch(() => setFinds([]));
  }, []);

  const today = getTodayShanghai();

  const gameShaderFinds =
    finds?.filter((x) => x.type !== "inspiration" && x.type !== "model_site") ?? [];
  const todayBase = gameShaderFinds.filter((x) => getItemDate(x, today) === today);
  const allBase =
    subFilter === "all"
      ? gameShaderFinds
      : gameShaderFinds.filter((x) => x.type === subFilter);

  // 类型筛选条只作用于游戏；选了类型后只显示命中的游戏
  const showGenreBar =
    (topTab === "today" || (topTab === "all" && subFilter !== "shader")) && !!finds;
  const genreBase = (topTab === "today" ? todayBase : allBase).filter(
    (x) => x.type === "game" && matchesQuery(x, query),
  );
  const genreCounts = new Map<string, number>();
  for (const x of genreBase) {
    for (const g of genresOf(x)) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const genreList = [
    ...GENRE_ORDER.filter((g) => genreCounts.has(g) || selectedGenres.includes(g)),
    ...[...genreCounts.keys()].filter((g) => !GENRE_ORDER.includes(g)),
  ];
  const applyFilters = (items: Find[]) =>
    items.filter(
      (x) =>
        matchesQuery(x, query) &&
        (selectedGenres.length === 0 ||
          (x.type === "game" && genresOf(x).some((g) => selectedGenres.includes(g)))),
    );
  const toggleGenre = (g: string) =>
    setSelectedGenres((cur) => (cur.includes(g) ? cur.filter((v) => v !== g) : [...cur, g]));

  const todayItems = applyFilters(todayBase);
  const allFiltered = applyFilters(allBase);

  const grouped = groupByDate(allFiltered, today);

  const inspirationItems = finds?.filter((x) => x.type === "inspiration") ?? [];
  // 三组筛选可组合；每组的数量按“其余两组已选条件”计算
  const inspPass = (x: Find, skip?: "style" | "kind" | "dim") =>
    (skip === "style" || inspStyle === "all" || inspStyleOf(x) === inspStyle) &&
    (skip === "kind" || inspKind === "all" || inspKindOf(x) === inspKind) &&
    (skip === "dim" || inspDim === "all" || inspDimOf(x) === inspDim);
  const filteredInspiration = inspirationItems.filter((x) => inspPass(x));
  const inspCount = (skip: "style" | "kind" | "dim", test: (x: Find) => boolean) =>
    inspirationItems.filter((x) => inspPass(x, skip) && test(x)).length;

  const modelSiteItems = finds?.filter((x) => x.type === "model_site") ?? [];
  const filteredModelSites =
    modelSiteFilter === "all"
      ? modelSiteItems
      : modelSiteItems.filter((x) => x.tags?.includes(modelSiteFilter));

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>独立发现</h1>
          <p>3D 游戏、shader、设计灵感与模型网站</p>
        </div>
        <nav className="tabs">
          <button
            className={topTab === "today" ? "tab active" : "tab"}
            onClick={() => setTopTab("today")}
            type="button"
          >
            今天
          </button>
          <button
            className={topTab === "all" ? "tab active" : "tab"}
            onClick={() => setTopTab("all")}
            type="button"
          >
            全部
          </button>
          <button
            className={topTab === "inspiration" ? "tab active" : "tab"}
            onClick={() => setTopTab("inspiration")}
            type="button"
          >
            设计灵感
          </button>
          <button
            className={topTab === "model_sites" ? "tab active" : "tab"}
            onClick={() => setTopTab("model_sites")}
            type="button"
          >
            模型网站
          </button>
        </nav>
      </header>

      {topTab === "all" && (
        <nav className="sub-tabs">
          <button
            className={subFilter === "all" ? "sub-tab active" : "sub-tab"}
            onClick={() => setSubFilter("all")}
            type="button"
          >
            全部
          </button>
          <button
            className={subFilter === "game" ? "sub-tab active" : "sub-tab"}
            onClick={() => setSubFilter("game")}
            type="button"
          >
            游戏
          </button>
          <button
            className={subFilter === "shader" ? "sub-tab active" : "sub-tab"}
            onClick={() => setSubFilter("shader")}
            type="button"
          >
            Shader
          </button>
        </nav>
      )}

      {(topTab === "today" || topTab === "all") && (
        <div className="search-row">
          <input
            className="search-input"
            type="search"
            placeholder="搜索标题 / 描述"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {showGenreBar && (
        <nav className="genre-bar" aria-label="游戏类型">
          <button
            className={selectedGenres.length === 0 ? "sub-tab active" : "sub-tab"}
            onClick={() => setSelectedGenres([])}
            type="button"
          >
            全部类型
          </button>
          {genreList.map((g) => (
            <button
              key={g}
              className={selectedGenres.includes(g) ? "sub-tab active" : "sub-tab"}
              onClick={() => toggleGenre(g)}
              type="button"
            >
              {g}
              <span className="genre-count">{genreCounts.get(g) ?? 0}</span>
            </button>
          ))}
        </nav>
      )}

      {topTab === "inspiration" && (
        <div className="insp-filters">
          <nav className="sub-tabs" aria-label="风格">
            <span className="filter-label">风格</span>
            {(
              [
                ["all", "全部"],
                ["pixel", "像素"],
                ["cartoon", "卡通"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                className={inspStyle === key ? "sub-tab active" : "sub-tab"}
                onClick={() => setInspStyle(key)}
                type="button"
              >
                {label}
                <span className="genre-count">
                  {inspCount("style", (x) => key === "all" || inspStyleOf(x) === key)}
                </span>
              </button>
            ))}
          </nav>
          <nav className="sub-tabs" aria-label="类别">
            <span className="filter-label">类别</span>
            <button
              className={inspKind === "all" ? "sub-tab active" : "sub-tab"}
              onClick={() => setInspKind("all")}
              type="button"
            >
              全部
              <span className="genre-count">{inspCount("kind", () => true)}</span>
            </button>
            {INSP_KINDS.map(([key, label]) => {
              const n = inspCount("kind", (x) => inspKindOf(x) === key);
              if (n === 0 && inspKind !== key) return null;
              return (
                <button
                  key={key}
                  className={inspKind === key ? "sub-tab active" : "sub-tab"}
                  onClick={() => setInspKind(key)}
                  type="button"
                >
                  {label}
                  <span className="genre-count">{n}</span>
                </button>
              );
            })}
          </nav>
          <nav className="sub-tabs" aria-label="维度">
            <span className="filter-label">维度</span>
            {(
              [
                ["all", "全部"],
                ["2d", "2D"],
                ["3d", "3D"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                className={inspDim === key ? "sub-tab active" : "sub-tab"}
                onClick={() => setInspDim(key)}
                type="button"
              >
                {label}
                <span className="genre-count">
                  {inspCount("dim", (x) => key === "all" || inspDimOf(x) === key)}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {topTab === "model_sites" && (
        <nav className="sub-tabs">
          {(
            [
              ["all", "全部"],
              ["packs", "资源包"],
              ["marketplace", "大库"],
              ["textures", "材质"],
              ["characters", "角色"],
              ["voxels", "体素"],
              ["tools", "工具"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={modelSiteFilter === key ? "sub-tab active" : "sub-tab"}
              onClick={() => setModelSiteFilter(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {finds === undefined ? (
        <p className="empty">加载中…</p>
      ) : topTab === "today" ? (
        todayItems.length === 0 ? (
          <p className="empty">{selectedGenres.length || query ? "没有符合筛选的条目" : "今天还没有收录"}</p>
        ) : (
          <section className="grid">
            {todayItems.map((item) => (
              <Card key={item.url} item={item} />
            ))}
          </section>
        )
      ) : topTab === "inspiration" ? (
        filteredInspiration.length === 0 ? (
          <p className="empty">没有符合筛选的条目</p>
        ) : (
          <section className="grid">
            {filteredInspiration.map((item) => (
              <Card key={item.url} item={item} />
            ))}
          </section>
        )
      ) : topTab === "model_sites" ? (
        filteredModelSites.length === 0 ? (
          <p className="empty">暂无条目</p>
        ) : (
          <section className="grid">
            {filteredModelSites.map((item) => (
              <Card key={item.url} item={item} />
            ))}
          </section>
        )
      ) : grouped.length === 0 ? (
        <p className="empty">暂无条目</p>
      ) : (
        <div className="date-groups">
          {grouped.map(([date, items]) => (
            <section key={date} className="date-section">
              <h3 className="date-heading">{date}</h3>
              <div className="grid">
                {items.map((item) => (
                  <Card key={item.url} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function Card({ item }: { item: Find }) {
  return (
    <article className="card">
      <div className={item.imageUrl ? "card-image" : "card-image empty"}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} />
        ) : (
          <span>NO IMAGE</span>
        )}
      </div>
      <div className="card-body">
        <h2>{item.title}</h2>
        {item.type === "game" && (
          <div className="card-genres">
            {genresOf(item).map((g) => (
              <span key={g} className="genre-chip">
                {g}
              </span>
            ))}
          </div>
        )}
        {item.type === "inspiration" && (
          <div className="card-genres">
            {[
              inspStyleOf(item) === "cartoon" ? "卡通" : "像素",
              INSP_KINDS.find(([k]) => k === inspKindOf(item))?.[1] ?? "其他",
              inspDimOf(item) === "3d" ? "3D" : "2D",
            ].map((c) => (
              <span key={c} className="genre-chip">
                {c}
              </span>
            ))}
          </div>
        )}
        <p>{item.summary}</p>
        <a className="link" href={item.url} target="_blank" rel="noreferrer">
          打开链接
        </a>
      </div>
    </article>
  );
}
