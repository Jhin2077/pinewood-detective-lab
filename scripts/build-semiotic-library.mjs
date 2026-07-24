import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(here, "../public/ui-library/semiotic");
const svgRoot = resolve(outputRoot, "svg");

const palette = {
  ivory: "#F4F3E7",
  red: "#B70D14",
  black: "#070707",
  gray: "#7D7E7B",
  silver: "#B9BAB5",
  blue: "#173A76",
  green: "#0F5B38",
  yellow: "#F2AA18",
  white: "#FFFDF2",
};

const signs = [
  {
    id: "01-pressurized-area",
    zh: "增压区域",
    en: "PRESSURIZED AREA",
    category: "environment",
    background: palette.ivory,
    body: `<g id="zone-field"><rect x="48" y="48" width="160" height="160" rx="6" fill="${palette.ivory}"/></g>`,
  },
  {
    id: "02-artificial-gravity",
    zh: "人工重力增压区",
    en: "PRESSURIZED / ARTIFICIAL GRAVITY",
    category: "environment",
    background: palette.ivory,
    body: `<g id="information-mark" fill="${palette.red}"><circle cx="128" cy="80" r="22"/><path d="M109 109h38v83h-38z"/><circle cx="128" cy="190" r="19"/></g>`,
  },
  {
    id: "03-gravity-absent",
    zh: "无人工重力",
    en: "ARTIFICIAL GRAVITY ABSENT",
    category: "environment",
    background: palette.ivory,
    body: `<g id="gravity-symbol" fill="${palette.red}"><path d="M111 199v-47H83v-25h28v-23L73 65l20-20 35 36 35-36 20 20-40 40v94z"/><circle cx="128" cy="198" r="20"/></g>`,
  },
  {
    id: "04-cryogenic-vault",
    zh: "低温储藏舱",
    en: "CRYOGENIC VAULT",
    category: "environment",
    background: palette.ivory,
    body: `<g id="cryogenic-mark"><path d="M75 54h106l-53 94z" fill="${palette.blue}"/><path d="M71 172h100v23H71z" fill="${palette.red}"/><circle cx="184" cy="184" r="13" fill="${palette.red}"/></g>`,
  },
  {
    id: "05-airlock",
    zh: "气闸",
    en: "AIRLOCK",
    category: "environment",
    background: palette.ivory,
    body: `<g id="airlock-mark"><path d="M33 34h190v190z" fill="${palette.black}"/><path d="M34 37h188M34 219h188" stroke="${palette.red}" stroke-width="12"/><path d="M41 45l174 174" stroke="${palette.white}" stroke-width="6"/></g>`,
  },
  {
    id: "06-bulkhead-door",
    zh: "舱壁门",
    en: "BULKHEAD DOOR",
    category: "environment",
    background: palette.ivory,
    body: `<g id="bulkhead-mark"><path d="M129 31h96v194h-96z" fill="${palette.black}"/><path d="M126 30v196M72 31h108M72 225h108" stroke="${palette.red}" stroke-width="12"/><path d="M129 112h76" stroke="${palette.white}" stroke-width="6"/></g>`,
  },
  {
    id: "07-non-pressurized-zone",
    zh: "非增压区域",
    en: "NON-PRESSURIZED AREA",
    category: "environment",
    background: palette.black,
    body: `<g id="vacuum-field"><path d="M37 39h182v151H37z" fill="${palette.black}"/><path d="M40 207h176" stroke="${palette.red}" stroke-width="14"/><path d="M43 194h170" stroke="${palette.white}" stroke-width="5"/></g>`,
  },
  {
    id: "08-pressure-suit-locker",
    zh: "压力服存放柜",
    en: "PRESSURE SUIT LOCKER",
    category: "systems",
    background: palette.gray,
    body: `<g id="suit-mark" fill="${palette.white}"><circle cx="128" cy="73" r="23"/><path d="M105 99h46l10 25h25v34h-33v58h-50v-58H70v-34h25z"/></g><circle id="helmet-signal" cx="128" cy="72" r="17" fill="${palette.red}"/>`,
  },
  {
    id: "09-photonic-systems",
    zh: "光子系统",
    en: "PHOTONIC SYSTEMS",
    category: "systems",
    background: palette.gray,
    body: `<g id="photon-route" fill="none" stroke="${palette.white}" stroke-width="7"><path d="M38 74h178v38H82v26h100v39H38"/><path d="M59 39v177M198 39v177"/></g>`,
  },
  {
    id: "10-laser",
    zh: "激光系统",
    en: "LASER",
    category: "systems",
    background: palette.gray,
    body: `<g id="laser-grid"><path d="M31 31h97v97H31zM128 128h97v97h-97z" fill="#696A67"/><path d="M128 31h97v97h-97zM31 128h97v97H31z" fill="#898A87"/><path d="M128 70l18 40 40 18-40 18-18 40-18-40-40-18 40-18z" fill="${palette.white}"/></g>`,
  },
  {
    id: "11-electronic-systems",
    zh: "电子系统",
    en: "ASTRONIC SYSTEMS / ELECTRONICS",
    category: "systems",
    background: palette.gray,
    body: `<g id="electronics-mark"><path d="M32 126h192" stroke="${palette.white}" stroke-width="6"/><path d="M102 55h52v36h36v52h-36v35h-52v-35H66V91h36z" fill="#696A67"/><path d="M94 73h68M128 40v66" stroke="${palette.white}" stroke-width="7"/><rect x="92" y="167" width="72" height="25" rx="5" fill="${palette.white}"/></g>`,
  },
  {
    id: "12-hazard-warning",
    zh: "危险警告",
    en: "HAZARD / WARNING",
    category: "systems",
    background: palette.red,
    body: `<g id="hazard-mark" fill="${palette.white}"><path d="M31 91h56V31h39v60h43V31h56v194h-56v-72h-43v72H87v-72H31z"/></g>`,
  },
  {
    id: "13-gravity-suit-required",
    zh: "人工重力失效需穿压力服",
    en: "ARTIFICIAL GRAVITY / SUIT REQUIRED",
    category: "systems",
    background: palette.black,
    body: `<g id="suited-person" fill="${palette.white}"><circle cx="128" cy="73" r="21"/><path d="M105 99h46l9 26h24v34h-32v58h-48v-58H72v-34h24z"/></g><circle cx="128" cy="72" r="15" fill="${palette.red}"/><path id="floor-signal" d="M32 207h46v18H32zm146 0h46v18h-46z" fill="${palette.red}"/>`,
  },
  {
    id: "14-vacuum-no-gravity",
    zh: "真空无重力需穿压力服",
    en: "NON-PRESSURIZED / NO GRAVITY",
    category: "systems",
    background: palette.black,
    body: `<g id="vacuum-gravity-mark" fill="${palette.white}"><path d="M113 198v-48H88v-27h25v-20L76 67l22-22 30 30 30-30 22 22-37 36v20h25v27h-25v48z"/></g><circle cx="128" cy="199" r="17" fill="${palette.red}"/>`,
  },
  {
    id: "15-exhaust",
    zh: "排气口",
    en: "EXHAUST",
    category: "hazard",
    background: palette.yellow,
    body: `<g id="exhaust-flow" fill="${palette.white}"><path d="M54 38h29v91l-25 82H31l23-90zM97 38h28v104l-12 69H85l12-73zM139 38h28v100l12 73h-28l-12-69zM181 38h27l17 83 0 90h-27l-17-82z"/></g>`,
  },
  {
    id: "16-radiation-shield",
    zh: "辐射屏蔽区",
    en: "AREA SHIELDED FROM RADIATION",
    category: "hazard",
    background: palette.red,
    body: `<g id="shield-information"><rect x="70" y="72" width="116" height="114" rx="12" fill="${palette.white}"/><circle cx="128" cy="98" r="18" fill="${palette.red}"/><path d="M113 121h30v48h-30z" fill="${palette.red}"/></g>`,
  },
  {
    id: "17-radiation-hazard",
    zh: "辐射危险",
    en: "RADIATION HAZARD",
    category: "hazard",
    background: palette.yellow,
    body: `<g id="radiation-indicator"><rect x="69" y="69" width="118" height="118" rx="10" fill="${palette.white}"/><path d="M70 163h83v24H70z" fill="${palette.black}"/><circle cx="170" cy="175" r="17" fill="${palette.black}"/></g>`,
  },
  {
    id: "18-high-radioactivity",
    zh: "高放射性",
    en: "HIGH RADIOACTIVITY",
    category: "hazard",
    background: palette.yellow,
    body: `<g id="radioactivity-cross"><path d="M32 32l192 192M224 32L32 224" stroke="${palette.white}" stroke-width="8"/><path d="M32 32h70l122 122v70h-70L32 102zm192 0v70L102 224H32v-70L154 32z" fill="${palette.black}"/></g>`,
  },
  {
    id: "19-refrigeration",
    zh: "冷藏区域",
    en: "REFRIGERATION",
    category: "hazard",
    background: palette.ivory,
    body: `<g id="cold-storage"><rect x="57" y="57" width="142" height="142" rx="9" fill="${palette.blue}"/><rect x="79" y="79" width="98" height="98" rx="5" fill="${palette.ivory}"/></g>`,
  },
  {
    id: "20-directions",
    zh: "方向指引",
    en: "DIRECTIONS",
    category: "hazard",
    background: palette.ivory,
    body: `<g id="direction-chevron" fill="${palette.red}"><path d="M48 159l80-80 80 80-25 25-55-55-55 55z"/></g>`,
  },
  {
    id: "21-life-support",
    zh: "生命维持系统",
    en: "LIFE SUPPORT SYSTEM",
    category: "hazard",
    background: palette.gray,
    body: `<g id="life-support-route" fill="${palette.white}"><path d="M93 31h70v37h31v43h31v34h-63v45h31v35H63v-35h31v-45H31v-34h31V68h31z"/><rect x="111" y="80" width="34" height="96" rx="5" fill="${palette.gray}"/></g>`,
  },
  {
    id: "22-galley",
    zh: "餐饮区",
    en: "GALLEY",
    category: "services",
    background: palette.green,
    body: `<g id="galley-mark"><circle cx="128" cy="128" r="77" fill="${palette.white}"/></g>`,
  },
  {
    id: "23-coffee",
    zh: "咖啡供应",
    en: "COFFEE",
    category: "services",
    background: palette.green,
    body: `<g id="coffee-mark" fill="${palette.white}"><path d="M55 92h116v83H55z"/><path d="M165 107h27c25 0 25 54 0 54h-27v-18h23c7 0 7-18 0-18h-23z"/></g>`,
  },
  {
    id: "24-bridge",
    zh: "控制桥",
    en: "BRIDGE",
    category: "services",
    background: palette.gray,
    body: `<g id="bridge-mark"><path d="M128 63l62 119H66z" fill="${palette.white}"/></g>`,
  },
  {
    id: "25-autodoc",
    zh: "自动医疗舱",
    en: "AUTODOC",
    category: "services",
    background: palette.green,
    body: `<g id="autodoc-corners" fill="${palette.white}"><rect x="41" y="41" width="62" height="62" rx="8"/><rect x="153" y="41" width="62" height="62" rx="8"/><rect x="41" y="153" width="62" height="62" rx="8"/><rect x="153" y="153" width="62" height="62" rx="8"/></g>`,
  },
  {
    id: "26-computer-terminal",
    zh: "计算终端",
    en: "COMPUTER TERMINAL",
    category: "services",
    background: palette.gray,
    body: `<g id="terminal-mark" fill="${palette.white}"><rect x="44" y="48" width="168" height="91" rx="5"/><rect x="44" y="151" width="35" height="27" rx="3"/><rect x="88" y="151" width="35" height="27" rx="3"/><rect x="132" y="151" width="35" height="27" rx="3"/><rect x="176" y="151" width="36" height="27" rx="3"/><rect x="44" y="186" width="35" height="27" rx="3"/><rect x="88" y="186" width="35" height="27" rx="3"/><rect x="132" y="186" width="80" height="27" rx="3"/></g>`,
  },
  {
    id: "27-medical",
    zh: "医疗站",
    en: "MEDICAL",
    category: "services",
    background: palette.ivory,
    body: `<g id="medical-cross"><path d="M101 45h54v56h56v54h-56v56h-54v-56H45v-54h56z" fill="${palette.red}"/></g>`,
  },
  {
    id: "28-medical-life-support",
    zh: "医疗生命维持",
    en: "MEDICAL LIFE SUPPORT",
    category: "services",
    background: palette.gray,
    body: `<g id="medical-support"><path d="M92 31h72v37h30v42h31v36h-62v44h31v35H62v-35h31v-44H31v-36h31V68h30z" fill="${palette.white}"/><path d="M116 88h24v22h22v24h-22v22h-24v-22H94v-24h22z" fill="${palette.red}"/></g>`,
  },
  {
    id: "29-maintenance",
    zh: "维护通道",
    en: "MAINTENANCE",
    category: "structure",
    background: palette.gray,
    body: `<g id="maintenance-mark" fill="${palette.white}"><path d="M48 47h35v86l28 28V47h34v114l28-28V47h35v101l-63 63h-34l-63-63z"/></g>`,
  },
  {
    id: "30-ladderway",
    zh: "梯井",
    en: "LADDERWAY",
    category: "structure",
    background: palette.gray,
    body: `<g id="ladder-mark" fill="${palette.white}"><path d="M49 43h35v61h88V43h35v170h-35v-65H84v65H49z"/></g>`,
  },
  {
    id: "31-intercom",
    zh: "内部通讯",
    en: "INTERCOM",
    category: "structure",
    background: palette.gray,
    body: `<g id="intercom-mark" fill="${palette.white}"><path d="M43 69h74V40l53 53-53 53v-30H43z"/><path d="M213 187h-74v29l-53-53 53-53v30h74z"/></g>`,
  },
  {
    id: "32-storage",
    zh: "普通储藏",
    en: "STORAGE",
    category: "structure",
    background: palette.gray,
    body: `<g id="storage-mark"><rect x="52" y="52" width="152" height="152" rx="8" fill="${palette.white}"/><rect x="75" y="75" width="106" height="106" rx="7" fill="${palette.gray}"/></g>`,
  },
  {
    id: "33-organic-storage",
    zh: "有机物储藏",
    en: "ORGANIC STORAGE / FOODSTUFFS",
    category: "structure",
    background: palette.red,
    body: `<g id="organic-storage"><rect x="48" y="48" width="160" height="160" rx="8" fill="${palette.white}"/><rect x="72" y="72" width="112" height="112" rx="7" fill="${palette.gray}"/><rect x="93" y="93" width="70" height="70" rx="6" fill="${palette.green}"/></g>`,
  },
  {
    id: "34-refrigerated-organic-storage",
    zh: "冷藏有机物",
    en: "REFRIGERATED ORGANIC STORAGE",
    category: "structure",
    background: palette.blue,
    body: `<g id="refrigerated-organic"><rect x="48" y="48" width="160" height="160" rx="8" fill="${palette.white}"/><rect x="72" y="72" width="112" height="112" rx="7" fill="${palette.blue}"/><rect x="93" y="93" width="70" height="70" rx="6" fill="${palette.green}"/></g>`,
  },
  {
    id: "35-air-circulation",
    zh: "空气循环",
    en: "AIR CIRCULATION",
    category: "structure",
    background: palette.gray,
    body: `<g id="air-circulation-mark" fill="none" stroke="${palette.white}" stroke-width="16" stroke-linecap="round"><path d="M128 118V63c0-26 41-26 41 0v17"/><path d="M138 128h55c26 0 26 41 0 41h-17"/><path d="M128 138v55c0 26-41 26-41 0v-17"/><path d="M118 128H63c-26 0-26-41 0-41h17"/></g><circle cx="128" cy="128" r="15" fill="${palette.white}"/>`,
  },
];

