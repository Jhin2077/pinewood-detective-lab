import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ArrowsClockwiseIcon,
  ArrowsOutIcon,
  BroadcastIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CursorClickIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileTextIcon,
  FireIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GraphIcon,
  HandIcon,
  HeartIcon,
  ImageIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoonIcon,
  NoteIcon,
  PlusIcon,
  PresentationIcon,
  PushPinIcon,
  ShareNetworkIcon,
  SignInIcon,
  StackIcon,
  SunIcon,
  TagIcon,
  TrashIcon,
  TrendUpIcon,
  TrophyIcon,
  UploadSimpleIcon,
  UserIcon,
  UserPlusIcon,
  XIcon,
} from "@phosphor-icons/react";

const here = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(here, "../src/ui-kit/icons/svg");

const iconSet = {
  "arrows-clockwise": ArrowsClockwiseIcon,
  "arrows-out": ArrowsOutIcon,
  broadcast: BroadcastIcon,
  chat: ChatCircleIcon,
  check: CheckCircleIcon,
  clock: ClockIcon,
  cursor: CursorClickIcon,
  download: DownloadSimpleIcon,
  eye: EyeIcon,
  document: FileTextIcon,
  fire: FireIcon,
  save: FloppyDiskIcon,
  folder: FolderOpenIcon,
  graph: GraphIcon,
  hand: HandIcon,
  heart: HeartIcon,
  image: ImageIcon,
  "link-break": LinkBreakIcon,
  link: LinkSimpleIcon,
  search: MagnifyingGlassIcon,
  minus: MinusIcon,
  moon: MoonIcon,
  note: NoteIcon,
  plus: PlusIcon,
  presentation: PresentationIcon,
  pin: PushPinIcon,
  share: ShareNetworkIcon,
  "sign-in": SignInIcon,
  stack: StackIcon,
  sun: SunIcon,
  tag: TagIcon,
  trash: TrashIcon,
  trend: TrendUpIcon,
  trophy: TrophyIcon,
  upload: UploadSimpleIcon,
  user: UserIcon,
  "user-plus": UserPlusIcon,
  x: XIcon,
};

await mkdir(outputDirectory, { recursive: true });

for (const [name, IconComponent] of Object.entries(iconSet)) {
  const svg = renderToStaticMarkup(
    createElement(IconComponent, {
      size: 24,
      weight: "bold",
      color: "#000000",
      "aria-hidden": "true",
    }),
  );
  await writeFile(resolve(outputDirectory, `${name}.svg`), `${svg}\n`, "utf8");
}

const manifest = Object.keys(iconSet).map((name) => ({
  id: name,
  file: `svg/${name}.svg`,
  format: "SVG",
  source: "Phosphor Icons",
  license: "MIT",
}));

await writeFile(
  resolve(outputDirectory, "../manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Exported ${manifest.length} editable SVG icons to ${outputDirectory}`);
