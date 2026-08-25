"use client";

import { useEffect, useState } from "react";

type ItemType = "game" | "shader";
type Find = {
  type: ItemType;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  collectedAt: string;
};

type TopTab = "today" | "all";
type SubFilter = "all" | "game" | "shader";

function getTodayShanghai(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

function groupByDate(items: Find[]): [string, Find[]][] {
  const map = new Map<string, Find[]>();
  for (const item of items) {
    const arr = map.get(item.collectedAt) ?? [];
    arr.push(item);
    map.set(item.collectedAt, arr);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Page() {
  const [topTab, setTopTab] = useState<TopTab>("today");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [finds, setFinds] = useState<Find[] | undefined>(undefined);

  useEffect(() => {
    fetch("/data/finds.json")
      .then((r) => r.json())
      .then((all: Find[]) => setFinds(all))
      .catch(() => setFinds([]));
  }, []);

  const today = getTodayShanghai();

  const todayItems = finds?.filter((x) => x.collectedAt === today) ?? [];

  const allFiltered = finds
    ? subFilter === "all"
      ? finds
      : finds.filter((x) => x.type === subFilter)
    : [];

  const grouped = groupByDate(allFiltered);

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>独立发现</h1>
          <p>3D 游戏与 shader 收藏</p>
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
