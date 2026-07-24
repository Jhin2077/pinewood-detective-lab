# Detective Lab × Pinewood

Pinewood Detective Lab 的独立在线案件板社区。

此工程与 `04_空白创作版_源代码` 分开维护：

- `04`：本地稳定版，继续支持离线存档；
- `05`：在线社区版，使用 Supabase Free 承载账号、社区数据和案件图片；
- 两端不会自动混用浏览器存档。

## 当前发布状态

- 公共社区不包含示例案件、示例用户、示例评论或模拟排行；
- 邮箱注册、验证、登录和退出已经连接真实 Supabase Auth；
- 注册必须确认已满 16 周岁并接受社区规则与免责声明，不收集出生日期；
- `#/board` 是无预设卡片的空白案件板编辑器；
- 每个案件板必须选择主类型后才能发布到公共社区；
- 社区支持公开浏览、分类筛选、排行、点赞和评论；
- 所有图片入口及 Storage 服务端均限制为单张不超过 2MB；
- 旧在线演示存档使用不同的存储版本，不会进入当前空白版；
- GitHub Pages 托管前端，Supabase 负责账号、数据库和附件。

## 本地运行

```powershell
npm install
npm run dev
```

默认地址：<http://127.0.0.1:4175/#/workshop>

## 质量检查

```powershell
npm run typecheck
npm run lint
npm run build
```

## GitHub Pages

当前线上站点从 `gh-pages` 分支根目录发布，`main` 保存源代码。更新网页时：

1. 执行类型检查、Lint 和生产构建；
2. 将 `dist` 的完整内容发布到 `gh-pages` 分支；
3. 等待 GitHub Pages 状态变为 `built` 后再验收线上地址。

本地保留了自动发布工作流模板。当前 GitHub 登录令牌没有 `workflow` 权限，因此模板不会上传；以后授予该权限后可以改为 `main` 推送即自动发布。

## Supabase

生产环境连接参数位于 `.env.production`：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Publishable Key 是面向浏览器的公开密钥，所有真实权限由数据库和 Storage 的 RLS 策略控制。不要把 Secret Key、`service_role` 或数据库密码放入前端或 GitHub 仓库。

完整数据库结构见 `supabase/schema.sql`，部署状态与安全约束见 `SUPABASE_SETUP.md`，社区规则正文见 `COMMUNITY_RULES.md`。
