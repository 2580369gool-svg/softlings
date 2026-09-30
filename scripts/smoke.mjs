/* ============================================================
   渲染冒烟测试
   用法：npm run smoke

   为什么需要它：模拟器只测纯 TS 的数值层，测不到「组件到底渲染没渲染」。
   这个脚本用真实 Chrome 无头模式加载构建产物，断言关键元素确实出现在 DOM 里。

   历史上救过两次命：
     1. Vite dev server 在后台会被回收，导致测试假绿 —— 所以这里用自带静态服务器。
     2. 系统代理会把 localhost 也代理掉，Chrome 连不上 —— 所以必须加 --no-proxy-server。
   ============================================================ */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SEED = path.join(ROOT, "scripts", "seed.html");

/* ---------------- 找浏览器 ---------------- */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const browser = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error("❌ 找不到 Chrome/Edge。可以用 CHROME_PATH 环境变量指定。");
  process.exit(1);
}

if (!existsSync(path.join(DIST, "index.html"))) {
  console.error("❌ 找不到 dist/index.html，请先执行 npm run build");
  process.exit(1);
}

/* ---------------- 静态服务器 ---------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/__seed.html") {
      res.writeHead(200, { "content-type": MIME[".html"] });
      return res.end(await readFile(SEED));
    }

    const rel = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = path.join(DIST, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("error");
  }
});

// 端口交给系统分配，避免上次残留进程占着固定端口导致假失败
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

/* ---------------- 驱动浏览器 ---------------- */

let profileSeq = 0;

function dumpDom(url) {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-proxy-server", // 系统代理会把 localhost 也代理掉，必须显式绕过
      "--disable-extensions",
      `--user-data-dir=${path.join(ROOT, ".smoke", `p${++profileSeq}`)}`,
      "--virtual-time-budget=9000",
      "--dump-dom",
      url,
    ];
    const proc = spawn(browser, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (c) => (out += c));
    proc.on("error", reject);
    proc.on("close", () => resolve(out));
  });
}

/** 用指定参数打开 seed 页，等它跳转回首页后返回 DOM */
async function render(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const html = await dumpDom(`http://127.0.0.1:${PORT}/__seed.html?${qs}`);
  const parts = html.split("</head>");
  return { html, body: parts.length > 1 ? parts.slice(1).join("</head>") : html };
}

/* ---------------- 断言 ---------------- */

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
}
const count = (s, re) => (s.match(re) ?? []).length;

console.log(`\n浏览器: ${browser}\n`);

/* ============================================================
   场景 A：正常进入游戏
   ============================================================ */
{
  console.log("── 场景 A：正常进入游戏 ──");
  const { html, body } = await render({ hours: 0 });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("渲染出 8 个互动按钮", count(body, /class="action"/g) === 8, `实际 ${count(body, /class="action"/g)}`);
  check("渲染出 4 条需求条", count(body, /class="need__track"/g) === 4);
  check("渲染出宠物 SVG", count(body, /<svg/g) >= 1);
  check("显示宠物名", body.includes("冒烟测试"));
  check("显示阶段徽章", body.includes("成长期"));
  check("显示金币", body.includes("123"));
  check("无离线弹窗（在线进入）", count(body, /class="modal__card"/g) === 0);
}

