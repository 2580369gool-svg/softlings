/* ============================================================
   手机联调启动器
   用法：npm run mobile
   然后手机扫终端里的二维码即可。

   为什么需要专门写一个：这台机器装了 Clash/Mihomo 代理，
   networkInterfaces() 会把虚拟网卡（198.18.x.x）排在前面，
   直接取第一个 IP 会拿到一个手机根本连不上的地址。
   ============================================================ */

import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import qrcode from "qrcode-terminal";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 5173);

/* ---------------- 挑一个手机能连上的网卡 ---------------- */

/** 虚拟网卡 / 代理 / 容器网络的名称关键词，一律排除 */
const VIRTUAL_HINTS = [
  "mihomo", "clash", "vethernet", "hyper-v", "vmware", "virtualbox",
  "virtual", "wsl", "docker", "loopback", "tap", "tun", "bluetooth",
];

/** 优先选择的真实网卡关键词 */
const PHYSICAL_HINTS = ["wlan", "wi-fi", "wifi", "无线", "ethernet", "以太网", "en", "eth"];

/** 这些网段不是给你家局域网用的 */
function isUsableIP(ip) {
  if (ip.startsWith("127.")) return false;      // 回环
  if (ip.startsWith("169.254.")) return false;  // 链路本地（没拿到 DHCP）
  if (ip.startsWith("198.18.")) return false;   // Clash 的 TUN 假地址
  if (ip.startsWith("198.19.")) return false;   // Clash 的 TUN 假地址
  if (ip.startsWith("100.64.")) return false;   // 运营商级 NAT
  return true;
}

function collectCandidates() {
  const out = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      // Node 18+ 是字符串 "IPv4"，老版本是数字 4
      const isV4 = a.family === "IPv4" || a.family === 4;
      if (!isV4 || a.internal || !isUsableIP(a.address)) continue;
      const lower = name.toLowerCase();
      out.push({
        name,
        address: a.address,
        virtual: VIRTUAL_HINTS.some((h) => lower.includes(h)),
        preferred: PHYSICAL_HINTS.some((h) => lower.includes(h)),
      });
    }
  }
  // 真实网卡优先，虚拟网卡排最后
  return out.sort((a, b) => Number(b.preferred) - Number(a.preferred));
}

const candidates = collectCandidates();
const best = candidates.find((c) => !c.virtual) ?? candidates[0];

if (!best) {
  console.error("\n❌ 没找到可用的局域网 IP。请确认电脑已连上 WiFi 或网线。\n");
  process.exit(1);
}

/* ---------------- 启动 Vite ---------------- */

console.log("\n启动中…\n");

// 直接跑 vite 的 JS 入口，而不是 spawn "npx.cmd"。
// Node 的安全补丁（CVE-2024-27980）不允许不带 shell 直接 spawn .cmd 文件，
// 会抛 EINVAL；绕过 shell 同时也避免了参数转义的坑。
const viteBin = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");

const vite = spawn(
  process.execPath,
  [viteBin, "--host", "0.0.0.0", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
);

const url = `http://${best.address}:${PORT}`;
let bannerShown = false;

function showBanner() {
  if (bannerShown) return;
  bannerShown = true;

  const line = "═".repeat(52);
  console.log(`\n╔${line}╗`);
  console.log(`║  手机扫这个二维码，或直接输入网址                ║`);
  console.log(`╚${line}╝\n`);
  qrcode.generate(url, { small: true }, (qr) => console.log(qr));
  console.log(`   📱  ${url}`);
  console.log(`   🖥️   网卡: ${best.name}\n`);

  if (candidates.length > 1) {
    console.log("   连不上的话，换下面这些地址试试：");
    for (const c of candidates) {
      if (c.address === best.address) continue;
      console.log(`     ${c.virtual ? "⚠️ " : "   "}http://${c.address}:${PORT}   (${c.name})`);
    }
    console.log();
  }

  console.log("   ⚠️ 首次运行 Windows 会弹防火墙提示，必须点【允许访问】");
  console.log("   ⚠️ 手机要和电脑连同一个 WiFi");
  console.log("   ⚠️ 按 Ctrl+C 停止\n");
}

vite.stdout.on("data", (buf) => {
  const text = String(buf);
  process.stdout.write(text);
  if (/ready in|Local:/i.test(text)) showBanner();
});

vite.stderr.on("data", (buf) => process.stderr.write(buf));

vite.on("close", (code) => {
  if (code !== 0 && !bannerShown) {
    console.error(`\n❌ Vite 启动失败（退出码 ${code}）。端口 ${PORT} 可能被占用。\n`);
  }
  process.exit(code ?? 0);
});

// 兜底：某些终端下拿不到 vite 的输出，3 秒后也把二维码打出来
setTimeout(showBanner, 3000);

process.on("SIGINT", () => {
  vite.kill();
  process.exit(0);
});
