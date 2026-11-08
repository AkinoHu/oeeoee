# 花盆设备 API（给固件开发）

花盆（ESP32-S3）通过 HTTPS 和中台通信。源码：`src/app/api/device/*`，校验规则：`src/lib/companion/schemas.ts`。

## 认证

1. 用户在控制台 **设备 → 添加花盆** 生成设备，页面只显示一次 Token（格式 `oee_dev_` + 43 位）。
2. 固件把 Token 存在 NVS，每个请求带上：`Authorization: Bearer oee_dev_...`
3. 服务器只保存 Token 的 SHA-256；Token 泄露时在控制台"重置 Token"。

## 推荐固件循环

```
开机 → GET /api/device/config（拿养护目标、角色名、时区）
每 nextReportSeconds（默认 300s）→ POST /api/device/telemetry
    ← 返回 actions：执行 pumpSeconds（浇水秒数）、growLightOn（补光开关）
    ← 返回 expression：屏幕切换表情
    下一次上报时把实际浇水时长写进 pumpRanSec
用户说话（本地唤醒 + 云端语音识别）→ POST /api/device/chat → 播放 reply，显示 expression
```

断网时用 config 里的目标在本地兜底（土壤湿度低于下限就少量浇水），恢复网络后用 `readings` 批量补传。

## POST /api/device/telemetry

单条读数，或 `{ "readings": [...] }` 批量（最多 500 条）。每条至少要有一个传感器值。

| 字段 | 类型 | 范围 | 说明 |
|---|---|---|---|
| `recordedAt` | ISO 时间 | 可选 | 默认服务器时间；批量补传时必填 |
| `soilMoisture` | number | 0–100 | 土壤体积含水率 % |
| `airTemp` | number | −40–85 | °C |
| `airHumidity` | number | 0–100 | % RH |
| `lightLux` | number | 0–200000 | 叶面光照 lux |
| `waterLevel` | number | 0–100 | 水箱 % |
| `growLightOn` | boolean | | 补光灯当前状态 |
| `pumpRanSec` | int | 0–3600 | 上次上报以来水泵运行秒数 |
| `firmwareVersion` | string | 可选 | 顶层字段 |
| `timezone` | IANA 时区 | 可选 | 顶层字段，如 `Asia/Shanghai` |

```bash
curl -X POST https://<APP_URL>/api/device/telemetry \
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"soilMoisture":18,"airTemp":23.5,"airHumidity":52,"lightLux":300,"waterLevel":64,"firmwareVersion":"0.1.0"}'
```

返回：

```json
{ "ok": true, "accepted": 1, "rejected": 0,
  "actions": { "pumpSeconds": 20, "growLightOn": true },
  "expression": "thirsty", "status": "needs_attention", "issues": [...],
  "nextReportSeconds": 300 }
```

## GET /api/device/config

返回植物养护目标（土壤湿度区间、光照区间、补光时长和时段、温度区间）、角色名字/语言/音色、提醒设置、上报间隔。

## POST /api/device/chat

```json
{ "text": "今天好累啊", "timezone": "Asia/Shanghai" }
```

返回 `{ "ok": true, "reply": "...", "expression": "concerned", "fallback": false, "memorySaved": true }`。
`reply` 很短、口语化，直接送 TTS 播放。没配置 `ANTHROPIC_API_KEY` 时 `fallback: true`，回复由规则生成。

## 错误与限流

- `401` Token 无效 · `400` JSON 或字段不合法（附字段错误）· `429` 超限（带 `Retry-After`）
- 每台设备：上报 60 次/分，配置 30 次/分，对话 20 次/分。限流在单个服务进程内存中，多实例部署前需换成 Redis。

## 表情列表

`neutral` `happy` `excited` `curious` `focused` `sleepy` `thirsty` `concerned` `sad` `love`
（定义见 `src/components/companion-face/types.ts`，固件的表情资源按这个列表做。）
