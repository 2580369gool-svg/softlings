# 小软糖 Softlings

纯代码生成的宠物养成游戏，目标是安卓单机游玩。
**仓库里没有任何位图或音频素材** —— 全部美术是 SVG/CSS，全部声音是 Web Audio 现场合成。

## 常用命令

```bash
npm run dev        # 开发服务器
npm run build      # 构建 Web 产物
npm run check      # ★ 完整校验：数值模拟 + 渲染冒烟（改完东西必跑）
npm run simulate   # 只跑数值/一致性断言
npm run smoke      # 只跑 Chrome 无头渲染断言
npm run icons      # 重新生成安卓图标与启动图（改宠物造型后可跑）
npm run mobile     # 手机联调，打印二维码 + 局域网地址
npm run lint       # oxlint
```

安卓：`npx cap sync android` 同步 Web 产物到原生工程。**本机没有 Java/Android SDK，无法本地编译 APK，一切走 GitHub Actions 云构建。**

## 调试入口（URL 参数）

| 参数 | 用途 |
|---|---|
| `?gallery` | 进化图鉴，一次看全 18 条进化线 |
| `?reset` | 清档重开（用来重看破壳动画） |
| `?screen=arcade\|shop\|wardrobe\|habitat\|travel` | 直达二级界面 |
| `?game=<id>` | 直接开一局小游戏 |

`scripts/seed.html` 可以写入任意状态的存档（`?preset=sad&hours=20&species=mochi&wear=crown&visitor=fox`），冒烟测试靠它覆盖各种分支。

## 架构

```
src/
  core/        纯 TS 模拟层，零 DOM 依赖，可单测
    balance.ts   ★ 所有可调数值集中在此，改手感只改这一个文件
    clock.ts     时间引擎：在线 tick 与离线切片补算共用同一段代码
    needs/pet/evolution/personality/behavior/habitat/travel/items/wardrobe
    save.ts      存档：schemaVersion + 逐版本迁移 + 损坏回滚备份
  render/      SVG 渲染（宠物/部件/饰品/摆件/访客/明信片/配色表）
  audio/       Web Audio 合成（engine 总线 → music / sfx）
  minigames/   九个游戏 + 外壳 + 注册表
  ui/          界面
  store/       Zustand：把模拟层投影给 React
```

**核心原则**：模拟层不认识 DOM，接受「当前时间戳」作为输入。所以在线 tick 和离线补算走同一段代码，不会出现两套逻辑对不上。

## 加东西时注意

- **加进化线**：只改 `core/evolution.ts` 加一条定义 + `render/parts.tsx` 里补部件，**不用碰渲染代码**。新线的 `palette.accent` **必须全局唯一**（冒烟测试用它当渲染标记）。
- **加小游戏**：写一个组件实现 `GameProps`，在 `minigames/registry.ts` 注册。计时/计分/HUD/结算由外壳统一负责，不用各写一遍。记得给 `favoredBy` 分配，保证每个种族都有本命游戏。
- **加宠物**：`core/types.ts` 的 `SPECIES` + `render/palette.ts` 配色 + `PetSvg.tsx` 的 `ART` 身体 + `accessories.tsx` 的 `ANCHORS` 锚点 + 3 条进化线 + 中英文案。锚点要按种族单独调，四个种族的头身比例差别很大。
- **改数值**：只改 `balance.ts`，然后跑 `npm run simulate` 看时间线。
- **加音频**：`audio/sfx.ts` 里加一条，然后在某处调用 —— 测试会检查「声明了却没人用的音效」。

## 测试会帮你抓什么

`npm run check` 里有大量**跨文件一致性检查**，这些靠人工 review 极难发现：

- 行为引用的动画类名是否真的存在于 CSS（曾抓出「四个动作的动画从第一版起就一直静默失效」）
- 每个行为/道具/访客/明信片是否都有中英文案
- 每个小游戏是否都接了音效、是否都注册了组件
- 安卓 XML 是否合法（本机编译不了，这是唯一能替代「编译」的检查）
- **同一个 `values/` 目录内是否有重复资源名**（会让资源合并任务失败，报错只有 Kotlin 堆栈）
- 进化线点缀色是否唯一

## 踩过的坑（改代码前先读一眼）

**数值层**
- 需求保底线必须**严格小于**自动睡眠阈值，否则宠物永远不会自己睡觉
- 离线补算**必须切片**，不能「速率 × 时长」一步积分
- 离线折算用**渐近饱和**曲线，线性打折永不饱和
- 性格回归的插值系数必须用 `1 − e^(−rate·h)`，`rate × h` 超过 1 会冲过基准撞到下限

**前端**
- render 期间不能写/读 ref，不能调 `Date.now()`
- 变量别起 `useXxx` 名字（会被 lint 当成 Hook）
- `translateX(百分比)` 的基准是**元素自身宽度**
- 触摸游戏的交互元素要避开**底部 30%**（手指会挡住）
- 多路声音叠加要挂限幅器，否则拉大音量会削波爆音

**安卓/CI**
- XML 注释**不能**夹在标签属性中间
- Windows 提交的仓库，CI 里必须 `chmod +x android/gradlew`
- `.gitattributes` 强制 LF，否则 shell 脚本的 shebang 在 Linux 上失败
- GitHub Actions 用当前大版本（v4 系列已过时，会导致作业零步骤失败）
- 交付给手机时注意：微信会改 `.apk` 文件名，Actions Artifacts 是 zip 需要解压
