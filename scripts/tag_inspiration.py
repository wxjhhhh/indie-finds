#!/usr/bin/env python3
"""给 public/data/finds.json 里 type=="inspiration" 的条目补 style / kind / dim 字段（幂等）。

  style = pixel | cartoon        (缺失时从 tags 取，默认 pixel)
  kind  = terrain | character | building | ui   (旧的 scene 按标题/摘要判断；判不了保留 scene，前端归「其他」)
  dim   = 2d | 3d

用法:
    python3 scripts/tag_inspiration.py                 # 补齐所有缺失字段，并重新判断 kind=scene 的条目
    python3 scripts/tag_inspiration.py --only-missing  # 只处理缺 style/kind/dim 的条目
    python3 scripts/tag_inspiration.py --check         # 只统计，不写文件
已有合法字段(如新收集时手写的 kind/dim)一律保留；手工修正写 scripts/inspiration_overrides.json:
    {"<url 或 id 或 title>": {"kind": "building", "dim": "3d", "style": "pixel"}}
非 inspiration 条目不会被修改。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "public", "data", "finds.json")
OVR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inspiration_overrides.json")

KINDS = {"terrain", "character", "building", "ui"}
DIMS = {"2d", "3d"}
STYLES = {"pixel", "cartoon"}

BUILDING = re.compile(r"建筑|房屋|小屋|村屋|町屋|屋顶|民居|house|building|cottage|castle|exterior|城堡|寺庙|书店|咖啡店|咖啡馆|商店|店面|风车|谷仓|畜棚|钟楼|定居|据点|城建|建村|村落建|建房|农庄|村庄|村镇|小镇|村落|市集|街区|像素城|营地|木屋|山村", re.I)
TERRAIN = re.compile(r"地砖|瓷砖|地块|tileset|tilemap|tile|地形|地貌|草地|草原|平原|森林|树林|林|农田|农场|果园|山谷|岛|关卡|世界|植被|河|水面|雪景|四季|田园|瀑布|沙盘|biome|terrain|landscape|voxel地形", re.I)
D3 = re.compile(r"3d|低模|低面|多边形|poly|体素|voxel|ue5|blender|unity|unreal|胶囊|3d 像素", re.I)

def tagset(it):
    return {str(t).lower() for t in (it.get("tags") or [])}

def text(it):
    return f"{it.get('title','')} {it.get('summary','')}"

def get_style(it):
    s = (it.get("style") or "").lower()
    if s in STYLES:
        return s
    t = tagset(it)
    if "cartoon" in t: return "cartoon"
    if "pixel" in t: return "pixel"
    return "pixel"

def get_kind(it):
    k = (it.get("kind") or "").lower()
    if k in KINDS:
        return k
    t = tagset(it)
    for cand in ("terrain", "building", "character", "ui"):
        if cand in t:
            return cand
    # 旧 scene / 无 kind：按文本判断
    txt = text(it)
    if BUILDING.search(txt):
        return "building"
    if TERRAIN.search(txt):
        return "terrain"
    return "scene"

def get_dim(it):
    d = (it.get("dim") or "").lower()
    if d in DIMS:
        return d
    t = tagset(it)
    if "3d" in t: return "3d"
    if "2d" in t: return "2d"
    if (it.get("kind") or "").lower() == "ui" or "ui" in t:
        return "2d"
    return "3d" if D3.search(text(it)) else "2d"

def process(it, ovr):
    o = ovr.get(it.get("url")) or ovr.get(it.get("id")) or ovr.get(it.get("title")) or {}
    style = o.get("style") or get_style(it)
    kind = o.get("kind") or get_kind(it)
    dim = o.get("dim") or get_dim(it)
    return style, kind, dim

def main():
    only_missing = "--only-missing" in sys.argv
    check = "--check" in sys.argv
    data = json.load(open(PATH, encoding="utf-8"))
    ovr = json.load(open(OVR, encoding="utf-8")) if os.path.exists(OVR) else {}
    n = changed = 0
    counts = {}
    for it in data:
        if it.get("type") != "inspiration":
            continue
        n += 1
        has_all = it.get("style") in STYLES and it.get("kind") in (KINDS | {"scene"}) and it.get("dim") in DIMS
        if not (only_missing and has_all):
            style, kind, dim = process(it, ovr)
            before = (it.get("style"), it.get("kind"), it.get("dim"), list(it.get("tags") or []))
            it["style"], it["kind"], it["dim"] = style, kind, dim
            tags = list(it.get("tags") or [])
            for t in ("design_inspiration", style, kind, dim):
                if t not in tags:
                    tags.append(t)
            it["tags"] = tags
            if before != (style, kind, dim, tags):
                changed += 1
        key = (it.get("kind"), it.get("dim"))
        counts[key] = counts.get(key, 0) + 1
    if not check and changed:
        with open(PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(f"inspiration={n} changed={changed}")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"{v:5d}  {k[0]}/{k[1]}")

if __name__ == "__main__":
    main()
