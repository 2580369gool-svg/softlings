/* ============================================================
   应用图标生成器
   用法：npm run icons

   用 Chrome 无头模式把 scripts/icon.html 渲染成各尺寸 PNG，
   直接写进 Android 工程的 mipmap / drawable 目录。

   为什么这么做：本机没有 Android Studio，也没有图像处理库
   （sharp / canvas 都要装原生依赖）。而 Chrome 本来就在，
   它能渲染渐变、圆角、阴影和 SVG —— 正好够用，还保证了
   图标和游戏内宠物是同一套造型。
   ============================================================ */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const ICON_HTML = path.join(ROOT, "scripts", "icon.html");

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
  console.error("❌ 找不到 Chrome/Edge，可用 CHROME_PATH 指定");
  process.exit(1);
}

if (!existsSync(RES)) {
  console.error("❌ 找不到 Android 工程，请先执行 npx cap add android");
  process.exit(1);
}

/* ---------------- 要生成的图标清单 ---------------- */

/** 传统图标（Android 7 及以下）与自适应图标前景的尺寸规范 */
const DENSITIES = [
  { name: "mdpi", legacy: 48, foreground: 108 },
  { name: "hdpi", legacy: 72, foreground: 162 },
  { name: "xhdpi", legacy: 96, foreground: 216 },
  { name: "xxhdpi", legacy: 144, foreground: 324 },
  { name: "xxxhdpi", legacy: 192, foreground: 432 },
];

/** 启动图尺寸（竖屏为主） */
const SPLASH = [
  { dir: "drawable-port-mdpi", w: 320, h: 480 },
  { dir: "drawable-port-hdpi", w: 480, h: 800 },
  { dir: "drawable-port-xhdpi", w: 720, h: 1280 },
  { dir: "drawable-port-xxhdpi", w: 960, h: 1600 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { dir: "drawable-land-mdpi", w: 480, h: 320 },
  { dir: "drawable-land-hdpi", w: 800, h: 480 },
  { dir: "drawable-land-xhdpi", w: 1280, h: 720 },
  { dir: "drawable-land-xxhdpi", w: 1600, h: 960 },
  { dir: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
];

/* ---------------- 驱动浏览器截图 ---------------- */

/** 用一个独立的临时 profile，避免被系统代理和已有配置干扰 */
const PROFILE = path.join(ROOT, ".icons-profile");

function shoot(outPath, w, h, mode, transparent) {
  return new Promise((resolve, reject) => {
    const url = `file:///${ICON_HTML.replace(/\\/g, "/")}?mode=${mode}`;
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-proxy-server",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--user-data-dir=${PROFILE}`,
      `--window-size=${w},${h}`,
      `--screenshot=${outPath}`,
      ...(transparent ? ["--default-background-color=00000000"] : []),
      url,
    ];

    const proc = spawn(browser, args, { stdio: ["ignore", "ignore", "ignore"] });
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`chrome exit ${code}`))));
  });
}

await rm(PROFILE, { recursive: true, force: true });
await mkdir(PROFILE, { recursive: true });

let made = 0;

/* ---------------- 应用图标 ---------------- */

for (const d of DENSITIES) {
  const dir = path.join(RES, `mipmap-${d.name}`);
  await mkdir(dir, { recursive: true });

  // 传统方形图标
  await shoot(path.join(dir, "ic_launcher.png"), d.legacy, d.legacy, "full", false);
  // 圆形图标（部分启动器会用它）
  await shoot(path.join(dir, "ic_launcher_round.png"), d.legacy, d.legacy, "full", false);
  // 自适应图标的前景层：透明底，内容缩进安全区
  await shoot(path.join(dir, "ic_launcher_foreground.png"), d.foreground, d.foreground, "foreground", true);

  made += 3;
  console.log(`  ✓ mipmap-${d.name}  ${d.legacy}px / ${d.foreground}px`);
}

/* ---------------- 启动图 ---------------- */

for (const s of SPLASH) {
  const dir = path.join(RES, s.dir);
  await mkdir(dir, { recursive: true });
  await shoot(path.join(dir, "splash.png"), s.w, s.h, "full", false);
  made += 1;
  console.log(`  ✓ ${s.dir}  ${s.w}×${s.h}`);
}

/* 部分 Capacitor 版本还会读 drawable/splash.png，一并给一张 */
await mkdir(path.join(RES, "drawable"), { recursive: true });
await shoot(path.join(RES, "drawable", "splash.png"), 1280, 1920, "full", false);
made += 1;

await rm(PROFILE, { recursive: true, force: true });

// 自适应图标的背景色。
//
// ⚠️ 必须写进 Capacitor 原有的 values/ic_launcher_background.xml，
// 不能新建一个 values/colors.xml —— 同一个 values 目录里出现两个同名
// color 资源，资源合并任务（MergeResources）会直接构建失败，
// 而且报错只给一个 Kotlin 堆栈，完全不提「重复资源」四个字，极难定位。
const backgroundPath = path.join(RES, "values", "ic_launcher_background.xml");
await writeFile(
  backgroundPath,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- 自适应图标的背景层，与 icon.html 的渐变起点保持一致 -->
    <color name="ic_launcher_background">#BFE9FF</color>
</resources>
`,
  "utf8",
);

console.log(`\n✅ 共生成 ${made} 个 PNG，写入 ${path.relative(ROOT, RES)}\n`);
