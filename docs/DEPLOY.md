# 部署指南：GitHub + Railway + Google 登录 + Stripe

整个网站是一个 Next.js 服务 + 一个 PostgreSQL 数据库，都放在 Railway 上。代码推到 GitHub 后 Railway 自动构建部署。

## 1. Railway

1. 登录 [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → 选择 `AkinoHu/oeeoee`。
2. 在同一个项目里 **+ New → Database → PostgreSQL**。
3. 打开网站服务 → **Variables**，添加：

   | 变量 | 值 |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`（引用数据库服务） |
   | `BETTER_AUTH_SECRET` | 运行 `openssl rand -base64 32` 生成 |
   | `NEXT_PUBLIC_APP_URL` | `https://你的域名`（先用 Railway 生成的域名，见第 4 步） |
   | `BETTER_AUTH_URL` | 同上 |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 见第 2 节 |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | 见第 3 节 |
   | `ANTHROPIC_API_KEY` | AI 大脑使用（不填则用规则版兜底回复） |
   | `ADMIN_EMAILS` | 可以进入 `/admin` 的邮箱，逗号分隔 |

   **不要**在生产环境设置 `AUTH_DEV_PASSWORD_LOGIN=true`。
4. **Settings → Networking → Generate Domain**，得到 `xxx.up.railway.app`；绑定自定义域名也在这里。改完域名记得同步 `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`。
5. 部署流程由仓库里的 `railway.json` 控制：
   - 构建：`pnpm build`（安装时会自动 `prisma generate`）
   - 上线前：`pnpm db:deploy`（`prisma migrate deploy`，自动建表/迁移）
   - 启动：`pnpm start`，健康检查 `/api/health`

> 地区建议：面向亚洲选 Southeast Asia（新加坡），面向美国选 US West/East。中国大陆用户访问境外服务器会比较慢，国内正式版请另行部署（见 `PLAN.md` 第 5 节）。

## 2. Google 登录

1. [Google Cloud Console](https://console.cloud.google.com) → 新建项目 → **APIs & Services → OAuth consent screen**：选 External，填应用名、支持邮箱、域名。
2. **Credentials → Create Credentials → OAuth client ID** → 类型 **Web application**：
   - Authorized JavaScript origins：`https://你的域名`（本地开发再加 `http://localhost:3000`）
   - Authorized redirect URIs：`https://你的域名/api/auth/callback/google`（本地：`http://localhost:3000/api/auth/callback/google`）
3. 把 Client ID / Secret 填进 Railway 变量。
4. 上线前把 consent screen 从 Testing 发布为 In production，否则只有测试用户能登录。

## 3. Stripe

1. 注册 Stripe（需要香港 / 新加坡 / 美国 / 日本等 Stripe 支持地区的公司主体，中国大陆主体无法开户）。
2. **Developers → API keys**：复制 Secret key 填入 `STRIPE_SECRET_KEY`（测试期用 `sk_test_...`）。
3. **Developers → Webhooks → Add endpoint**：
   - URL：`https://你的域名/api/stripe/webhook`
   - 事件：`checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`
   - 把 Signing secret（`whsec_...`）填入 `STRIPE_WEBHOOK_SECRET`。
4. **Settings → Payment methods**：开启银行卡、Apple Pay / Google Pay；面向中国用户开启 **Alipay** 和 **WeChat Pay**（人民币结算）；日本可开启 Konbini 等。Checkout 会根据币种和地区自动展示可用支付方式。
5. 本地调试 webhook：`stripe listen --forward-to localhost:3000/api/stripe/webhook`。
6. 测试卡号：`4242 4242 4242 4242`，任意未来日期和 CVC。

## 4. 本地开发

```bash
pnpm install
cp .env.example .env     # 至少填 DATABASE_URL 和 BETTER_AUTH_SECRET
pnpm db:migrate          # 建表
pnpm dev                 # http://localhost:3000
```

没有谷歌密钥时，在 `.env` 设 `AUTH_DEV_PASSWORD_LOGIN="true"`，登录页会出现开发者邮箱登录。

## 5. 上线检查清单

- [ ] `/api/health` 返回 `{"status":"ok","db":"ok"}`
- [ ] 谷歌登录能回跳并进入 `/console`
- [ ] 中国 / 美国 / 日本各国家页能打开，测试卡能完成支付，`/admin` 能看到 PAID 订单
- [ ] Webhook 在 Stripe 后台显示 200
- [ ] `ADMIN_EMAILS` 已配置，`AUTH_DEV_PASSWORD_LOGIN` 未开启
