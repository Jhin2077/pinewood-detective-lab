# Design QA

## Current iteration — community identity, presence, comments, and rail order

- Source visual truth:
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-1630b708-738b-4ac8-9178-02cd8de1d7e2.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-b2aa7655-0b20-4c68-a0ef-4296aaf45450.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-753e2008-056c-4203-b2cb-27992a7693de.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-be753ba7-01c2-44a4-9b24-498fd4bf14d2.png`
- Browser-rendered implementation:
  - `C:\Users\ALIENWARE\Desktop\一些AI玩具\谜档-版本合集\05_在线Workshop版_源代码\qa-community-1664x792.png`
- Combined comparison:
  - `C:\Users\ALIENWARE\Desktop\一些AI玩具\谜档-版本合集\05_在线Workshop版_源代码\qa-community-comparison.png`
- Source pixels: 1918 × 792. Implementation pixels and CSS viewport: 1664 × 792 at browser density 1. The combined comparison normalizes both images to 396 px height without changing either image's aspect ratio.
- State: light-theme public community, signed-out account card, two real Supabase cases. A public case was also opened in read-only workspace mode at 1920 × 768, 1365 × 768, and 1266 × 768.

### Current full-view and focused comparison evidence

The same-frame comparison shows the requested structural change clearly: the left rail now begins immediately with the case-type wheel, while “最近浏览” sits below “社区如何运作” in the right rail. The feed retains the existing column width, board cards, corkboard miniatures, red nested borders, and light/dark token system.

Focused browser inspection of the case board confirms that removing “松木镇侦探俱乐部” leaves the brand compact. At 1920 px, the brand ends at x=355, community actions end at x=517, the centered board switcher occupies x=745–1175, and all right actions end at x=1906. At 1365 px, the header uses two rows: community actions end at x=409, while the board switcher occupies x=222.5–1142.5 on the second row. No persistent control is clipped.

The inspector-focused state shows the new “协助留言” control in the requested header slot. Activating it replaces the inspector area with the real public comment list and a sign-in action. The viewer-presence slot shows the real eye count and reserves an overlapping-avatar group for authenticated viewers.

### Current findings and iteration history

- [P1] The eye count was static-looking and did not expose real visit behavior.
  - Fix: each public case open now calls the backend `record_board_view` function. An anonymous click increased Waco from 0 to 1, leaving and clicking again increased it to 2.
  - Post-fix evidence: both the case header and the reloaded community card showed the updated count.

- [P1] Public cases had no visible viewer-presence or direct in-board discussion entry.
  - Fix: added a real recent-viewer stack in the top action area and an “协助留言” button with live count in the inspector header. The full comment panel reads existing Supabase comments and uses the existing sign-in gate.
  - Post-fix evidence: Waco displayed one real comment and the existing JHIN message in the panel; signed-out posting correctly showed “登录后参与调查”.

- [P2] The brand and header controls were overly wide and could appear clipped.
  - Fix: removed the redundant Chinese brand subtitle, reduced the stable brand width, and preserved the two-row breakpoint below 1680 px.
  - Post-fix evidence: measured desktop layouts at 1920, 1365, and 1266 px show separated, non-overlapping control regions.

- [P2] “最近浏览” occupied the top-left position and pushed the case-type wheel down.
  - Fix: moved the section below “社区如何运作” and connected it to the authenticated user's real `board_views` records. The left rail now begins with the wheel.
  - Post-fix evidence: the combined comparison shows the requested rail order, with no feed-width change.

### Current required fidelity surfaces

- Fonts and typography: the existing Wire One co-brand, compact monospace labels, Chinese UI weights, truncation behavior, and hierarchy remain intact.
- Spacing and layout rhythm: the left wheel begins at the rail's first panel position; the right rail stacks account, guide, and recent history with the existing 22 px panel rhythm.
- Colors and visual tokens: the established signal red, paper, charcoal, border, and day/night variables were reused without introducing a new palette.
- Image quality and assets: user avatars use uploaded raster images; empty avatars use the existing editable icon library. Existing corkboard and case-card imagery remain unchanged.
- Copy and content: the community subtitle is exactly “松木镇公共案件社区访问系统”; the redundant English suffix and case-board Chinese brand suffix are removed.

### Current interaction and console checks

- Applied the Supabase schema update successfully in the Codex browser.
- Opened a real public case twice through the community and confirmed eye count 0 → 1 → 2.
- Opened and closed the real case comment panel; one existing comment rendered.
- Confirmed signed-out comment submission remains gated by login.
- Confirmed the case-type wheel is the first left-rail panel and recent history is the final right-rail panel.
- Browser console warnings/errors: none.
- Residual test gap: authenticated avatar upload and multi-user avatar stacking need a second signed-in community user to exercise visually; schema, RLS, storage limits, UI paths, typecheck, lint, and build all pass.

## Comparison target

- Source visual truth:
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-0791b90a-ec70-4dd6-aacf-bc02fb6ce38a.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-cbb4eadb-342c-4a50-b19c-2fef2d2b6d0d.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-7cb89430-bdb1-4358-bff9-74d65d09ba41.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-4508691b-3ace-4d34-a292-6223cd4b2f4a.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-b830f6b4-ec83-4275-b673-34478f3dc5e7.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-a02a4fe6-9b8a-4a87-9ecf-9d69b4ff9796.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-b0f144ce-71fd-4533-8039-3a57c18ff6a2.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-d1bc3f23-2c6d-4987-b90b-b59c1d7ae9d5.png`
- Browser-rendered implementation:
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-implementation.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-context-menu.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-merged-case-editor-1280.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-full-board-thumbnails-1280.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-header-responsive-1249.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-header-responsive-1440.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-header-responsive-1920.png`
- Combined comparisons:
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-layout-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-context-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-case-editor-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-community-thumbnail-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-header-responsive-comparison.png`
- Viewports: 1920 × 905 CSS px for the wide desktop state, 1440 × 810 CSS px for the medium desktop state, and 1249 × 720 CSS px matching the reported Chrome crop.
- Density: device scale factor 1. Focused comparison crops were normalized to a shared width before inspection.
- State: desktop editable case board. The public-owner delete button remains conditional on the authenticated owner; its header slot and compact owner-state width were checked against the available 286 px region.

