# 独立发现
中文暗色画廊，Next.js App Router + Convex。界面不内置演示标题。

## 环境变量
Vercel 需要 NEXT_PUBLIC_CONVEX_URL。
Convex 需要 NOTION_API_KEY。

## 种子
读取 /workspace/x-bookmarks-full.json
3D_game 映射 game；shader_visual 映射 shader；skip_tool_or_noise 跳过。
使用 package 脚本 seed。

## Notion
动作 syncFromNotion 拉取页面 3c511293decf81d3bb91daed77bb0c56 作为 game，3c511293decf81c2a80ec0fb4d90b6de 作为 shader。

## 部署
连接 Vercel，框架选 Next.js。生产部署 Convex 后只把 Convex URL 配到 Vercel。

## 表 finds
字段：type title summary url imageUrl source sourceId publishedAt tags

## 游戏类型标签（genres）
`public/data/finds.json` 里 type=game 的条目带 `genres` 数组（1–3 个中文类型，第一个为主类型）。页面「今天/全部」有类型筛选条（多选、带数量，可与搜索、Shader/游戏切换共用）。
每日新增条目后运行（幂等）：

    python3 scripts/tag_genres.py                # 重算所有游戏的 genres
    python3 scripts/tag_genres.py --only-missing # 只给没有 genres 的条目打标签（每日流程用这个）
    python3 scripts/tag_genres.py --check        # 只看统计，不写文件

手工修正写进 `scripts/genre_overrides.json`（key 为 url / id / title）。类型清单与规则在脚本里的 `G` 表。
