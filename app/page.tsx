"use client";

import { useEffect, useState } from "react";

type ItemType = "game" | "shader" | "inspiration";
type Find = {
  type: ItemType;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  tags?: string[];
  collectedAt: string;
};

type TopTab = "today" | "all" | "inspiration";
type SubFilter = "all" | "game" | "shader";
type InspirationFilter = "all" | "pixel" | "cartoon" | "character" | "scene" | "ui";

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
  const [inspirationFilter, setInspirationFilter] = useState<InspirationFilter>("all");
  const [finds, setFinds] = useState<Find[] | undefined>(undefined);

  useEffect(() => {
    fetch("/data/finds.json")
      .then((r) => r.json())
      .then((all: Find[]) => setFinds(all))
      .catch(() => setFinds([]));
  }, []);

  const today = getTodayShanghai();

  const gameShaderFinds = finds?.filter((x) => x.type !== "inspiration") ?? [];
  const todayItems = gameShaderFinds.filter((x) => getItemDate(x, today) === today);

  const allFiltered =
    subFilter === "all"
      ? gameShaderFinds
      : gameShaderFinds.filter((x) => x.type === subFilter);

  const grouped = groupByDate(allFiltered, today);

  const inspirationItems = finds?.filter((x) => x.type === "inspiration") ?? [];
  const filteredInspiration =
    inspirationFilter === "all"
      ? inspirationItems
      : inspirationItems.filter((x) => x.tags?.includes(inspirationFilter));

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>独立发现</h1>
          <p>3D 游戏、shader 与设计灵感</p>
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

      {topTab === "inspiration" && (
        <nav className="sub-tabs">
          {(
            [
              ["all", "全部"],
              ["pixel", "像素"],
              ["cartoon", "卡通"],
              ["character", "角色"],
              ["scene", "场景"],
              ["ui", "UI"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={inspirationFilter === key ? "sub-tab active" : "sub-tab"}
              onClick={() => setInspirationFilter(key)}
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
          <p className="empty">今天还没有收录</p>
        ) : (
          <section className="grid">
            {todayItems.map((item) => (
              <Card key={item.url} item={item} />
            ))}
          </section>
        )
      ) : topTab === "inspiration" ? (
        filteredInspiration.length === 0 ? (
          <p className="empty">暂无条目</p>
        ) : (
          <section className="grid">
            {filteredInspiration.map((item) => (
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
        <p>{item.summary}</p>
        <a className="link" href={item.url} target="_blank" rel="noreferrer">
          打开链接
        </a>
      </div>
    </article>
  );
}
