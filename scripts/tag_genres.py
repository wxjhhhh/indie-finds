#!/usr/bin/env python3
"""给 public/data/finds.json 里 type=="game" 的条目打「类型」标签，写入 genres 数组(1-3个，第一个为主类型)。

用法（幂等，可重复跑；每日新增条目后跑一次即可）:
    python3 scripts/tag_genres.py                 # 重新计算所有游戏的 genres 并写回
    python3 scripts/tag_genres.py --only-missing  # 只给还没有 genres 的条目打标签
    python3 scripts/tag_genres.py --check         # 只统计，不写文件
手工修正: 在 scripts/genre_overrides.json 里写 {"<url 或 id 或 title>": ["塔防","hex/六边形"]}，会覆盖规则结果。
非 game 类型(shader/inspiration/model_site)不处理，也不会被修改。
规则 = title + summary + tags 的关键词打分(tags 命中权重更高)；没命中时按来源/文本启发式兜底；
实在判断不了才写「其他」。
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "public", "data", "finds.json")
OVR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "genre_overrides.json")

# (标签, 文本关键词正则, tags精确词集合)
G = [
 ("骑砍/战争",
  r"mount\s*(&|and|n)\s*blade|mount&blade|骑砍|骑马与砍杀|骑马砍杀|战团|warband|bannerlord|cavalry|骑兵|骑士团|medieval (warfare|combat|battle|battles|war|army|armies)|中世纪(战争|战场|战斗|战役|军队|格斗)|大规模战场|大规模战斗|大型战场|large.?scale (battle|combat|warfare)|massive (battle|army)|army battle|军阵|军团|legion|sword.?(combat|fight|play)|剑术|剑斗|冷兵器|feudal (lord|war|army|kingdom)|封建(领主|战争|王国)|\bvassal|附庸|kingdom war|王国战争|武士战场|samurai (war|battle)|total war|总战|全面战争|siege|攻城|守城|阵型|方阵|battlefield|战场|warlord|军阀|mercenar|雇佣兵|horseback|骑马(战|射|冲)|mounted (combat|knight|archer)|骑射|shield wall|盾墙|crusader|十字军|spearm|长矛兵|pikem|medieval.{0,20}(sword|fight|battle|war|duel|combat|tactic|strategy)|中世纪.{0,12}(剑|格斗|战|决斗|招架|策略|兵)|骑士.{0,12}(战|斗|决斗|冲锋|布娃娃)|knights?.{0,20}(ragdoll|duel|battle|charge|combat)|决斗|\\bduel|招架|parry|步兵|infantry|战壕|trench|厮杀|开战|战争模拟|帝国时代|age of empires|\\baoe\\b|knights of honor|heroes of might|英雄无敌|kohan|编队|formation|骑士国|knight.?realm|部落战斗|近战格斗|melee|砍杀|劈砍|剑与",
  {"mount-and-blade","mount-blade","cavalry","warband","feudal","total-war","siege","battlefield","warlord","mercenary","sword-combat","large-scale-battle","crusader","melee-combat"}),
 ("城建/殖民/经营",
  r"公司|办公室|微缩|小村|村民|城建|殖民|聚落|定居|村庄|小镇|城市建造|建城|经营|模拟经营|大亨|管理|colon|city.?build|settle|village|town|tycoon|management|kingdom|castle|manage|citizen|市民|据点|基地管理|营地|management sim|business sim|经营管理|资源管理|经营模拟|模拟城市|城市规划|城市模拟|城镇建设|city.?sim|sim.?city|builder|building sim|colony sim|colony management|settlement|factory tycoon|restaurant|shop sim|商店经营|餐厅|开店|店铺|empire builder|theme park|主题乐园|游乐园",
  {"colony","city-builder","citybuilder","colony-sim","settlement","management","tycoon","city","builder","village","town","base-building","base","kingdom","survival-colony","management-sim","city-building","building-sim","business-sim","city-sim","resource-management","shop-sim","idle-tycoon","theme-park"}),
 ("神游/god-game",
  r"god.?game|神游|神视角|小神|上帝视角|扮演神|造物|worldbox|god-view|godview|\bgod\b|众神|信仰|神明|生态.*微缩|terraform|地形塑",
  {"god-game","godgame","worldbox-like","god","terraforming","god-view"}),
 ("策略/4X/RTS",
  r"4x|rts|策略|战棋|回合制|战争模拟|战争|征服|文明|军阵|军队|army|strategy|tactic|grand strategy|wargame|即时战略|战术|大混战|国家|帝国|empire|\bcivs?\b|civilization|real.?time strategy|turn.?based strategy|tactical|tactics|战略|战术|wargame|war game|兵棋|grand strat|大战略|auto.?battler|自走棋|4x|explore.*expand|xcom|fire emblem|火焰纹章|total.?war|ai.?opponent|diplomacy|外交|领土|territory|军事|military|commander|指挥官|general\b|将军|army|squad|小队战术|base.?defen[cs]e.*strateg",
  {"strategy","4x","rts","tactics","war-sim","wargame","turn-based","grand-strategy","civ","tactical","real-time-strategy","turn-based-strategy","auto-battler","strategy-game","tbs","diplomacy","military","commander","4x-strategy"}),
 ("hex/六边形",
  r"hex|六边|六角|蜂巢格",
  {"hex","hexagon","hex-grid"}),
 ("塔防",
  r"塔防|tower.?defen|守住|守塔|守卫|\btd\b|防御塔|抵挡|波次|来袭|尸潮|守夜",
  {"tower-defense","td","tower","defense","tower-defence"}),
 ("自动化/工厂",
  r"自动化|工厂|流水线|产线|传送带|物流|factory|automation|factorio|logistic|生产链|belt|conveyor|电路|circuit|回收场|机器人.*(建|造)|programming|编程",
  {"factory","automation","logistics","circuits","production","factorio-like","programming"}),
 ("生存/建造",
  r"生存|求生|搜刮|制作|合成|建造|搭建|营地|漂流|荒岛|落难|逃生|survival|craft|build(ing)?\b|base.?build|castaway|坠落|开拓|拓荒|采矿|挖矿|探险|mining|lumber|伐木",
  {"survival","crafting","building","build","base-building","castaway","mining","base","builder","co-op-survival"}),
 ("PSX/复古恐怖",
  r"psx|ps1|ps2|复古.*恐怖|恐怖|惊悚|幽灵|鬼|诡|怪诞|心理|噩梦|梦境|僵尸|克苏鲁|洛夫克拉夫特|哥特|horror|haunted|ghost|creepy|spooky|vhs|retro 3d|framebuffer|低多边形.*氛围|dread|nightmare|谋杀|屠杀|dark fantasy|暗黑",
  {"psx","ps1","horror","retro","gothic","haunted","ghost","dread","vhs","creepy","spooky","ps2","dark","survival-horror","stealth"}),
 ("体素/沙盒",
  r"落沙|沙盘|刨沙|沙坑|体素|voxel|沙盒|sandbox|方块|minecraft|magicavoxel|块状|积木|lego|sand\b|沙粒|沙土|细胞|cellular|falling sand|粒子模拟|物质模拟|玩具世界",
  {"voxel","sandbox","blocks","falling-sand","minecraft-like","cellular","lego","voxels"}),
 ("程序化/世界生成",
  r"种群|演化|进化|evolution|生命模拟|群体模拟|蚁群|蜂巢|程序化|worldgen|world.?gen|procgen|procedural|世界生成|生成地图|随机生成|随机化|地图生成|生成器|generat|行星|星球|planet|terrain|地形|群岛|无限|infinite|算法|noise|噪声|侵蚀|erosion|世界模拟|世界生成|worldsim|生态|ecosystem|simulat.*world",
  {"procedural","procgen","worldgen","worldsim","terrain","generator","planet","ecosystem","infinite","proc-gen","procedural-generation","generation"}),
 ("赛车/驾驶",
  r"赛车|竞速|拉力|漂移|驾驶|卡丁|开车|越野|racing|racer|rally|drift|kart|driving|\bcar\b|\bcars\b|truck|卡车|飙车|公路|摩托|车辆|载具|飞行|飞鸟|flight|flying|飞机|\bfly\b|飞越",
  {"racing","driving","rally","drift","kart","car","cars","flight","flying","vehicle","racer"}),
 ("平台/动作/RPG",
  r"竞技场|arena|骑士|knight|法师|攀爬|climb|brawl|ninja|忍者|平台跳跃|platform|动作|rpg|roguelike|肉鸽|roguelite|战斗|打boss|boss|格斗|射击|fps|shooter|冒险|adventure|地牢|dungeon|dungeon crawl|类银河|metroidvania|弹幕|combat|\baction|\bhack|slash|潜行|stealth|角色扮演|crawler|探索.*(迷宫|地下)|迷宫|maze|跑酷|parkour|npc|战士|猎",
  {"platformer","action","rpg","roguelike","roguelite","combat","boss","fps","shooter","adventure","dungeon","metroidvania","arpg","stealth","souls-like","bullet-hell","co-op","multiplayer","fighting"}),
 ("解谜/物理玩具",
  r"齿轮|摩尔斯|精密操作|着陆|lander|解谜|谜题|puzzle|物理|physics|玩具|toy|堆叠|ragdoll|布娃娃|机关|逃脱|escape|密室|益智|整理|推箱|拼|脑|logic|逻辑|沙盒玩具|破坏|destruct|软体|流体|fluid|粘性|碰撞|台球|弹珠|pinball|撞|滚|不稳|平衡|torque|搭桥|bridge",
  {"puzzle","physics","toy","escape","destruction","ragdoll","pinball","logic","fluid","softbody","physics-toy","brain"}),
 ("航海/开放世界",
  r"航海|航行|海盗|船|sail|\bships?\b|boat|ocean|海洋|开放世界|open.?world|岛|island|群岛|漂流|海岸|海滩|贸易|trade|探索|exploration|explore|旅行|journey|徒步|远征|深海|潜水|dive|飞艇|airship|太空.*探|space.*explor|宇宙|太空|星际|space",
  {"sailing","exploration","open-world","island","ocean","ship","sea","boat","trade","space","explore","journey","naval","pirate"}),
 ("温馨/治愈/园艺",
  r"水族|鱼缸|钓鱼|收获|田野|农事|拔草|荒园|植物|花卉|harvest|aquarium|fishing|温馨|治愈|放松|解压|舒适|cozy|comfy|wholesome|relax|园艺|花园|庭园|种植|农场|种花|种菜|farm|garden|\bplants?\b|禅|chill|慢节奏|慢游戏|可爱|猫|狗|水豚|capybara|毛绒|烘焙|烹饪|菜谱|咖啡|小屋|露营|camping|campfire|养成|宠物|\bpets?\b|\bcats?\b|蘑菇|盆景|bonsai",
  {"cozy","cozy-game","relaxing","wholesome","farming","garden","gardening","chill","comfy","cute","cats","pets","bonsai","cooking","camping","slow","healing"}),
 ("开发动态/工具",
  r"工具|引擎|插件|编辑器|模板|\bstarter|教程|tutorial|devlog|开发日志|开发动态|开发者|引擎移植|\bengine|framework|library|\bkit\b|工程|示例|toolkit|editor|plugin|addon|breakdown|移植|\bport\b|runtime|原型|prototype|\bwip\b|开源|open.?source|制作谈|幕后|游戏制作|游戏开发|gamedev|indiedev|screenshotsaturday",
  {"devlog","tool","tools","engine","plugin","tutorial","editor","starter-kit","kit","prototype","wip","opensource","open-source","gamedev","jam","framework","library","asset","breakdown"}),
]
NAMES = [g[0] for g in G]
OTHER = "其他"
# 这些标签太泛，不作为打分依据
GENERIC_TAGS = {"game","3d_game","3d","itch","steam","x","x-bookmark","search","threejs","indie","free","web","browser","80lv","godot","unity","stylized","low-poly","lowpoly","pixel","pixelart","isometric","webgpu","2d","unreal","blender","screenshot","new","hot","fun"}

def score(item):
    title = item.get("title","") or ""
    summ = item.get("summary","") or ""
    tags = [t.lower() for t in (item.get("tags") or [])]
    text = (title + " " + summ).lower()
    res = {}
    for name, rx, tagset in G:
        s = 0.0
        # tag 命中 = 强信号
        for t in tags:
            if t in tagset: s += 3
        # 标题命中更强，摘要其次
        ms_t = len(re.findall(rx, title.lower()))
        ms_s = len(re.findall(rx, summ.lower()))
        s += min(ms_t,2) * 2 + min(ms_s,3) * 1
        if name == "骑砍/战争": s *= 2   # 用户口味偏骑砍/战争：命中加权，保证能成为主/副类型
        if s: res[name] = s
    return res

# 兜底判断需要的软标签(分数低但必须给点东西)
def fallback(item):
    src = item.get("source")
    text = ((item.get("title") or "") + " " + (item.get("summary") or "")).lower()
    tags = [t.lower() for t in (item.get("tags") or [])]
    if re.search(r"挂机|idle|增量|incremental|clicker", text) or "idle" in tags:
        return ["城建/殖民/经营"]
    if re.search(r"像素|pixel|2d", text) or "pixelart" in tags or "pixel" in tags:
        return ["平台/动作/RPG"]
    if re.search(r"叙事|narrative|story|walking sim|氛围", text):
        return ["航海/开放世界"]
    if src in ("x", "threejs", "80lv"):
        return ["开发动态/工具"]   # 无信息量的 X 收藏/实机动态：归入开发动态
    return None

def classify(item):
    s = score(item)
    if not s:
        fb = fallback(item)
        return fb if fb else [OTHER]
    ranked = sorted(s.items(), key=lambda kv: (-kv[1], NAMES.index(kv[0])))
    top = ranked[0][1]
    out = [ranked[0][0]]
    for name, v in ranked[1:3]:
        if v >= 3 and v >= top * 0.5:
            out.append(name)
    # 「开发动态/工具」和「其他」不做副标签抢位，除非它是唯一命中
    if len(out) > 1 and "开发动态/工具" in out[1:]:
        out.remove("开发动态/工具")
    return out

def main():
    only_missing = "--only-missing" in sys.argv
    check = "--check" in sys.argv
    data = json.load(open(PATH, encoding="utf-8"))
    ovr = json.load(open(OVR, encoding="utf-8")) if os.path.exists(OVR) else {}
    changed = 0
    counts = {}
    n = 0
    for it in data:
        if it.get("type") != "game":
            continue
        n += 1
        if only_missing and it.get("genres"):
            g = it["genres"]
        else:
            g = ovr.get(it.get("url")) or ovr.get(it.get("id")) or ovr.get(it.get("title")) or classify(it)
            if it.get("genres") != g:
                it["genres"] = g
                changed += 1
        for x in g: counts[x] = counts.get(x,0)+1
    if not check and changed:
        with open(PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    # 构建标记(不提交，.gitignore 忽略)：线上能看到脚本是否在构建时跑过
    if not check:
        import datetime
        with open(os.path.join(ROOT, "public", "data", "genres-build.json"), "w", encoding="utf-8") as f:
            json.dump({"ranAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "games": n, "changed": changed, "other": counts.get(OTHER, 0)}, f)
    print(f"games={n} changed={changed}")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"{v:5d}  {k}")
    untagged = counts.get(OTHER,0)
    print(f"其他占比 {untagged/max(n,1):.1%}")

if __name__ == "__main__":
    main()
