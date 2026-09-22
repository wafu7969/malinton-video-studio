# Malinton Video Studio

一个轻量、通用的**分镜视频预览工作台**。用一份 JSON 清单描述你的分镜、字幕、配音和画布，就能在浏览器里得到一套带分镜列表、字幕时间轴、音频控制的编辑器界面。

不绑定任何渲染框架——Remotion、纯 HTML/CSS 动画、Canvas，甚至已经渲染好的 mp4 都能接进来。

![布局：左侧预览 + 右侧分镜列表 / 字幕时间轴](./docs/preview.png)

## 特性

- **分镜列表** — 点击任意分镜跳转到对应时间段，播放时自动跟随高亮
- **字幕时间轴** — 逐句展示时间戳，点击定位，当前句逐帧高亮
- **实时源码预览** — iframe 加载你的合成页面，通过 `postMessage` 协议驱动播放与定位
- **精确的时间轴控制** — 播放 / 暂停、上一段 / 下一段、重播、进度条拖拽、键盘左右键
- **音频控制** — 音量与静音，支持「每个分镜一段配音」或「整片一条音轨」
- **零框架耦合** — 只要你的合成页面能响应 seek 消息，就能接进来
- **可换肤** — 全部颜色都是 `.mvs-root` 上的 CSS 变量

## 安装

```bash
npm install -D malinton-video-studio
```

## 快速开始

### 1. 写一份清单

在项目根目录创建 `malinton.studio.json`：

```json
{
  "title": "我的视频",
  "meta": { "width": 1920, "height": 1080 },
  "preview": { "type": "html", "src": "composition/index.html" },
  "scenes": [
    { "index": "01", "title": "开场", "start": 0, "end": 10, "audio": "audio/scene1.mp3" },
    { "index": "02", "title": "正片", "start": 10, "end": 36, "audio": "audio/scene2.mp3" }
  ],
  "subtitles": [
    { "start": 0, "text": "第一句字幕。" },
    { "start": 2.5, "text": "第二句字幕。" }
  ]
}
```

所有时间单位都是**秒**。路径相对于清单所在目录。

### 2. 启动

```bash
npx malinton-studio
```

浏览器会自动打开 `http://localhost:4321`。

### 3. 让合成页面响应播放控制（可选）

如果 `preview.type` 是 `html`，studio 会向 iframe 发送消息来驱动画面。只要监听这三条消息，就能获得逐帧精确的定位：

```js
window.addEventListener('message', (event) => {
  const { type, time, frame, frameRate } = event.data ?? {}
  switch (type) {
    case 'malinton-studio:seek':  render(time, frame); break  // 定位到某一刻
    case 'malinton-studio:play':  render(time, frame); break  // 开始播放
    case 'malinton-studio:pause': break                       // 暂停
  }
})

// 页面就绪后知会 studio，让它把第一帧推过来
parent.postMessage({ type: 'malinton-studio:ready' }, '*')
```

`time` 是秒，`frame` 是 `time × frameRate` 取整，按帧渲染时直接用 `frame` 更省事。

关键点：**画面应当由 `time` / `frame` 推导出来（声明式渲染），而不是自己计时**。这样拖拽进度条才能精确落帧。

可参考 [examples/basic/composition/index.html](examples/basic/composition/index.html)，那是一份 60 行的完整示例。

## CLI

```
malinton-studio [root] [options]

  -r, --root <dir>       要服务的项目根目录          (默认: 当前目录)
  -m, --manifest <file>  清单路径，相对于 root
  -p, --port <number>    监听端口                    (默认: 4321)
      --host <host>      绑定地址                    (默认: localhost)
      --no-open          不自动打开浏览器
  -h, --help             显示帮助
```

清单会自动在以下文件名中查找：`malinton.studio.json`、`studio.config.json`、`studio.json`。

## 作为 React 组件使用

