# oeeoee 视觉系统

一句话：**桌上的一个小生命。** 网站要让人感到温暖、被陪伴，而不是在看一件科技产品。

## 1. 两种氛围

| | 白天（默认） | 夜晚（`.theme-night` 作用域） |
|---|---|---|
| 感觉 | 燕麦色的纸、叶子绿、蜂蜜色的光 | 开着一盏暖灯的房间 |
| 用在哪 | 整个网站 | 少量"情绪场景"，目前只有首页结尾那一块 |
| 做法 | 直接用语义化类名 | 给容器加 `theme-night`，里面的类名不用改 |

两种氛围共用同一套类名（`bg-surface`、`text-muted`、`text-leaf-300`……），变量在 `src/app/globals.css`。**不要写死颜色**；需要透明度渐变时用 `rgb(var(--accent)/0.2)`、`rgb(var(--glow)/0.2)`、`rgb(var(--ink)/0.1)`。

## 2. 颜色

| 用途 | 类名 | 说明 |
|---|---|---|
| 页面底色 / 卡片 / 次级填充 | `bg-bg` / `bg-surface` / `bg-surface-2` `bg-surface-3` | 由浅到深的暖色纸 |
| 边线 | `border-line` / `border-line-strong` | |
| 文字 | `text-fg` / `text-muted` / `text-faint` | 三档都满足 4.5:1 对比度 |
| 主色（叶子绿） | `leaf-200`–`leaf-300` 可读的强调色（文字、主按钮）；`leaf-400`–`500` 柔和；`leaf-700`–`900` 淡底色 | 两种氛围下含义相同 |
| 信号色 | `sky`（信息）/ `sun`（提醒）/ `rose`（危险） | 可直接当文字色 |
| 暖色点缀 | `honey`（灯光）/ `peach` / `clay`（陶土，"你"的位置）/ `sprout` | 用于填充、光斑、插画，不用于正文 |
| 花盆屏幕 | `bg-screen` | 任何氛围下都是深色，因为它是一块屏幕 |

## 3. 字体与形状

- 字体：Nunito（圆润的无衬线体）。中文和日文用系统字体，标题在苹果设备上会用圆体。等宽字体只用于代码、Token、ID。
- 标题用 `font-extrabold`，按钮和标签用 `font-bold`，正文 500。
- 圆角要大：按钮是胶囊形，卡片 `rounded-3xl`，输入框 `rounded-2xl`。
- 阴影是暖棕色的柔和阴影：卡片用 `shadow-soft`，浮层用 `shadow-lg` / `shadow-2xl`。
- 小标签用 `.eyebrow`（前面带一片小叶子）；重点词用 `.text-gradient`（叶子绿过渡到陶土色）。
- 背景光斑用 `.lamp-glow` 或 `bg-honey/25 blur-[100px]`；纸张纹理用 `.bg-grid`。

## 4. 让它"在说话"

陪伴感主要来自口吻，而不是装饰：

- 能用伙伴的第一人称说的，就不用界面标签说。例：不写"定位失败"，写"我没找到你，在下面选一个地区好吗？"
- 打招呼、提示、空状态优先用对话气泡（`SpeechBubble`，或首页的 `CompanionGreeter`），旁边放表情脸 `CompanionFace` 或花盆 `PotPreview`。
- 表情要跟内容对应：打招呼 `happy`，夜里 `sleepy`，出错 `concerned`，在等待 `curious`，欢迎回来 `love`。
- 文案短、口语化、有温度，但不卖萌过头；价格、配送、错误原因这类信息要照常说清楚。

## 5. 世界地图

- 投影是 **Miller 圆柱投影**：正北永远朝上，国家形状和大家在地图 App 里看到的一致。点阵数据由 `node scripts/map/build-dots.mjs` 生成，改投影或数据源后要重新生成。
- 配色在 `src/components/map/engine/renderer.ts` 的 `PALETTES`：白天是燕麦纸上的灰绿色陆地，销售市场是叶子绿，下面透出蜂蜜色的光；也保留了一套夜晚配色（`tone: "night"`）。
- 首屏布局：标题和打招呼的花盆在上，完整的世界地图在下，两者不重叠。
- 各大区的取景在 `src/data/regions.ts`（`center` / `zoom`），有测试保证每个市场都落在可视范围内。
- 港澳台归入中国高亮，配置在 `src/components/map/compliance.ts`。

## 6. 改动时的检查

- 手机 375px 宽、中英日三种语言都看一遍。
- 新颜色先算对比度（正文 ≥ 4.5:1）。
- 尊重"减少动画"的系统设置。