function renderSign(sign) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title desc">
  <title id="title">${sign.zh} / ${sign.en}</title>
  <desc id="desc">Pinewood Semiotic Signs vector asset. Number ${sign.id.slice(0, 2)}.</desc>
  <g id="frame">
    <rect id="outer-plate" x="6" y="6" width="244" height="244" rx="32" fill="${palette.ivory}" stroke="${palette.silver}" stroke-width="3"/>
    <rect id="signal-keyline" x="16" y="16" width="224" height="224" rx="25" fill="${sign.background}" stroke="${palette.red}" stroke-width="11"/>
    <rect id="inner-light-keyline" x="27" y="27" width="202" height="202" rx="14" fill="none" stroke="${palette.white}" stroke-width="5"/>
  </g>
  <g id="symbol">
    ${sign.body}
  </g>
</svg>
`;
}

function renderContactSheet() {
  const cellWidth = 188;
  const cellHeight = 226;
  const margin = 52;
  const titleHeight = 126;
  const width = margin * 2 + cellWidth * 7;
  const height = titleHeight + margin + cellHeight * 5 + margin;
  const cells = signs.map((sign, index) => {
    const column = index % 7;
    const row = Math.floor(index / 7);
    const x = margin + column * cellWidth;
    const y = titleHeight + margin + row * cellHeight;
    return `<g id="cell-${sign.id}" transform="translate(${x} ${y})">
      <g transform="scale(.6)">${renderSign(sign).replace(/^[\s\S]*?<g id="frame">/, '<g id="frame">').replace(/<\/svg>\s*$/, "")}</g>
      <text x="77" y="168" text-anchor="middle" font-family="Arial Narrow, sans-serif" font-size="11" font-weight="700" fill="${palette.black}">${sign.id.slice(0, 2)} · ${sign.zh}</text>
      <text x="77" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" letter-spacing=".7" fill="#555650">${sign.en}</text>
    </g>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${palette.ivory}"/>
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="26" fill="none" stroke="${palette.black}" stroke-width="16"/>
  <text x="${margin}" y="84" font-family="Arial Narrow, sans-serif" font-size="44" letter-spacing="1" fill="${palette.black}">PINEWOOD SEMIOTIC SIGNS</text>
  <text x="${width - margin}" y="66" text-anchor="end" font-family="Arial, sans-serif" font-size="12" letter-spacing="2" fill="#555650">35 EDITABLE VECTOR ASSETS</text>
  <text x="${width - margin}" y="86" text-anchor="end" font-family="Arial, sans-serif" font-size="10" letter-spacing="1.4" fill="${palette.red}">ONLINE WORKSHOP UI STANDARD / 2026</text>
  ${cells}