```tsx
import { Studio } from 'malinton-video-studio'
import 'malinton-video-studio/style.css'
import manifest from './malinton.studio.json'

export default function App() {
  return (
    <Studio
      manifest={manifest}
      resolveAsset={(p) => new URL(`./assets/${p}`, import.meta.url).href}
      autoPlay
    />
  )
}
```

### `<Studio>` 属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `manifest` | `StudioManifest` | **必填**，清单对象 |
| `driver` | `PreviewDriver` | 自定义预览驱动，见「自定义预览源」。不传则由 `preview` 决定 |
| `resolveAsset` | `(path: string) => string` | 把清单里的相对路径转成可加载的 URL，默认原样返回 |
| `autoPlay` | `boolean` | 挂载后自动播放，默认 `false` |
| `className` | `string` | 根元素附加类名，用于覆盖样式 |

## 清单字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 项目标题，同时用作浏览器标签页标题 |
| `meta.width` / `meta.height` | `number` | 画布尺寸，默认 `1920 × 1080` |
| `meta.aspectRatio` | `string` | 画幅标签，默认从宽高自动约分得出 |
| `meta.resolutionLabel` | `string` | 清晰度标签，默认按长边推导（`2K`、`4K`…），可手动覆盖 |
| `meta.frameRate` | `number` | 帧率，默认 `30`。按帧驱动的预览（如 Remotion）必须与合成一致 |
| `meta.sourceLabel` | `string` | 预览区左上角的状态文字，默认 `源码实时预览` |
| `preview` | `object` | 预览源，见下表；不配置则只显示右侧面板 |
| `audio` | `string` | 整片音轨，当某个分镜没有自己的 `audio` 时回退到它 |
| `duration` | `number` | 总时长覆盖值，默认取最后一个分镜/字幕的结束时间 |
| `scenes[]` | `Scene[]` | 分镜列表 |
| `subtitles[]` | `Subtitle[]` | 字幕列表 |

### `preview` 的三种形态

```json
{ "type": "html",  "src": "composition/index.html", "sandbox": "allow-scripts" }
{ "type": "video", "src": "out/video.mp4", "poster": "out/poster.jpg" }
{ "type": "none" }
```

### `scenes[]`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | **必填**，分镜标题 |
| `start` / `end` | `number` | **必填**，起止时间（秒） |
| `index` | `string` | 序号标签，默认按顺序补零为 `01`、`02`… |
| `audio` | `string` | 该分镜的配音，优先级高于顶层 `audio` |
| `id` | `string` | 稳定标识，默认 `scene-{下标}` |

### `subtitles[]`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `text` | `string` | **必填**，字幕文本 |
| `start` | `number` | **必填**，起始时间（秒） |
| `end` | `number` | 结束时间，默认取下一句的 `start` |
| `id` | `string` | 稳定标识，默认 `cue-{下标}` |

`resolveManifest()` 会补全所有默认值并根据 `start` 排序，所以清单可以手写得很随意。

## 换肤

所有视觉变量都挂在 `.mvs-root` 上，覆盖即可：

```css
.mvs-root {
  --mvs-bg: #0b0d12;
  --mvs-surface: #12151d;
  --mvs-accent: #e8813a;      /* 主色，用于播放按钮与高亮 */
  --mvs-text: #e6e9f0;
  --mvs-ok: #4ade80;          /* 状态点 */
  --mvs-radius: 12px;
}
```

## 与 Remotion 的关系

这个包**不依赖 Remotion**——`remotion` / `@remotion/player` 都不在依赖里，你不想用就完全用不到。

如果你在用 Remotion，接法取决于你要「预览」还是「渲染」：

### 渲染后预览

最省事：用 `{ "type": "video", "src": "out/video.mp4" }` 直接看产物。

### 直接驱动 Remotion Player（推荐）

**不要试图嵌入 Remotion Studio。** Studio 是 Remotion 自己的编辑器外壳，没有对外的 seek 接口，嵌进 iframe 后进度条只能看不能拖。

