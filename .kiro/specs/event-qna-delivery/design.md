# 设计

沿用现有架构，无需引入其他开源项目。提问页面延续参考图的白底/蓝色、左侧输入与二维码、右侧双栏卡片；登录使用可配置品牌标志及活动主题区；后台拆为问题审核、白名单、活动设置三个导航页。

```mermaid
flowchart LR
 Live[外部直播] -->|签名 Ticket| Auth[登录接口]
 QR[二维码/CWID] --> Auth
 Auth --> Session[HttpOnly 会话]
 Session --> Gate[活动状态与白名单校验]
 Gate --> API[问题与投票接口]
 Admin[审核后台] --> Review[审核/白名单/活动接口]
 API --> DB[(PostgreSQL)]
 Review --> DB
```

```mermaid
sequenceDiagram
 participant U as 参与者
 participant A as API
 participant M as 管理员
 U->>A: 登录并提交
 A-->>U: PENDING / 提交成功
 M->>A: 审核通过
 A-->>U: 下次轮询取得 APPROVED
 M->>A: 禁用 CWID
 U->>A: 使用旧会话请求
 A-->>U: 401，重新验证
```

正确性：公开查询显式限定 APPROVED；身份字段仅在后台序列化；每次参与者请求校验当前准入；投票使用明确目标状态和唯一约束；后台刷新问题与活动表单解耦；分页排序追加 ID 作为稳定次序。

涉及：components 三个客户端及共享图标/品牌/分页；globals.css；lib 身份校验、审核转换；questions/vote/admin API；Prisma 初始迁移；集成验收、Docker 部署模板及文档。轮询沿用四秒，后台五秒，不引入 WebSocket。Ticket 仍是短期可重用凭证，不宣称一次性票据。
