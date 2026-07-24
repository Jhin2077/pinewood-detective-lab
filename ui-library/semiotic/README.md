# Pinewood Semiotic Signs · UI 素材库

这是根据用户提供的 Semiotic Standard 视觉参考，为 Pinewood Case Board / Online Workshop 重绘的矢量标识库。

## 内容

- `svg/`：35 个独立 SVG 文件，均为真正的矢量路径与基础图形。
- `contact-sheet.svg`：35 个标识的矢量总览板。
- `manifest.json`：编号、中文名、英文名、分类和颜色索引。
- `index.html`：可检索、筛选、预览和单独下载的素材库页面。
- `library.css` / `library.js`：素材库界面样式与交互。
- `reference-source.png`：用户提供的视觉母版，保留用于以后校对。
- `pinewood-semiotic-signs-svg.zip`：可直接交给设计师的完整矢量素材包。

## SVG 分层

每个文件都使用稳定的图层 ID：

- `frame`：外框、红色信号框、白色内框。
- `symbol`：该标识的主体几何图形。
- 主体内部继续按功能拆分，例如 `medical-cross`、`terminal-mark`。

可直接在 Figma、Illustrator、Inkscape 或文本编辑器中修改颜色、比例和路径。

## 颜色

| 名称 | 色值 |
| --- | --- |
| Ivory | `#F4F3E7` |
| Signal Red | `#B70D14` |
| Black | `#070707` |
| System Gray | `#7D7E7B` |
| Cryogenic Blue | `#173A76` |
| Service Green | `#0F5B38` |
| Hazard Yellow | `#F2AA18` |

## 设计说明

- 保留参考图的 7 × 5 编号结构、圆角双框、粗块面几何和六色系统。
- 对部分内部结构做了 Pinewood 化简化，保证 24–48 px 的网页尺寸仍然清晰。
- 这套标识与 `src/ui-kit/icons/svg/` 中的通用操作图标分开：Semiotic Signs 用于“区域、状态、档案类型和系统分类”，通用图标用于“搜索、登录、下载、编辑”等操作。
- 视觉参考来自用户提供的图片；在对外商业发布前，请确认原始参考的使用权限。

## 重新生成

```powershell
npm run ui:build-semiotic
npm run ui:package-semiotic
```