## Full-view comparison evidence

The combined layout comparison confirms that the community actions moved from the bottom overlay into the open header region immediately after the brand block. At 1920 px the slot begins at x=509 and the board switcher begins at x=795, leaving 286 px for the complete owner-state action group. The zoom control is fully inside the board stage with a 16 px right and bottom inset. All five children have fixed widths, remain within the control, and have no internal border lines. A one-item timeline no longer draws a meaningless horizontal connector.

The focused case-editor comparison confirms that the current-board control now exposes board number, case name, and case type in one horizontal edit surface. The old duplicate title/type controls were removed from the brand block, leaving only the stable CASE ID. At 1280 px the compact editor remains fully readable with no document overflow.

The community comparison confirms that each feed card now renders the case's corkboard snapshot rather than its first uploaded image. Existing clue coordinates are normalized into the thumbnail, evidence links are drawn beneath the clue cards, and a clue/link count communicates complexity.

The responsive-header comparison uses the user's 1249 × 101 px failure crop above a same-width implementation crop. The old one-row layout truncates the case title and crowds the return, type, and add controls into the same horizontal track. The revised state gives persistent actions and the case editor separate rows, preserves the same hierarchy and tokens, and keeps the board content aligned below the 108 px header.

## Focused region comparison evidence

The context-menu comparison shows the requested destructive action as the final, red-accented menu item. It preserves the existing layer and connection actions and does not appear in shared read-only mode.

The responsive-header crop is the required focused comparison for this iteration. At the exact 1249 px source width, the case-title input measures 639 CSS px, the complete 21-character test title has `scrollWidth === clientWidth`, and the editor retains visible board index, genre, and add controls. “返回社区” ends at x=93 while the editor begins at x=164.5, leaving a 71.5 px gap.

## Findings and comparison history

- [P1] Community controls obscured the footer timeline.
  - Earlier evidence: source screenshot showed the community ribbon fixed over the bottom footer.
  - Fix: added a header add-on slot and rendered the community actions inside it.
  - Post-fix evidence: the ribbon sits inside the marked header area and no longer covers footer controls.

- [P2] Zoom control showed clipped final icon and excess separator lines.
  - Earlier evidence: focused source screenshot showed the rightmost control cramped against the edge with multiple vertical separators.
  - Fix: assigned a stable 190 px width, fixed child widths, 16 px edge inset, zero internal borders, and non-shrinking buttons.
  - Post-fix evidence: all controls are completely visible; computed child borders are 0 px.

