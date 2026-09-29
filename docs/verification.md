# 验收记录

验收日期：2026-09-29。环境：本地真实 PostgreSQL、Linux AMD64 生产镜像、阿里云 Podman 部署。服务器入口为 `http://39.102.212.37:3036`。

## 构建与业务验证

- TypeScript 类型检查通过；Next.js 15.5.26 production build 通过。
- 初始迁移在服务器执行成功；生产精简镜像中的 Prisma 迁移工具可正常运行。
- `scripts/integration.ts` 的 28 项真实数据库/API 检查在本地和服务器均通过，使用独立临时活动并在结束后清理。
- 覆盖未登录访问、CWID 标准化/未知账号拒绝、待审核隔离、审核状态转换、公开字段匿名、重复并发点赞与取消点赞、拒绝/下架不可见、分页与非法参数、禁用白名单后旧会话失效、Ticket 必填时间字段/过期/过长/活动不符/合法登录、活动关闭、非法返回地址。

## 浏览器验证

- 本地电脑端：提问/问题池双栏、二维码、后台三个导航页、审核列表和活动设置均已查看；活动设置草稿不会被后台轮询覆盖。
- 本地手机宽度 390px：CWID 登录和提问页布局正常，无横向溢出。用手机尺寸页面提交测试问题，电脑后台自动收到并审核通过，参与者问题池自动显示；点赞和翻页可用。
- 公网：使用 C10001 成功登录，问题池显示 8 条已审核演示问题，分页为 2 页；当前页面控制台没有 error/warn。
- 公网手机宽度 390px：页面 scrollWidth 为 390，二维码区域隐藏。二维码位于电脑提问页，供手机扫描。
- 已对公网页面生成的二维码进行实际图像解码，结果为 `http://39.102.212.37:3036/event/demo/login`，不包含身份或 Ticket。
- 公网 `/admin` HTTP 返回 200；公网后台浏览器新标签导航被浏览器客户端阻止（ERR_BLOCKED_BY_CLIENT），因此后台视觉与操作记录来自本地同版本页面，服务器业务检查来自部署后的 API 集成测试。

## 部署验证

- `/api/health` 公网返回 HTTP 200 和 `{"status":"ok"}`，包含数据库连通性检查。
- `event-qna-web` 和 `event-qna-db` systemd 服务均为 active、enabled。
- PostgreSQL 使用持久化数据卷，不公开数据库端口；应用只使用 3036，保留服务器原有站点。
- 最终检查时下载用的 SSH 反向代理已不存在，公网健康检查仍正常。服务器运行不依赖开发电脑。
- 服务器 demo 活动的占位直播返回链接已清空，可在后台填入真实地址。

## 验证边界

- 已验证签名 Ticket 接口，尚未与实际直播供应商联调。
- 已验证二维码图像内容和手机尺寸浏览器；尚未使用实体手机微信完成扫码验收。
- 管理后台按要求仅适配电脑；不进行手机后台布局验收。
- 当前为临时 HTTP 验收环境，正式域名/HTTPS、真实品牌素材与直播链接待配置。
- 未进行生产并发容量测试、服务器重启演练或备份恢复演练；服务自启动配置已检查。

## 复验

本地启动数据库及应用后运行 `npm run test:integration`。默认应用地址为 `http://localhost:3036`，可用 `TEST_BASE_URL` 覆盖；测试所用数据库必须与目标应用一致。

服务器已保存最新验收脚本 `/opt/event-qna/integration.ts`，可执行：

```sh
ssh aliyun 'podman run --rm --network event-qna --env-file /opt/event-qna/app.env -e TEST_BASE_URL=http://event-qna-web:3000 -v /opt/event-qna/integration.ts:/app/scripts/integration.ts:ro docker.io/library/event-qna:acceptance node scripts/integration.ts'
```
