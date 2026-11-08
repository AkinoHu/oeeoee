# 部署指南：GitHub + Cloudflare（Workers + D1）+ Google 登录 + Stripe

网站以 Cloudflare Worker 运行（Next.js 通过 [OpenNext](https://opennext.js.org/cloudflare) 适配），数据库是 Cloudflare D1（SQLite），域名 **oeeoee.com** 直接绑定到 Worker。全部在你自己的 Cloudflare 账号里。

> **需要 Workers 付费计划（$5/月）**：Worker 打包后约 4.1 MiB（gzip），超过免费计划 3 MiB 的上限，付费计划上限是 10 MiB。

## 1. 首次部署（一次性）

前提：oeeoee.com 已经在这个 Cloudflare 账号里（DNS 托管在 Cloudflare）。

```bash
pnpm install

# 1) 登录（或设置 CLOUDFLARE_API_TOKEN 环境变量）
pnpm wrangler login

# 2) 创建 D1 数据库，把输出里的 database_id 填进 wrangler.jsonc
pnpm wrangler d1 create oeeoee

# 3) 建表
pnpm db:migrate:remote

# 4) 设置密钥（每条命令会提示输入值）
pnpm wrangler secret put BETTER_AUTH_SECRET      # openssl rand -base64 32
pnpm wrangler secret put ADMIN_EMAILS            # 能进 /admin 的邮箱，逗号分隔
pnpm wrangler secret put GOOGLE_CLIENT_ID
pnpm wrangler secret put GOOGLE_CLIENT_SECRET
pnpm wrangler secret put STRIPE_SECRET_KEY
pnpm wrangler secret put STRIPE_WEBHOOK_SECRET
pnpm wrangler secret put ANTHROPIC_API_KEY

# 5) 构建并部署（同时把 oeeoee.com 绑定为 Worker 的自定义域名）
pnpm cf:deploy
```

`NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` 已在 `wrangler.jsonc` 的 `vars` 里设为 `https://oeeoee.com`。

**生产环境不要**设置 `AUTH_DEV_PASSWORD_LOGIN`。

## 2. 之后自动部署（GitHub Actions）

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌（见下） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 控制台右侧栏的 Account ID |

之后每次推送到 `main`：检查通过 → 执行 D1 迁移 → 部署 Worker。没配置密钥时部署步骤会自动跳过。

**API 令牌权限**（My Profile → API Tokens → Create Token → 模板 "Edit Cloudflare Workers"，再加）：
- Account → **D1: Edit**
- Zone → **DNS: Edit**，Zone Resources 选 **oeeoee.com**

## 3. Google 登录

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth consent screen：External，填应用名、支持邮箱 `hello@oeeoee.com`、域名 oeeoee.com。
2. Credentials → Create OAuth client ID → **Web application**：
   - Authorized JavaScript origins：`https://oeeoee.com`
   - Authorized redirect URIs：`https://oeeoee.com/api/auth/callback/google`
   - 本地开发再加 `http://localhost:3000` 和 `http://localhost:3000/api/auth/callback/google`
3. 用 `wrangler secret put` 写入 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`。
4. 上线前把 consent screen 发布为 In production。

## 4. Stripe

1. 需要 Stripe 支持地区（香港 / 新加坡 / 美国 / 日本等）的公司主体，中国大陆主体无法开户。
2. Developers → API keys → `STRIPE_SECRET_KEY`（测试期用 `sk_test_...`）。
3. Developers → Webhooks → Add endpoint：
   - URL：`https://oeeoee.com/api/stripe/webhook`
   - 事件：`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`
   - Signing secret → `STRIPE_WEBHOOK_SECRET`
4. Settings → Payment methods：开启银行卡、Apple Pay / Google Pay；中国用户开启 **Alipay** 和 **WeChat Pay**。
5. 测试卡：`4242 4242 4242 4242`。

## 5. 本地开发

```bash
pnpm install
cp .env.example .env            # 填 BETTER_AUTH_SECRET；开发者登录默认开启
pnpm db:migrate:local           # 在本地 D1（.wrangler/）建表
pnpm dev                        # http://localhost:3000

# 用真实的 Workers 运行时预览生产构建
cp .dev.vars.example .dev.vars
pnpm cf:preview                 # http://localhost:8787
```

改数据库结构：编辑 `prisma/schema.prisma` → `pnpm db:new-migration <名字>` 生成 `migrations/000N_<名字>.sql` → `pnpm db:migrate:local` → 推到 main 自动执行远程迁移。

## 6. 上线检查清单

- [ ] `https://oeeoee.com/api/health` 返回 `{"status":"ok","db":"ok"}`
- [ ] 谷歌登录能回跳并进入 `/console`
- [ ] 中国 / 美国 / 日本国家页能打开；测试卡能完成支付；`/admin` 能看到 PAID 订单
- [ ] Stripe 后台 Webhook 显示 200
- [ ] `ADMIN_EMAILS` 已设置，`AUTH_DEV_PASSWORD_LOGIN` 未设置