</svg>
`;
}

const categoryLabels = {
  all: "全部 35",
  environment: "环境舱段",
  systems: "系统状态",
  hazard: "危险指引",
  services: "公共服务",
  structure: "结构设施",
};

function renderLibraryHtml() {
  const filters = Object.entries(categoryLabels)
    .map(([id, label], index) => `<button class="filter${index === 0 ? " active" : ""}" data-filter="${id}">${label}</button>`)
    .join("");
  const cards = signs.map((sign) => `
      <article class="sign-card" data-category="${sign.category}" data-search="${sign.id} ${sign.zh} ${sign.en}">
        <button class="preview-button" data-id="${sign.id}" aria-label="预览 ${sign.zh}">
          <span class="index">${sign.id.slice(0, 2)}</span>
          <img src="./svg/${sign.id}.svg" alt="${sign.zh}" />
          <strong>${sign.zh}</strong>
          <small>${sign.en}</small>
        </button>
        <a href="./svg/${sign.id}.svg" download="${sign.id}.svg">下载 SVG</a>
      </article>`).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pinewood Semiotic Signs · UI 素材库</title>
  <link rel="stylesheet" href="./library.css" />
</head>
<body>
  <header class="library-header">
    <div>
      <p>ONLINE WORKSHOP UI STANDARD / VECTOR LIBRARY 01</p>
      <h1>Pinewood Semiotic Signs</h1>
      <span>35 个独立、分层、可编辑 SVG 标识</span>
    </div>
    <nav>
      <a href="./pinewood-semiotic-signs-svg.zip" download>下载全部 SVG</a>
      <a href="./contact-sheet.svg" download="pinewood-semiotic-contact-sheet.svg">下载总览板</a>
      <a href="./manifest.json" download>导出索引</a>
      <button id="theme-toggle" aria-label="切换预览背景">夜视预览</button>
    </nav>
  </header>
  <section class="library-toolbar">
    <label>
      <span>SEARCH / 检索</span>
      <input id="library-search" type="search" placeholder="编号、中文或英文名称…" />
    </label>
    <div class="filters" role="group" aria-label="标识分类">${filters}</div>
  </section>
  <main>
    <div class="library-grid">${cards}</div>
    <p id="empty-state" hidden>没有匹配的标识。</p>
  </main>
  <footer>
    <span>PINEWOOD SEMIOTIC SIGNS · 35 VECTOR ASSETS</span>
    <a href="./README.md">查看素材规范与编辑说明</a>
  </footer>
  <dialog id="sign-dialog">
    <button class="dialog-close" aria-label="关闭预览">×</button>
    <img id="dialog-image" alt="" />
    <p id="dialog-number"></p>
    <h2 id="dialog-title"></h2>
    <span id="dialog-en"></span>
    <a id="dialog-download" download>下载这个 SVG</a>
  </dialog>
  <script src="./library.js"></script>
</body>
</html>
`;
}

