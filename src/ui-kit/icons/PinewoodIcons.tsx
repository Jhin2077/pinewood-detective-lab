import {
  type CSSProperties,
  type ComponentType,
  type HTMLAttributes,
} from "react";

const iconFiles = {
  "arrows-clockwise": "arrows-clockwise.svg",
  "arrows-out": "arrows-out.svg",
  broadcast: "broadcast.svg",
  chat: "chat.svg",
  check: "check.svg",
  clock: "clock.svg",
  cursor: "cursor.svg",
  download: "download.svg",
  eye: "eye.svg",
  document: "document.svg",
  fire: "fire.svg",
  save: "save.svg",
  folder: "folder.svg",
  graph: "graph.svg",
  hand: "hand.svg",
  heart: "heart.svg",
  image: "image.svg",
  "link-break": "link-break.svg",
  link: "link.svg",
  search: "search.svg",
  minus: "minus.svg",
  moon: "moon.svg",
  note: "note.svg",
  plus: "plus.svg",
  presentation: "presentation.svg",
  pin: "pin.svg",
  share: "share.svg",
  "sign-in": "sign-in.svg",
  stack: "stack.svg",
  sun: "sun.svg",
  tag: "tag.svg",
  trash: "trash.svg",
  trend: "trend.svg",
  trophy: "trophy.svg",
  undo: "undo.svg",
  upload: "upload.svg",
  user: "user.svg",
  "user-plus": "user-plus.svg",
  x: "x.svg",
} as const;

export type PinewoodIconName = keyof typeof iconFiles;

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
};

export type Icon = ComponentType<IconProps>;

function PinewoodIcon({
  name,
  size = 20,
  className = "",
  color,
  style,
  weight: _weight,
  ...props
}: IconProps & { name: PinewoodIconName }) {
  const source = new URL(`./svg/${iconFiles[name]}`, import.meta.url).href;
  const iconStyle = {
    "--pinewood-icon-size": typeof size === "number" ? `${size}px` : size,
    "--pinewood-icon-source": `url("${source}")`,
    color,
    ...style,
  } as CSSProperties;

  return (
    <span
      {...props}
      aria-hidden={props["aria-label"] ? undefined : true}
      className={`pinewood-ui-icon ${className}`.trim()}
      data-ui-icon={name}
      style={iconStyle}
    />
  );
}

function icon(name: PinewoodIconName): Icon {
  return (props) => <PinewoodIcon name={name} {...props} />;
}

export const ArrowsClockwiseIcon = icon("arrows-clockwise");
export const ArrowsOutIcon = icon("arrows-out");
export const BroadcastIcon = icon("broadcast");
export const ChatCircleIcon = icon("chat");
export const CheckCircleIcon = icon("check");
export const ClockIcon = icon("clock");
export const CursorClickIcon = icon("cursor");
export const DownloadSimpleIcon = icon("download");
export const EyeIcon = icon("eye");
export const FileTextIcon = icon("document");
export const FireIcon = icon("fire");
export const FloppyDiskIcon = icon("save");
export const FolderOpenIcon = icon("folder");
export const GraphIcon = icon("graph");
export const HandIcon = icon("hand");
export const HeartIcon = icon("heart");
export const ImageIcon = icon("image");
export const LinkBreakIcon = icon("link-break");
export const LinkSimpleIcon = icon("link");
export const MagnifyingGlassIcon = icon("search");
export const MinusIcon = icon("minus");
export const MoonIcon = icon("moon");
export const NoteIcon = icon("note");
export const PlusIcon = icon("plus");
export const PresentationIcon = icon("presentation");
export const PushPinIcon = icon("pin");
export const ShareNetworkIcon = icon("share");
export const SignInIcon = icon("sign-in");
export const StackIcon = icon("stack");
export const SunIcon = icon("sun");
export const TagIcon = icon("tag");
export const TrashIcon = icon("trash");
export const TrendUpIcon = icon("trend");
export const TrophyIcon = icon("trophy");
export const UndoIcon = icon("undo");
export const UploadSimpleIcon = icon("upload");
export const UserIcon = icon("user");
export const UserPlusIcon = icon("user-plus");
export const XIcon = icon("x");