能逐帧定位的是 `@remotion/player`，它暴露命令式的 `seekTo(frame)`。studio 的 `driver` 属性就是为这种情况留的口子——你只需把 player 句柄适配成 `PreviewDriver`：

```tsx
import { createElement, useRef } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { PreviewDriver } from 'malinton-video-studio'

export function useRemotionDriver({ durationInFrames, fps, width, height }) {
  const playerRef = useRef<PlayerRef>(null)

  return useRef<PreviewDriver>({
    isReady: () => !!playerRef.current,
    seek: ({ frame }) => playerRef.current?.seekTo(frame),
    play: ({ frame }) => {
      playerRef.current?.play()   // 唤醒 AudioContext，启动合成内的 <Audio>
      playerRef.current?.pause()  // 立刻按停，别让 player 自己的时钟跑起来
      playerRef.current?.seekTo(frame)
    },
    pause: ({ frame }) => { playerRef.current?.pause(); playerRef.current?.seekTo(frame) },
    reload: () => playerRef.current?.seekTo(0),
    render: () => createElement(Player, {
      ref: playerRef,
      component: MyComposition,
      durationInFrames, fps,
      compositionWidth: width, compositionHeight: height,
      controls: false,       // 关键：时钟归 studio，别让 player 自己跑
      clickToPlay: false,
      style: { width: '100%', height: '100%' },
    }),
  }).current
}
```

然后把它交给 `<Studio>`：

```tsx
<Studio manifest={manifest} driver={driver} />
```

两条约束必须满足，否则画面和进度条会对不上：

1. 清单里的 `meta.frameRate` 要等于合成的 `fps`（默认 30）。
2. 清单的总时长要等于 `durationInFrames / fps`。

完整可运行的版本见 [examples/remotion](examples/remotion)。

### 为什么 `play()` 和 `pause()` 都要调

`PlayerRef.play()` 不只是开始播放，它还会**恢复共享的 AudioContext**；`pause()` 则会挂起它。这是个容易踩的坑：

- 只调 `pause()` 不调 `play()` → AudioContext 从第一帧起就被挂起且永不恢复，**合成里的 `<Audio>` 全程静音**，而画面看起来完全正常。
- 只调 `play()` 不调 `pause()` → player 自己的时钟跑起来，和 studio 的时钟互抢，画面跑到进度条前面。

所以播放时是「`play()` → `pause()` → `seekTo(frame)`」：唤醒音频、立刻按停、再定位到目标帧。player 只当渲染器用，时钟始终归 studio。

### 为什么 `controls={false}` 是必须的

studio 拥有唯一的播放时钟，每一帧都通过 `driver.seek({ time, frame })` 推给预览。如果放任 player 自己播放，两套时钟会互相争夺画面，表现为拖拽不准、播放抖动。让 player 只做「按帧渲染」，定位就是精确的。

## 自定义预览源

`driver` 是一个很小的接口，任何能「渲染任意时刻」的东西都能接进来——Canvas、WebGL、Lottie、已经渲染好的视频：

```ts
interface PreviewDriver {
  /** 渲染某个确切时刻。每次 seek 和每个播放帧都会调用。 */
  seek(frame: { time: number; frame: number; frameRate: number; duration: number }): void
  play?(frame: DriverFrame): void
  pause?(frame: DriverFrame): void
  /** 「重新加载源码」按钮。 */
  reload?(): void
  /** 挂载到画布区域，可返回 iframe / Player / canvas。 */
  render?(): ReactNode
  /** 返回 false 时 studio 会跳过推帧，等它就绪。 */
  isReady?(): boolean
}
```

不传 `driver` 时，清单里的 `preview` 会选中内置实现：`html` → iframe 驱动，`video` → `<video>`。这两个也都在 `src/drivers/` 里，可以直接参考。

## 本地开发

```bash
npm install
npm run build     # 构建库 + host shell
npm run example   # 用 examples/basic 启动
npm run typecheck
```

## License

MIT
