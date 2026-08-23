"use client";

import { useEffect, useState } from "react";

type Tab = "game" | "shader";
type Find = {
  type: Tab;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
};

export default function Page() {
  const [tab, setTab] = useState<Tab>("game");
  const [finds, setFinds] = useState<Find[] | undefined>(undefined);

  useEffect(() => {
    fetch("/data/finds.json")
      .then((r) => r.json())
      .then((all: Find[]) => setFinds(all))
      .catch(() => setFinds([]));
  }, []);

  const shown = finds?.filter((x) => x.type === tab) ?? [];

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>独立发现</h1>
          <p>3D 游戏与 shader 收藏</p>
        </div>
        <nav className="tabs">
          <button className={tab === "game" ? "tab active" : "tab"} onClick={() => setTab("game")} type="button">
            3D 游戏
          </button>
          <button className={tab === "shader" ? "tab active" : "tab"} onClick={() => setTab("shader")} type="button">
            Shader 视觉
          </button>
        </nav>
      </header>

      {finds === undefined ? (
        <p className="empty">加载中…</p>
      ) : shown.length === 0 ? (
        <p className="empty">这一类暂时没有条目。</p>
      ) : (
        <section className="grid">
          {shown.map((item) => (
            <article key={item.url || item.title} className="card">
              <div className={item.imageUrl ? "card-image" : "card-image empty"}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>NO IMAGE</span>}
              </div>
              <div className="card-body">
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <a className="link" href={item.url} target="_blank" rel="noreferrer">
                  打开链接
                </a>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
