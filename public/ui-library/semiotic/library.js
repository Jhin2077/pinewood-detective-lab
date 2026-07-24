const signs = [{"id":"01-pressurized-area","zh":"增压区域","en":"PRESSURIZED AREA","category":"environment"},{"id":"02-artificial-gravity","zh":"人工重力增压区","en":"PRESSURIZED / ARTIFICIAL GRAVITY","category":"environment"},{"id":"03-gravity-absent","zh":"无人工重力","en":"ARTIFICIAL GRAVITY ABSENT","category":"environment"},{"id":"04-cryogenic-vault","zh":"低温储藏舱","en":"CRYOGENIC VAULT","category":"environment"},{"id":"05-airlock","zh":"气闸","en":"AIRLOCK","category":"environment"},{"id":"06-bulkhead-door","zh":"舱壁门","en":"BULKHEAD DOOR","category":"environment"},{"id":"07-non-pressurized-zone","zh":"非增压区域","en":"NON-PRESSURIZED AREA","category":"environment"},{"id":"08-pressure-suit-locker","zh":"压力服存放柜","en":"PRESSURE SUIT LOCKER","category":"systems"},{"id":"09-photonic-systems","zh":"光子系统","en":"PHOTONIC SYSTEMS","category":"systems"},{"id":"10-laser","zh":"激光系统","en":"LASER","category":"systems"},{"id":"11-electronic-systems","zh":"电子系统","en":"ASTRONIC SYSTEMS / ELECTRONICS","category":"systems"},{"id":"12-hazard-warning","zh":"危险警告","en":"HAZARD / WARNING","category":"systems"},{"id":"13-gravity-suit-required","zh":"人工重力失效需穿压力服","en":"ARTIFICIAL GRAVITY / SUIT REQUIRED","category":"systems"},{"id":"14-vacuum-no-gravity","zh":"真空无重力需穿压力服","en":"NON-PRESSURIZED / NO GRAVITY","category":"systems"},{"id":"15-exhaust","zh":"排气口","en":"EXHAUST","category":"hazard"},{"id":"16-radiation-shield","zh":"辐射屏蔽区","en":"AREA SHIELDED FROM RADIATION","category":"hazard"},{"id":"17-radiation-hazard","zh":"辐射危险","en":"RADIATION HAZARD","category":"hazard"},{"id":"18-high-radioactivity","zh":"高放射性","en":"HIGH RADIOACTIVITY","category":"hazard"},{"id":"19-refrigeration","zh":"冷藏区域","en":"REFRIGERATION","category":"hazard"},{"id":"20-directions","zh":"方向指引","en":"DIRECTIONS","category":"hazard"},{"id":"21-life-support","zh":"生命维持系统","en":"LIFE SUPPORT SYSTEM","category":"hazard"},{"id":"22-galley","zh":"餐饮区","en":"GALLEY","category":"services"},{"id":"23-coffee","zh":"咖啡供应","en":"COFFEE","category":"services"},{"id":"24-bridge","zh":"控制桥","en":"BRIDGE","category":"services"},{"id":"25-autodoc","zh":"自动医疗舱","en":"AUTODOC","category":"services"},{"id":"26-computer-terminal","zh":"计算终端","en":"COMPUTER TERMINAL","category":"services"},{"id":"27-medical","zh":"医疗站","en":"MEDICAL","category":"services"},{"id":"28-medical-life-support","zh":"医疗生命维持","en":"MEDICAL LIFE SUPPORT","category":"services"},{"id":"29-maintenance","zh":"维护通道","en":"MAINTENANCE","category":"structure"},{"id":"30-ladderway","zh":"梯井","en":"LADDERWAY","category":"structure"},{"id":"31-intercom","zh":"内部通讯","en":"INTERCOM","category":"structure"},{"id":"32-storage","zh":"普通储藏","en":"STORAGE","category":"structure"},{"id":"33-organic-storage","zh":"有机物储藏","en":"ORGANIC STORAGE / FOODSTUFFS","category":"structure"},{"id":"34-refrigerated-organic-storage","zh":"冷藏有机物","en":"REFRIGERATED ORGANIC STORAGE","category":"structure"},{"id":"35-air-circulation","zh":"空气循环","en":"AIR CIRCULATION","category":"structure"}];
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
  dialogImage.src = `./svg/${sign.id}.svg`;
  dialogImage.alt = sign.zh;
  dialogNumber.textContent = `SIGN ${sign.id.slice(0, 2)} / ${sign.category.toUpperCase()}`;
  dialogTitle.textContent = sign.zh;
  dialogEn.textContent = sign.en;
  dialogDownload.href = `./svg/${sign.id}.svg`;
  dialogDownload.download = `${sign.id}.svg`;
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