const libraryCss = `:root {
  --ivory: ${palette.ivory};
  --red: ${palette.red};
  --black: ${palette.black};
  --muted: #686963;
  --line: #C8C7BB;
  font-family: Inter, "Microsoft YaHei UI", sans-serif;
}
* { box-sizing: border-box; }
html { background: var(--ivory); color: var(--black); }
body { min-width: 320px; margin: 0; background: var(--ivory); }
body.night { --ivory: #11120F; --black: #F4F3E7; --muted: #A7A69D; --line: #41423C; }
button, input, a { font: inherit; }
button, a { cursor: pointer; }
.library-header {
  min-height: 136px; display: flex; align-items: center; justify-content: space-between; gap: 28px;
  padding: 25px 44px; border-bottom: 8px solid var(--black);
}
.library-header p, .library-toolbar label span {
  margin: 0 0 6px; color: var(--red); font: 700 9px/1 ui-monospace, Consolas, monospace; letter-spacing: .16em;
}
.library-header h1 { margin: 0; font: 400 42px/1 "Arial Narrow", sans-serif; letter-spacing: .02em; }
.library-header div > span { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; }
.library-header nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.library-header a, .library-header button, .sign-card > a, #sign-dialog > a {
  min-height: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0 13px;
  color: var(--black); background: var(--ivory); border: 2px solid var(--black); border-radius: 8px;
  text-decoration: none; font-size: 11px; font-weight: 750;
}
.library-header nav a:first-child, #sign-dialog > a { color: #FFFDF2; background: var(--red); }
.library-toolbar {
  position: sticky; z-index: 5; top: 0; display: flex; align-items: end; justify-content: space-between; gap: 22px;
  padding: 18px 44px; background: color-mix(in srgb, var(--ivory) 94%, transparent); border-bottom: 1px solid var(--line); backdrop-filter: blur(10px);
}
.library-toolbar label { min-width: min(420px, 44vw); }
.library-toolbar input {
  width: 100%; height: 42px; padding: 0 13px; color: var(--black); background: transparent;
  border: 2px solid var(--black); border-radius: 8px; outline: 0;
}
.library-toolbar input:focus { border-color: var(--red); box-shadow: 0 0 0 2px var(--ivory), 0 0 0 4px var(--red); }
.filters { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.filter { height: 34px; padding: 0 11px; color: var(--muted); background: transparent; border: 1px solid var(--line); border-radius: 6px; }
.filter.active { color: #FFFDF2; background: var(--red); border-color: var(--black); }
main { padding: 28px 44px 70px; }
.library-grid { display: grid; grid-template-columns: repeat(7, minmax(132px, 1fr)); gap: 22px 13px; }
.sign-card { min-width: 0; text-align: center; }
.preview-button { width: 100%; padding: 9px 7px 12px; color: var(--black); background: transparent; border: 0; border-radius: 13px; }
.preview-button:hover { background: color-mix(in srgb, var(--red) 8%, transparent); }
.preview-button .index {
  width: 28px; height: 22px; display: grid; place-items: center; margin: 0 auto -13px; position: relative; z-index: 1;
  color: #FFFDF2; background: var(--red); border: 2px solid var(--black); border-radius: 5px;
  font: 700 9px/1 ui-monospace, Consolas, monospace;
}
.preview-button img { width: 100%; max-width: 164px; aspect-ratio: 1; display: block; margin: 0 auto; }
.preview-button strong { min-height: 18px; display: block; margin-top: 4px; font-size: 12px; }
.preview-button small { min-height: 22px; display: block; margin-top: 3px; color: var(--muted); font-size: 7px; line-height: 1.25; letter-spacing: .05em; }
.sign-card > a { min-height: 30px; padding: 0 9px; border-width: 1px; font-size: 9px; opacity: 0; transition: opacity 120ms ease; }
.sign-card:hover > a, .sign-card:focus-within > a { opacity: 1; }
#empty-state { min-height: 260px; display: grid; place-items: center; color: var(--muted); border: 2px dashed var(--line); }
#empty-state[hidden] { display: none; }
footer { min-height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 44px; border-top: 8px solid var(--black); font-size: 10px; }
footer a { color: var(--red); }
dialog {
  width: min(430px, calc(100% - 28px)); padding: 26px; color: var(--black); background: var(--ivory);
  border: 4px solid var(--black); border-radius: 18px; box-shadow: inset 0 0 0 3px var(--ivory), inset 0 0 0 5px var(--red);
  text-align: center;
}
dialog::backdrop { background: rgba(0,0,0,.72); backdrop-filter: blur(6px); }
.dialog-close { position: absolute; top: 11px; right: 11px; width: 32px; height: 32px; color: var(--black); background: transparent; border: 0; font-size: 24px; }
#dialog-image { width: min(250px, 74vw); aspect-ratio: 1; }
#dialog-number { margin: 9px 0 4px; color: var(--red); font: 700 9px/1 ui-monospace, Consolas, monospace; letter-spacing: .16em; }
#dialog-title { margin: 0; font-size: 22px; }
#dialog-en { display: block; margin: 5px 0 17px; color: var(--muted); font-size: 9px; letter-spacing: .08em; }
@media (max-width: 1100px) { .library-grid { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 800px) {
  .library-header, .library-toolbar { align-items: stretch; flex-direction: column; padding-left: 20px; padding-right: 20px; }
  .library-header nav { justify-content: flex-start; }
  .library-toolbar label { min-width: 0; }
  .filters { justify-content: flex-start; }
  main { padding-left: 16px; padding-right: 16px; }
  .library-grid { grid-template-columns: repeat(3, 1fr); }
  footer { padding: 14px 20px; gap: 12px; }
}
@media (max-width: 470px) {
  .library-header h1 { font-size: 34px; }
  .library-grid { grid-template-columns: repeat(2, 1fr); }
  .filters { display: grid; grid-template-columns: 1fr 1fr; }
  footer { align-items: flex-start; flex-direction: column; }
}
`;

