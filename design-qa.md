# Design QA

## Comparison target

- Source visual truth:
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-0791b90a-ec70-4dd6-aacf-bc02fb6ce38a.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-cbb4eadb-342c-4a50-b19c-2fef2d2b6d0d.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-7cb89430-bdb1-4358-bff9-74d65d09ba41.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-4508691b-3ace-4d34-a292-6223cd4b2f4a.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-b830f6b4-ec83-4275-b673-34478f3dc5e7.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-a02a4fe6-9b8a-4a87-9ecf-9d69b4ff9796.png`
  - `C:\Users\ALIENWARE\AppData\Local\Temp\codex-clipboard-b0f144ce-71fd-4533-8039-3a57c18ff6a2.png`
- Browser-rendered implementation:
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-implementation.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-context-menu.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-merged-case-editor-1280.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-full-board-thumbnails-1280.png`
- Combined comparisons:
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-layout-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-context-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-case-editor-comparison.png`
  - `C:\Users\ALIENWARE\.codex\visualizations\2026\07\24\019f9224-fb58-7353-8887-7e05c7f68da5\qa-community-thumbnail-comparison.png`
- Viewports: 1920 × 905 CSS px for source-sized layout measurement and 1280 × 720 CSS px for the normal browser-window regression pass.
- Density: device scale factor 1. Focused comparison crops were normalized to a shared width before inspection.
- State: desktop editable case board. The public-owner delete button remains conditional on the authenticated owner; its header slot and compact owner-state width were checked against the available 286 px region.

## Full-view comparison evidence

The combined layout comparison confirms that the community actions moved from the bottom overlay into the open header region immediately after the brand block. At 1920 px the slot begins at x=509 and the board switcher begins at x=795, leaving 286 px for the complete owner-state action group. The zoom control is fully inside the board stage with a 16 px right and bottom inset. All five children have fixed widths, remain within the control, and have no internal border lines. A one-item timeline no longer draws a meaningless horizontal connector.

The focused case-editor comparison confirms that the current-board control now exposes board number, case name, and case type in one horizontal edit surface. The old duplicate title/type controls were removed from the brand block, leaving only the stable CASE ID. At 1280 px the compact editor remains fully readable with no document overflow.

The community comparison confirms that each feed card now renders the case's corkboard snapshot rather than its first uploaded image. Existing clue coordinates are normalized into the thumbnail, evidence links are drawn beneath the clue cards, and a clue/link count communicates complexity.

## Focused region comparison evidence

The context-menu comparison shows the requested destructive action as the final, red-accented menu item. It preserves the existing layer and connection actions and does not appear in shared read-only mode.

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
- Loaded two live community records and verified two snapshot-backed corkboard thumbnails.
- Verified the public-list thumbnail background retains the real cork texture in light mode.
- Browser console warnings/errors: none.
- Document overflow at 1920 × 905 and 1280 × 720: none.

## Follow-up polish

- No remaining P0/P1/P2 issues.

final result: passed