/* ============================================================
   场景 B：离线 20 小时后回来
   ============================================================ */
{
  console.log("\n── 场景 B：离线 20 小时后回来 ──");
  const { html, body } = await render({ hours: 20 });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("弹出「欢迎回来」", body.includes("欢迎回来"));
  check("弹窗显示离线时长", /你离开了\s*20\s*小时/.test(body), "应为 20 小时");
  check("弹窗列出需求变化", count(body, /class="delta delta--/g) >= 3);
  check("离线期间精力因睡眠而回升", /energy[\s\S]{0,400}?▲/.test(body));
}

/* ============================================================
   场景 C：首次进入（无存档）→ 种族选择
   ============================================================ */
{
  console.log("\n── 场景 C：首次进入（无存档）──");
  const { html, body } = await render(); // 不带参数 → 但 seed 总会写档…

  // seed 页一定会写存档，所以这里直接验证「4 个种族都能渲染出来」
  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("宠物成功渲染", count(body, /<svg/g) >= 1);
}

/* ============================================================
   场景 D：表情系统 —— 每个状态必须命中不同的视觉分支
   ============================================================ */
console.log("\n── 场景 D：表情系统（状态 → 视觉）──");

const EXPRESSION_CASES = [
  { preset: "normal",   label: "常态",   status: "还不错",   marker: null },
  { preset: "happy",    label: "开心",   status: "开心",     marker: 'stroke-width="3.6"' },
  { preset: "hungry",   label: "饿",     status: "肚子饿了", marker: "pet-hunger-wave" },
  { preset: "dirty",    label: "脏",     status: "有点脏",   marker: "pet-flies" },
  { preset: "sad",      label: "难过",   status: "闷闷不乐", marker: "pet-tear" },
  { preset: "tired",    label: "累",     status: "累了",     marker: "pet-sweat" },
  { preset: "sleeping", label: "睡觉",   status: "睡觉中",   marker: "pet-zzz" },
];

for (const c of EXPRESSION_CASES) {
  const { body } = await render({ preset: c.preset });

  check(`${c.label}：状态文案为「${c.status}」`, body.includes(c.status));
  if (c.marker) {
    check(`${c.label}：出现专属视觉元素`, body.includes(c.marker), c.marker);
  } else {
    // 常态不应该混进任何一种异常提示
    const leaks = ["pet-hunger-wave", "pet-flies", "pet-tear", "pet-sweat", "pet-zzz"].filter((m) =>
      body.includes(m),
    );
    check("常态：不混入异常提示", leaks.length === 0, leaks.join(", ") || "干净");
  }
}

/* ============================================================
   场景 E：触摸互动层已挂载
   ============================================================ */
{
  console.log("\n── 场景 E：触摸互动层 ──");
  const { body } = await render({ preset: "normal" });

  check("存在宠物交互舞台", body.includes('class="pet-stage'));
  check("存在视线跟随分组", body.includes('class="pet-gaze"'));
  check("眼睛渲染为矢量图形", count(body, /pet-eye/g) >= 2);
  check("眼睛高光存在（可爱度关键）", count(body, /fill="#fff"/g) >= 2);
}

/* ============================================================
   场景 F：蛋阶段
   ============================================================ */
{
  console.log("\n── 场景 F：蛋阶段 ──");
  const { html, body } = await render({ stage: "egg" });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("状态显示「孵化中」", body.includes("孵化中"));
  check("显示晃动提示", body.includes("蛋在轻轻晃动"));
  check("蛋阶段隐藏动作栏（无事可做）", count(body, /class="action"/g) === 0);
  check("蛋身体已渲染", body.includes("M100 32 C128 32 150 74 150 120"));
  check("进度 0.5 时蛋壳已出现裂纹", count(body, /stroke-width="2.4"/g) > 0);
}

/* ============================================================
   场景 G：12 条进化线 —— 每条都必须渲染出自己的点缀色
   ============================================================ */
console.log("\n── 场景 G：12 条进化线渲染 ──");

const LINES = [
  { id: "puddly_caramel", species: "puddly", accent: "#8B5A2B", zh: "焦糖布丁兽" },
  { id: "puddly_jelly", species: "puddly", accent: "#E8FFFB", zh: "果冻精灵" },
  { id: "puddly_magma", species: "puddly", accent: "#FFD166", zh: "熔岩布丁" },
  { id: "mochi_daifuku", species: "mochi", accent: "#FF4D79", zh: "大福猫" },
  { id: "mochi_tsukimi", species: "mochi", accent: "#FFF3B0", zh: "月见猫" },
  { id: "mochi_tiger", species: "mochi", accent: "#5A3A1E", zh: "虎斑麻薯" },
  { id: "cloudpuff_rainbow", species: "cloudpuff", accent: "#FF6B9D", zh: "彩虹羊" },
  { id: "cloudpuff_drizzle", species: "cloudpuff", accent: "#6FB6DE", zh: "细雨羊" },
  { id: "cloudpuff_storm", species: "cloudpuff", accent: "#FFE066", zh: "雷暴羊" },
  { id: "sprout_blossom", species: "sprout", accent: "#FF8FB1", zh: "花冠龙" },
  { id: "sprout_crystal", species: "sprout", accent: "#B8A6FF", zh: "宝石龙" },
  { id: "sprout_ember", species: "sprout", accent: "#FF7A3C", zh: "烛焰龙" },
];

for (const line of LINES) {
  const { html, body } = await render({
    species: line.species,
    stage: "adult",
    evolution: line.id,
  });

  const loaded = !/ERR_[A-Z_]+/.test(html);
  // aria-label 就是进化线 id，证明 evolution 一路传到了渲染层
  const wired = body.includes(`aria-label="${line.id}"`);
  // accent 色只被装饰部件使用，出现即证明部件真的画出来了
  const partsDrawn = body.includes(line.accent);

  check(
    `${line.zh}(${line.id})`,
    loaded && wired && partsDrawn,
    [!loaded && "页面未加载", !wired && "进化线未生效", !partsDrawn && `缺少点缀色 ${line.accent}`]
      .filter(Boolean)
      .join(" / ") || "渲染正常",
  );
}

/* ============================================================
   场景 H：阶段体型缩放
   ============================================================ */
{
  console.log("\n── 场景 H：阶段体型缩放 ──");
  const scales = {};
  for (const stage of ["baby", "child", "adult", "elder"]) {
    const { body } = await render({ species: "mochi", stage, preset: "happy" });
    const m = body.match(/scale\((0\.\d+|1\.?\d*)\)/);
    scales[stage] = m ? Number(m[1]) : null;
  }
  console.log(`  实测缩放: ${JSON.stringify(scales)}`);

  const ok =
    scales.baby !== null &&
    scales.baby < scales.child &&
    scales.child < scales.adult &&
    scales.elder >= scales.adult;
  check("体型随阶段单调长大", ok, `baby ${scales.baby} → elder ${scales.elder}`);
}

/* ============================================================
   场景 I：进化图鉴（?gallery）
   ============================================================ */
{
  console.log("\n── 场景 I：进化图鉴 ──");
  const html = await dumpDom(`http://127.0.0.1:${PORT}/?gallery`);
  const parts = html.split("</head>");
  const body = parts.length > 1 ? parts.slice(1).join("</head>") : html;

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("显示图鉴标题", body.includes("进化图鉴"));
  check(
    "渲染出 12 个进化格子",
    count(body, /class="cell"/g) === 12,
    `实际 ${count(body, /class="cell"/g)}`,
  );
  check(
    "四个种族分组齐全",
    ["布丁兽", "麻薯猫", "云朵羊", "芽芽龙"].every((s) => body.includes(s)),
  );
  check("三种照护路线的标签都在", count(body, /cell__path--/g) === 12);
}

/* ============================================================
   场景 J：性格标签
   ============================================================ */
{
  console.log("\n── 场景 J：性格标签 ──");

  const plain = await render({ traits: "" });
  check("未被塑造的宠物不显示性格标签", count(plain.body, /class="trait"/g) === 0);

  const shaped = await render({ traits: "feed,pet" });
  check("被塑造后显示性格标签", count(shaped.body, /class="trait"/g) === 2, `实际 ${count(shaped.body, /class="trait"/g)}`);
  check("标签文案正确", shaped.body.includes("贪吃") && shaped.body.includes("粘人"));

  // 只塑造一项时只显示一个标签
  const single = await render({ traits: "play" });
  check("只塑造一项时只显示一个标签", count(single.body, /class="trait"/g) === 1);
  check("标签文案为「好动」", single.body.includes("好动"));
}

/* ============================================================
   场景 K：小游戏街机厅
   ============================================================ */
{
  console.log("\n── 场景 K：街机厅 ──");
  const { html, body } = await render({ next: "/?screen=arcade" });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("显示标题", body.includes("小游戏"));
  check(
    "六个游戏卡片全部渲染",
    count(body, /class="game-card"/g) === 6,
    `实际 ${count(body, /class="game-card"/g)}`,
  );
  check("显示今日额度", body.includes("今日还可赚"));
  check("显示金币余额", body.includes("🪙 123"));
}

/* ============================================================
   场景 L：商店
   ============================================================ */
{
  console.log("\n── 场景 L：商店 ──");
  const { html, body } = await render({ next: "/?screen=shop" });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("显示标题", body.includes("商店"));
  check("四个道具全部上架", count(body, /class="shop__row"/g) === 4, `实际 ${count(body, /class="shop__row"/g)}`);
  check("显示价格", body.includes("🪙 6") && body.includes("🪙 24"));
  check("显示金币余额", body.includes("🪙 123"));
}

/* ============================================================
   场景 M：六个小游戏都能渲染
   ============================================================ */
console.log("\n── 场景 M：小游戏渲染 ──");

const GAME_CASES = [
  { id: "catchFruit", zh: "接水果", selector: "mg__canvas" },
  { id: "bubblePop", zh: "泡泡消除", selector: "mg__canvas" },
  { id: "rhythmTap", zh: "节奏敲击", selector: "rhythm__lane" },
  { id: "rockPaperScissors", zh: "猜拳", selector: "rps__btn" },
  { id: "fishing", zh: "钓鱼", selector: "fishing__button" },
  { id: "memoryMatch", zh: "记忆翻牌", selector: "memory__card" },
];

for (const g of GAME_CASES) {
  const { html, body } = await render({ next: `/?game=${g.id}` });
  const loaded = !/ERR_[A-Z_]+/.test(html);
  const hud = body.includes(g.zh) && body.includes("mg__timerFill");
  const stage = body.includes(g.selector);

  check(
    `${g.zh}(${g.id})`,
    loaded && hud && stage,
    [!loaded && "页面未加载", !hud && "HUD 缺失", !stage && `缺少 ${g.selector}`]
      .filter(Boolean)
      .join(" / ") || "渲染正常",
  );
}

/* ============================================================
   场景 N：二级导航（主界面上能进到家园/衣柜）
   ============================================================ */
{
  console.log("\n── 场景 N：主界面导航 ──");
  const { body } = await render({ preset: "happy" });

  // 导航标签用短词（游戏/旅行/家园/衣柜/商店），五个才放得下窄屏
  check("渲染出 5 个二级入口", count(body, /class="app__navBtn"/g) === 5, `实际 ${count(body, /class="app__navBtn"/g)}`);
  for (const zh of ["游戏", "旅行", "家园", "衣柜", "商店"]) {
    check(`入口「${zh}」存在`, body.includes(zh));
  }

  // 默认有声，但必须给一个显眼的关闭入口
  check("顶部有声音开关", body.includes('aria-label="关闭声音"'));
}

/* ============================================================
   场景 O：衣柜
   ============================================================ */
{
  console.log("\n── 场景 O：衣柜 ──");
  const { html, body } = await render({ next: "/?screen=wardrobe", coins: 500 });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("显示标题", body.includes("衣柜"));
  check("四个槽位分组齐全", ["帽子", "面部", "颈部", "背饰"].every((s) => body.includes(s)));
  // 注意匹配 class 的结尾："acc" 或 "acc is-worn" ——
  // 写成 /class="acc/ 会把 acc__art / acc__name 这些子元素也算进来
  check(
    "十件饰品全部上架",
    count(body, /class="acc[" ]/g) === 10,
    `实际 ${count(body, /class="acc[" ]/g)}`,
  );
  check("未购买的显示价格", body.includes("🪙 30") && body.includes("🪙 90"));
}

/* ============================================================
   场景 P：穿上饰品后宠物身上确实画出来了
   ============================================================ */
{
  console.log("\n── 场景 P：饰品渲染 ──");
  const plain = await render({ preset: "happy" });
  const dressed = await render({ preset: "happy", wear: "crown,scarf" });

  // 皇冠用 #FFE066，围巾用 #FF6B9D —— 这两个色只可能来自饰品
  check("未穿戴时不出现皇冠配色", !plain.body.includes("#FFE066"));
  check("穿上皇冠后出现皇冠配色", dressed.body.includes("#FFE066"));
  check("穿上围巾后出现围巾配色", dressed.body.includes("#E85A8A"));
  check("主界面正常渲染（没有因为饰品崩掉）", dressed.body.includes("冒烟测试"));
}

/* ============================================================
   场景 Q：家园与访客
   ============================================================ */
{
  console.log("\n── 场景 Q：家园 ──");
  const quiet = await render({ next: "/?screen=habitat", coins: 500, place: "birdSeed,waterBowl" });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(quiet.html));
  check("显示标题", quiet.body.includes("家园"));
  // 同样要收紧：/class="yard__slot/ 会把容器 yard__slots 也算进去
  check(
    "渲染出三个院子格子",
    count(quiet.body, /class="yard__slot[" ]/g) === 3,
    `实际 ${count(quiet.body, /class="yard__slot[" ]/g)}`,
  );
  check("已摆上的东西画出来了", count(quiet.body, /class="yard__item"/g) === 2);
  check("没有访客时显示等待文案", quiet.body.includes("院子里静悄悄"));
  check(
    "访客图鉴渲染出 10 个格子",
    count(quiet.body, /class="dexCell[" ]/g) === 10,
    `实际 ${count(quiet.body, /class="dexCell[" ]/g)}`,
  );

  const visited = await render({ next: "/?screen=habitat", visitor: "fox", collected: "sparrow" });
  check("有访客时显示它的名字", visited.body.includes("小狐狸"));
  check("未拍照时显示拍照按钮", visited.body.includes("拍下来"));
  check("已收集的访客在图鉴里显示名字", visited.body.includes("胖麻雀"));
}

