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
