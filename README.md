# Detective Lab × Pinewood

Pinewood Detective Lab 的独立在线案件板社区。

此工程与 `04_空白创作版_源代码` 分开维护：

- `04`：本地稳定版，继续支持离线存档；
- `05`：在线社区版，从零内容开始，后续使用 Supabase 免费方案承载账号和社区数据；
- 两端不会自动混用浏览器存档。

## 当前发布状态

- 公共社区不包含示例案件、示例用户、示例评论或模拟排行；
- 登录与注册不会创建假账号，在 Supabase 接入前保持禁用；
- 注册必须确认已满 16 周岁并接受社区规则与免责声明，不收集出生日期；
- `#/board` 是无预设卡片的空白案件板编辑器；
- 每个案件板包含一个主类型字段，未选择类型时不能生成公开分享链接；
- 所有图片入口限制为单张不超过 2MB；
- 旧在线演示存档使用不同的存储版本，不会进入当前空白版；
- GitHub Pages 只负责静态前端，Supabase 将负责真实账号、数据库和附件。

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

## Supabase 下一阶段

创建免费 Supabase 项目后，把公开连接参数配置为：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

不要把 `service_role` 或任何私密密钥放入前端或 GitHub 仓库。

数据库结构、注册门槛、案件类型和 Storage 的 2MB 服务端限制见 `SUPABASE_SETUP.md`，社区规则正文见 `COMMUNITY_RULES.md`。