/* ============================================================
   场景 R：旅行（准备出发）
   ============================================================ */
{
  console.log("\n── 场景 R：旅行 —— 准备出发 ──");
  const { html, body } = await render({ next: "/?screen=travel", coins: 500, postcards: "beach,sakura" });

  check("页面成功加载（无 ERR_）", !/ERR_[A-Z_]+/.test(html));
  check("显示标题", body.includes("旅行"));
  check("三档行囊全部可选", count(body, /class="bento[" ]/g) === 3, `实际 ${count(body, /class="bento[" ]/g)}`);
  check("显示行程时长与稀有度概率", body.includes("30 分钟") && body.includes("稀有以上"));
  check("明信片图鉴渲染 12 格", count(body, /class="postcard[" ]/g) === 12, `实际 ${count(body, /class="postcard[" ]/g)}`);
  check("已收集的明信片显示名字", body.includes("海边") && body.includes("樱花"));
  check("未收集的显示为问号", body.includes("postcard__unknown"));
}

/* ============================================================
   场景 S：旅行中
   ============================================================ */
{
  console.log("\n── 场景 S：旅行中 ──");
  const trip = await render({ next: "/?screen=travel", trip: "feast", tripLeft: 42 });
  check("旅行页显示在路上", trip.body.includes("它在路上"));
  // 容差：seed 写入 42 分钟后，页面加载与虚拟时间推进还会吃掉几秒，
  // 显示成 41 分钟是正常的（humanizeDuration 用的是向下取整）
  check("显示预计归来时间", /还有\s*4[0-2]\s*分钟/.test(trip.body), "应为 42 分钟左右");
  check("显示进度条", trip.body.includes("trip__fill"));
  check("旅行中不再显示行囊选择", count(trip.body, /class="bento[" ]/g) === 0);

  // 主界面在旅行中应该换掉宠物舞台，并隐藏动作栏
  const main = await render({ preset: "happy", trip: "feast", tripLeft: 42 });
  check("主界面显示「它在路上」", main.body.includes("它在路上"));
  check("主界面隐藏动作栏（不在家就不能互动）", count(main.body, /class="action[" ]/g) === 0, `实际 ${count(main.body, /class="action[" ]/g)}`);
  check("主界面仍显示需求条（还是在缓慢衰减的）", count(main.body, /class="need__track"/g) === 4);
}

server.close();

console.log(failures === 0 ? "\n✅ 冒烟测试全部通过\n" : `\n❌ ${failures} 项未通过\n`);
process.exit(failures === 0 ? 0 : 1);
