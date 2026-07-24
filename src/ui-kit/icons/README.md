# Pinewood UI 图标资产

这里保存在线 Workshop 使用的全部本地 SVG 图标。每个图标都是一个独立文件，可直接用 Figma、Illustrator、Inkscape 或文本编辑器修改。

## 文件位置

- `svg/`：38 个独立 SVG 原文件
- `manifest.json`：机器可读的文件索引、来源和许可信息
- `PinewoodIcons.tsx`：网站中统一调用这些本地图标的组件
- `scripts/export-ui-icons.mjs`：从 Phosphor Icons（MIT）重新导出图标的脚本

## 视觉规范

- 画板：`24 × 24`
- 当前母版：粗线几何符号，配合“象牙白 / 信号红 / 黑 / 灰”Semiotic Standard 风格
- 页面颜色由 CSS 控制；SVG 文件只负责形状
- 不在页面里内嵌手写 SVG，确保以后只替换原文件就能更新全站

## 图标标注

| 文件 | 中文含义 | 主要用途 |
| --- | --- | --- |
| `broadcast.svg` | 广播 | 品牌、全班广播 |
| `search.svg` | 搜索 | 社区检索 |
| `plus.svg` / `minus.svg` | 添加 / 缩小 | 创建、画布控制 |
| `user.svg` / `user-plus.svg` | 用户 / 注册 | 账户系统 |
| `sign-in.svg` | 登录 | 登录按钮 |
| `folder.svg` | 文件夹 | 最近浏览 |
| `trophy.svg` / `trend.svg` | 热门 / 排行 | 社区排名 |
| `fire.svg` / `clock.svg` | 热门 / 最新 | 内容排序 |
| `heart.svg` / `chat.svg` / `eye.svg` | 喜欢 / 评论 / 浏览 | 案件板统计 |
| `graph.svg` / `link.svg` / `link-break.svg` | 图谱 / 连线 / 断开 | 案件关系编辑 |
| `document.svg` / `image.svg` / `note.svg` / `tag.svg` | 文件 / 图片 / 便签 / 物证 | 案件素材 |
| `save.svg` / `upload.svg` / `download.svg` | 保存 / 导入 / 导出 | 本地档案 |
| `sun.svg` / `moon.svg` | 日间 / 夜间 | 主题切换 |

其余文件名均为英文功能名，可在 `manifest.json` 中完整查看。

## 更新方法

1. 直接覆盖 `svg/` 中同名文件，文件名保持不变。
2. 保存后刷新本地预览，Vite 会自动更新。
3. 如果需要恢复 Phosphor 原版，运行 `npm run ui:export-icons`。
