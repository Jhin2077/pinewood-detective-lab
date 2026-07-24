# Supabase 免费版接入约束

此文件记录在线社区接入 Supabase 时必须保持的产品约束。

## 零成本配置

- 使用一个 Supabase Free 项目；
- GitHub Pages 继续托管前端；
- 前端只使用 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`；
- 永远不要把 `service_role` 或其他私密密钥放入网页或 GitHub 仓库。

## 案件类型

每个案件板必须选择一个主类型，字段为 `boards.genre`：

- 灵异
- 超自然
- 科幻
- 民俗
- 失踪
- ARG
- 模拟恐怖
- 都市传说
- 档案异常

未选择类型的案件板可以保存草稿，但不能公开到社区。社区左侧的类型拨轮直接筛选这个字段。

## 注册门槛

- 仅允许确认已满 16 周岁的用户注册公共社区；
- 注册时必须主动勾选年龄确认和《社区规则与免责声明》，两个选项都不能预选；
- 不收集出生日期，仅在 `profiles` 中保存 `age_16_confirmed`、确认时间、条款版本和接受时间；
- 当前首个条款版本为 `2026-07-24-v1`，正文见 `COMMUNITY_RULES.md`；
- 前端校验用于交互提示；接入 Supabase 后，创建 `profiles` 行时必须同时写入并由数据库约束验证；
- 年龄规则是平台的使用门槛，不能替代不同地区所需的隐私、监护人同意或其他法律审查。

## 图片上传

前端所有图片入口已经限制为单张不超过 `2MB`。Supabase 接入时，还必须在服务端再次限制：

1. 在 Storage 中创建 `case-assets` 文件桶；
2. 打开文件大小限制，设置为 `2MB`；
3. MIME 类型只允许 `image/*`；
4. 文件路径使用 `<user-id>/<board-id>/<random-name>`；
5. RLS 只允许用户写入和删除自己 `user-id` 目录下的文件。

前端限制改善体验，Storage 文件桶限制负责真正的安全边界。

## 数据库

在 Supabase SQL Editor 中执行 `supabase/schema.sql`，然后再连接网页端。
