import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 配置
 *
 * 为什么用 Capacitor 而不是 TWA / 纯 PWA：
 * 桌面小组件必须写原生 Android 代码（AppWidgetProvider），
 * TWA 只是一个剥掉浏览器外壳的 Chrome，做不到这件事。
 * 而 Finch 的数据证明小组件是安卓端留存的第一杠杆。
 */
const config: CapacitorConfig = {
  appId: "com.softlings.game",
  appName: "Softlings",
  webDir: "dist",

  // 纯单机游戏，不需要服务器，禁用掉所有联网相关的默认行为
  server: {
    androidScheme: "https",
  },

  android: {
    // 游戏是浅色主题，状态栏也用浅色底 + 深色图标
    backgroundColor: "#BFE9FF",
  },

  plugins: {
    SplashScreen: {
      // 启动图停留时间刻意短：游戏本身加载就快，让玩家等太久是负体验
      launchShowDuration: 900,
      backgroundColor: "#BFE9FF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