- [P2] Sparse timeline drew an unnecessary horizontal connector.
  - Earlier evidence: source full view showed a long line behind the bottom action overlay for a one-card case.
  - Fix: hide the connector when fewer than two dated cards exist.
  - Post-fix evidence: computed `::before` display is `none` for the one-card state.

- [P1] Card context menu lacked a direct delete action.
  - Earlier evidence: source context menu ended after “从此卡片开始连线”.
  - Fix: added “删除该线索” with a destructive visual treatment and a native confirmation step that also warns that related links will be removed.
  - Post-fix evidence: the new menu item is visible; activating it produced a confirm dialog.

- [P1] Community cards showed a single uploaded image instead of the complete investigation layout.
  - Earlier evidence: source community screenshot reduced each case to the first photo, hiding spatial structure and complexity.
  - Fix: introduced a snapshot-backed board miniature with normalized card positions, cork texture, evidence-link overlay, and clue/link totals.
  - Post-fix evidence: both live Supabase cases render as corkboards with their actual clue card rather than a full-bleed cover image. Their accessible labels report one clue and zero links, matching the stored snapshots.

- [P1] Case name and type were easy to miss inside the brand block.
  - Earlier evidence: the title appeared as a small unlabelled line below the logo while the current-board control only switched boards.
  - Fix: moved title and type into the centered “当前案件板” editor, strengthened title weight, kept the two-digit board index visible, and reduced the left brand metadata to CASE ID.
  - Post-fix evidence: direct edits to “南京的鸭子都去哪了？” and “模拟恐怖” persisted and immediately appeared in the inspector summary. The 1280 px pass shows all three fields without horizontal overflow.

- [P1] The single-row header clipped the case editor and hid persistent actions in the reported Chrome window.
  - Earlier evidence: the 1249 px source crop shows “南京的鸭子都去哪” cut short while the return control and board editor compete for the same row.
  - Fix: below 1680 px, the header becomes two rows. Brand and save/display/publish controls occupy row one; return-community and the 920 px case editor occupy row two. Board, tool rail, and inspector top insets move to 108 px so the new header never overlays the workspace.
  - Post-fix evidence: at 1249 px, all persistent actions, “返回社区”, board number, the complete title “南京的鸭子都去哪了？”, genre, and add button are visible with no document overflow. The same structure also passed at 1440 × 810; 1920 × 905 correctly returns to the compact one-row desktop header.

## Required fidelity surfaces

- Fonts and typography: existing project type families, weights, sizes, and letter spacing are preserved. New labels use the established compact monospace/header styles.
- Spacing and layout rhythm: header controls fit without colliding with the centered board switcher at the target viewport. Zoom spacing and board-edge insets are consistent.
- Colors and tokens: existing amber, charcoal, paper, and signal-red palette is preserved. The delete action uses the established destructive red family.
- Image quality and assets: existing cork texture, evidence cards, and editable SVG icon library remain unchanged. Community thumbnails reuse the actual stored case snapshot; no placeholder or replacement imagery was introduced.
- Copy and content: controls use concise Chinese labels: “删除案件”, “返回社区”, and “删除该线索”.

## Interaction and console checks

- Added a synthetic person clue.
- Opened its menu with right-click.
- Verified the unique “删除该线索” action.
- Verified a confirmation dialog opens before deletion.
- Verified public shared boards remain read-only through the existing `sharedView` guard.
- Edited the case title and genre directly inside the current-board control and verified the resulting values.
- Verified a longer test title, “南京的鸭子都去哪了？——第七码头目击档案”, fits the 1249 px editor without horizontal clipping (`clientWidth` and `scrollWidth` both 638 px).
- Verified the return-community icon remains visible when its text collapses at 1120 px and below; at the reported 1249 px width both icon and text remain visible.
- Loaded two live community records and verified two snapshot-backed corkboard thumbnails.
- Verified the public-list thumbnail background retains the real cork texture in light mode.
- Browser console warnings/errors: none.
- Document overflow at 1920 × 905, 1440 × 810, and 1249 × 720: none.

## Follow-up polish

- No remaining P0/P1/P2 issues.

final result: passed