const libraryJs = `const signs = ${JSON.stringify(signs.map(({ id, zh, en, category }) => ({ id, zh, en, category })))};
const cards = [...document.querySelectorAll(".sign-card")];
const filters = [...document.querySelectorAll(".filter")];
const search = document.querySelector("#library-search");
const emptyState = document.querySelector("#empty-state");
let activeFilter = "all";

function updateLibrary() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach((card) => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatch = !query || card.dataset.search.toLowerCase().includes(query);
    card.hidden = !(categoryMatch && searchMatch);
    if (!card.hidden) visible += 1;
  });
  emptyState.hidden = visible !== 0;
}

filters.forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filters.forEach((item) => item.classList.toggle("active", item === button));
  updateLibrary();
}));
search.addEventListener("input", updateLibrary);

const dialog = document.querySelector("#sign-dialog");
const dialogImage = document.querySelector("#dialog-image");
const dialogNumber = document.querySelector("#dialog-number");
const dialogTitle = document.querySelector("#dialog-title");
const dialogEn = document.querySelector("#dialog-en");
const dialogDownload = document.querySelector("#dialog-download");
document.querySelectorAll(".preview-button").forEach((button) => button.addEventListener("click", () => {
  const sign = signs.find((item) => item.id === button.dataset.id);
  dialogImage.src = \`./svg/\${sign.id}.svg\`;
  dialogImage.alt = sign.zh;
  dialogNumber.textContent = \`SIGN \${sign.id.slice(0, 2)} / \${sign.category.toUpperCase()}\`;
  dialogTitle.textContent = sign.zh;
  dialogEn.textContent = sign.en;
  dialogDownload.href = \`./svg/\${sign.id}.svg\`;
  dialogDownload.download = \`\${sign.id}.svg\`;
  dialog.showModal();
}));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const themeToggle = document.querySelector("#theme-toggle");
const storedTheme = localStorage.getItem("pinewood-semiotic-preview-theme");
if (storedTheme === "night") document.body.classList.add("night");
function updateThemeLabel() {
  themeToggle.textContent = document.body.classList.contains("night") ? "象牙纸预览" : "夜视预览";
}
updateThemeLabel();
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("night");
  localStorage.setItem("pinewood-semiotic-preview-theme", document.body.classList.contains("night") ? "night" : "light");
  updateThemeLabel();
});
`;

