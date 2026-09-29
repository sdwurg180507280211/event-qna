# 部署与验收

## 本次阿里云部署

- 主机：`ssh aliyun`，访问端口 3036。
- 参与者：`http://39.102.212.37:3036/event/demo/login`
- 电脑后台：`http://39.102.212.37:3036/admin`
- 独立目录：`/opt/event-qna`；不修改 80 端口已有站点。
- 运行方式：服务器已有 Podman，应用和 PostgreSQL 使用独立容器/网络及 systemd 自启动。
- 服务：`event-qna-web.service`、`event-qna-db.service`。
- 数据卷：`event-qna-postgres`；数据库不开放宿主机端口。
- 密钥：`/opt/event-qna/app.env`，权限 600，不进入 Git 或镜像。
- 验收密码：服务器 `/opt/event-qna/acceptance-access.md`，本地 `.local/acceptance-access.md`。
- 测试账号：C10001、C10002、C10003；演示问题明确标注“演示”。

这是 HTTP 临时验收环境，`COOKIE_SECURE=false`。接入正式域名和 HTTPS 时改回 `true` 并重建应用容器。微信扫码应指向公网登录页；二维码本身不包含身份或 Ticket。

## 检查与维护

```sh
ssh aliyun 'systemctl status event-qna-web event-qna-db --no-pager'
ssh aliyun 'curl -fsS http://127.0.0.1:3036/api/health'
ssh aliyun 'journalctl -u event-qna-web -n 80 --no-pager'
```

应用健康检查会连接数据库，返回 `{"status":"ok"}` 才代表可用。

备份（先在本地创建备份目录）：

```sh
ssh aliyun 'podman exec event-qna-db pg_dump -U event_qna event_qna' > event-qna-backup.sql
```

更新前保留旧镜像标签并备份数据库；新镜像先运行 `prisma migrate deploy`，再替换同名应用容器。只回滚应用镜像不能撤销数据库迁移；数据库回滚需根据具体迁移另行评估。

## 通用 Docker Compose

```sh
cp .env.production.example .env.production
# 填入独立的随机密码/密钥，DATABASE_URL 中数据库密码须与 POSTGRES_PASSWORD 一致。
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres
docker compose --env-file .env.production -f docker-compose.production.yml run --rm web node /tools/node_modules/prisma/build/index.js migrate deploy
docker compose --env-file .env.production -f docker-compose.production.yml run --rm web node prisma/seed.ts
docker compose --env-file .env.production -f docker-compose.production.yml up -d web
```

`prisma/seed.ts` 仅用于 demo 活动。已有活动配置或名单变更后不要重复 seed（旧 MVP 的 seed 会更新 demo 标题及启用状态）。`scripts/demo.ts` 可额外插入明确标记的示例问题，仅用于验收。

默认绑定 127.0.0.1:3036。公网验收可设置 `APP_BIND=0.0.0.0` 和 `COOKIE_SECURE=false`，并放行该端口；正式环境保留回环绑定，由 HTTPS 反向代理提供入口。

本机下载均通过 HTTP 代理 127.0.0.1:7890；Docker 构建可传入 `HTTP_PROXY` / `HTTPS_PROXY` build args。阿里云拉取镜像时使用仅绑定回环的 SSH 代理转发，完成后关闭；运行应用不依赖开发电脑或代理转发。

## 数据库迁移

新部署使用 `npm run db:migrate`。若已有使用 `db:push` 建立且与初始 schema 完全一致的数据库，应先备份，核对 schema，再执行一次基线登记：

```sh
npx prisma migrate resolve --applied 20260929000000_initial
npm run db:migrate
```

不要对空数据库登记基线；它会跳过建表。