const readme = `# Pinewood Semiotic Signs · UI 素材库

这是根据用户提供的 Semiotic Standard 视觉参考，为 Pinewood Case Board / Online Workshop 重绘的矢量标识库。

## 内容

- \`svg/\`：35 个独立 SVG 文件，均为真正的矢量路径与基础图形。
- \`contact-sheet.svg\`：35 个标识的矢量总览板。
- \`manifest.json\`：编号、中文名、英文名、分类和颜色索引。
- \`index.html\`：可检索、筛选、预览和单独下载的素材库页面。
- \`library.css\` / \`library.js\`：素材库界面样式与交互。
- \`reference-source.png\`：用户提供的视觉母版，保留用于以后校对。
- \`pinewood-semiotic-signs-svg.zip\`：可直接交给设计师的完整矢量素材包。

## SVG 分层

每个文件都使用稳定的图层 ID：

- \`frame\`：外框、红色信号框、白色内框。
- \`symbol\`：该标识的主体几何图形。
- 主体内部继续按功能拆分，例如 \`medical-cross\`、\`terminal-mark\`。

可直接在 Figma、Illustrator、Inkscape 或文本编辑器中修改颜色、比例和路径。

## 颜色

| 名称 | 色值 |
| --- | --- |
| Ivory | \`${palette.ivory}\` |
| Signal Red | \`${palette.red}\` |
| Black | \`${palette.black}\` |
| System Gray | \`${palette.gray}\` |
| Cryogenic Blue | \`${palette.blue}\` |
| Service Green | \`${palette.green}\` |
| Hazard Yellow | \`${palette.yellow}\` |

## 设计说明

- 保留参考图的 7 × 5 编号结构、圆角双框、粗块面几何和六色系统。
- 对部分内部结构做了 Pinewood 化简化，保证 24–48 px 的网页尺寸仍然清晰。
- 这套标识与 \`src/ui-kit/icons/svg/\` 中的通用操作图标分开：Semiotic Signs 用于“区域、状态、档案类型和系统分类”，通用图标用于“搜索、登录、下载、编辑”等操作。
- 视觉参考来自用户提供的图片；在对外商业发布前，请确认原始参考的使用权限。

## 重新生成

\`\`\`powershell
npm run ui:build-semiotic
npm run ui:package-semiotic
\`\`\`
`;

await mkdir(svgRoot, { recursive: true });
for (const sign of signs) {
  await writeFile(resolve(svgRoot, `${sign.id}.svg`), renderSign(sign), "utf8");
}

await Promise.all([
  writeFile(resolve(outputRoot, "contact-sheet.svg"), renderContactSheet(), "utf8"),
  writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify({ version: 1, palette, signs: signs.map(({ body, background, ...entry }) => entry) }, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputRoot, "index.html"), renderLibraryHtml(), "utf8"),
  writeFile(resolve(outputRoot, "library.css"), libraryCss, "utf8"),
  writeFile(resolve(outputRoot, "library.js"), libraryJs, "utf8"),
  writeFile(resolve(outputRoot, "README.md"), readme, "utf8"),
]);

console.log(`Built ${signs.length} Semiotic SVG assets in ${outputRoot}`);
