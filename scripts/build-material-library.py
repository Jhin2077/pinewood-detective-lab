from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


@dataclass(frozen=True)
class CategorySpec:
    category_id: str
    label: str
    description: str
    source_folder: str | None
    output_folder: str
    prefix: str
    max_side: int
    quality: int
    friendly_prefix: str


CATEGORIES = (
    CategorySpec(
        category_id="comic",
        label="漫画拼贴",
        description="人物、动植物、符号与复古剪纸元素",
        source_folder="1-剪纸拼贴元素",
        output_folder="comic-collage",
        prefix="comic",
        max_side=640,
        quality=72,
        friendly_prefix="漫画拼贴",
    ),
    CategorySpec(
        category_id="background",
        label="复古背景",
        description="纸张、纹理与可铺满画板的背景素材",
        source_folder="2-背景",
        output_folder="backgrounds",
        prefix="background",
        max_side=1080,
        quality=68,
        friendly_prefix="复古背景",
    ),
    CategorySpec(
        category_id="text",
        label="装饰文字",
        description="标题、标签与漫画式文字装饰",
        source_folder="3-装饰文字",
        output_folder="decorative-text",
        prefix="text",
        max_side=720,
        quality=74,
        friendly_prefix="装饰文字",
    ),
    CategorySpec(
        category_id="layout",
        label="拼贴版式",
        description="已经组合完成的拼贴画面与构图参考",
        source_folder="4-10个预置拼贴效果",
        output_folder="collage-layouts",
        prefix="layout",
        max_side=1080,
        quality=68,
        friendly_prefix="拼贴版式",
    ),
    CategorySpec(
        category_id="object",
        label="物件剪贴",
        description="从复古物件总览图中逐件拆分的透明素材",
        source_folder=None,
        output_folder="object-clippings",
        prefix="object",
        max_side=560,
        quality=78,
        friendly_prefix="物件剪贴",
    ),
)


# (name, left, top, right, bottom)
# Coordinates are measured against the supplied 639 x 911 reference sheet.
OBJECT_CROPS = (
    ("寻人启事", 7, 3, 158, 105),
    ("彩色镜片", 169, 3, 255, 55),
    ("几何山峰", 253, 0, 373, 68),
    ("黑色太阳镜", 374, 2, 478, 58),
    ("Hello姓名贴", 386, 49, 463, 109),
    ("灰色录像带", 478, 2, 638, 103),
    ("复古方形镜片", 168, 45, 254, 109),
    ("Fire纸条", 251, 55, 391, 127),
    ("红框眼镜", 0, 118, 176, 160),
    ("迷你磁带", 108, 116, 158, 153),
    ("甜甜圈", 169, 104, 254, 188),
    ("金色糖果", 246, 139, 313, 181),
    ("黑色鸟形物", 309, 133, 382, 184),
    ("黑胶唱片", 384, 102, 466, 190),
    ("红色磁带", 468, 96, 541, 145),
    ("黑色眼罩", 546, 99, 632, 163),
    ("粉色蝴蝶结", 4, 168, 69, 244),
    ("半颗椰子", 59, 148, 172, 253),
    ("白色牙膏", 166, 178, 274, 240),
    ("松树徽章", 278, 168, 379, 249),
    ("汽车钥匙", 372, 166, 479, 241),
    ("樱桃派", 470, 142, 579, 249),
    ("金属小勺", 586, 148, 638, 243),
    ("白色多米诺", 7, 235, 52, 295),
    ("银色手电筒", 50, 234, 100, 386),
    ("几何符号卡", 96, 230, 172, 329),
    ("白色棋子", 162, 226, 199, 285),
    ("黑色录像带", 192, 233, 286, 300),
    ("断裂手势", 286, 229, 345, 287),
    ("录音磁带", 337, 226, 433, 294),
    ("黑色棋子", 423, 226, 459, 285),
    ("老式录音机", 459, 224, 539, 330),
    ("黑色手电筒", 537, 229, 590, 386),
    ("灰色标签片", 588, 228, 635, 295),
    ("黑色小汽车", 4, 279, 51, 385),
    ("老式计算器", 91, 338, 184, 408),
    ("Twin Peaks帽章", 170, 293, 251, 354),
    ("人物肖像", 244, 281, 380, 423),
    ("警局徽章A", 181, 331, 242, 415),
    ("警局徽章B", 371, 327, 434, 413),
    ("黑色相机", 440, 336, 545, 393),
    ("红色小汽车", 580, 302, 639, 395),
    ("美国国旗", 4, 382, 76, 458),
    ("火柴盒", 88, 402, 130, 464),
    ("Twin Peaks棒球帽", 124, 382, 214, 460),
    ("黄色挤压瓶", 207, 381, 263, 494),
    ("红色挤压瓶", 371, 382, 414, 493),
    ("白色马克杯", 415, 378, 501, 461),
    ("折叠小刀", 502, 392, 542, 467),
    ("木质画框", 533, 363, 638, 468),
    ("黄色圆片", 0, 438, 60, 505),
    ("调查记录本", 48, 452, 177, 618),
    ("蓝色圆章A", 164, 476, 221, 536),
    ("蓝色圆章B", 402, 476, 466, 536),
    ("黑金相框", 461, 438, 575, 579),
    ("警长星章", 575, 466, 639, 536),
    ("银色餐刀", 4, 493, 45, 618),
    ("小丑扑克牌", 164, 540, 220, 616),
    ("皇后扑克牌A", 210, 540, 274, 616),
    ("红色牌背", 264, 540, 328, 616),
    ("国王扑克牌", 317, 540, 384, 616),
    ("皇后扑克牌B", 373, 540, 440, 616),
    ("警局臂章A", 83, 602, 176, 653),
    ("黑色翻盖电话", 184, 606, 226, 694),
    ("木纹证物", 221, 608, 408, 704),
    ("玻璃小瓶", 402, 616, 446, 704),
    ("警局臂章B", 442, 602, 542, 655),
    ("白色圆片A", 124, 640, 183, 698),
    ("左轮手枪A", 43, 610, 132, 713),
    ("白色圆片B", 448, 640, 508, 698),
    ("左轮手枪B", 510, 608, 597, 713),
    ("扑克牌左", 56, 700, 120, 790),
    ("Lucy Moran标签", 108, 686, 180, 852),
    ("银色手铐", 466, 686, 535, 835),
    ("扑克牌右", 520, 700, 590, 790),
    ("长笛状证物", 5, 635, 47, 889),
    ("Twin Peaks城市牌", 170, 670, 471, 909),
    ("黑色钥匙", 530, 800, 612, 846),
    ("Pro 04纸条", 65, 840, 170, 898),
    ("手写签名", 468, 837, 575, 899),
    ("金属铲片", 565, 838, 639, 907),
)


def natural_key(path: Path) -> list[object]:
    return [
        int(chunk) if chunk.isdigit() else chunk.casefold()
        for chunk in re.split(r"(\d+)", path.name)
    ]


def has_visible_alpha(image: Image.Image) -> bool:
    return "A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255


def trim_alpha(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        return image
    box = image.getchannel("A").getbbox()
    return image.crop(box) if box else image


def resize_for_web(image: Image.Image, max_side: int) -> Image.Image:
    width, height = image.size
    if max(width, height) <= max_side:
        return image
    scale = max_side / max(width, height)
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_webp(image: Image.Image, output_path: Path, quality: int) -> tuple[int, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if has_visible_alpha(image):
        image = image.convert("RGBA")
        image.save(
            output_path,
            "WEBP",
            quality=quality,
            alpha_quality=82,
            method=6,
            exact=False,
        )
    else:
        image = image.convert("RGB")
        image.save(output_path, "WEBP", quality=quality, method=6)
    return image.size


def load_source_image(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.seek(0)
        image = ImageOps.exif_transpose(source).copy()
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")
    return trim_alpha(image)


def make_manifest_entry(
    asset_id: str,
    name: str,
    category: CategorySpec,
    output_path: Path,
    output_root: Path,
    size: tuple[int, int],
    source_name: str,
) -> dict[str, object]:
    width, height = size
    return {
        "id": asset_id,
        "name": name,
        "category": category.category_id,
        "image": output_path.relative_to(output_root.parent.parent).as_posix(),
        "aspectRatio": round(width / max(1, height), 5),
        "width": width,
        "height": height,
        "keywords": [
            category.label,
            category.friendly_prefix,
            source_name,
            name,
        ],
    }


def estimate_background(image: Image.Image) -> np.ndarray:
    array = np.asarray(image.convert("RGB"), dtype=np.int16)
    border = np.concatenate(
        (
            array[:8, :, :].reshape(-1, 3),
            array[-8:, :, :].reshape(-1, 3),
            array[:, :8, :].reshape(-1, 3),
            array[:, -8:, :].reshape(-1, 3),
        ),
        axis=0,
    )
    red_border = border[
        (border[:, 0] > border[:, 1] * 1.6)
        & (border[:, 0] > border[:, 2] * 1.45)
    ]
    sample = red_border if len(red_border) else border
    return np.median(sample, axis=0)


def remove_connected_red_background(
    image: Image.Image,
    background: np.ndarray,
    preserve_red: bool = False,
) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[:, :, :3].astype(np.int16)
    distance = np.sqrt(np.sum((rgb - background.reshape(1, 1, 3)) ** 2, axis=2))
    # The supplied sheet is a compressed JPEG, so the nominally flat red
    # background contains a wide family of dark and bright compression tones.
    red_like = (
        (rgb[:, :, 0] > 88)
        & (rgb[:, :, 0] > rgb[:, :, 1] * 1.34)
        & (rgb[:, :, 0] > rgb[:, :, 2] * 1.24)
        & (rgb[:, :, 1] < 122)
        & (rgb[:, :, 2] < 132)
    )
    candidate = distance < 62 if preserve_red else ((distance < 112) | red_like)
    height, width = candidate.shape
    connected = np.zeros((height, width), dtype=np.bool_)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if candidate[y, x] and not connected[y, x]:
            connected[y, x] = True
            queue.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while queue:
        y, x = queue.popleft()
        for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if (
                0 <= next_y < height
                and 0 <= next_x < width
                and candidate[next_y, next_x]
                and not connected[next_y, next_x]
            ):
                connected[next_y, next_x] = True
                queue.append((next_y, next_x))

    edge_alpha = np.clip((distance - 18) / 62 * 255, 0, 255).astype(np.uint8)
    # Also key the closest red tones globally. JPEG blocks can create tiny
    # islands that are visually background but no longer connect to an edge.
    remove_mask = connected | (distance < (34 if preserve_red else 72))
    if not preserve_red:
        remove_mask = remove_mask | red_like
    keyed_alpha = np.where(red_like, 0, edge_alpha).astype(np.uint8)
    rgba[:, :, 3] = np.where(remove_mask, np.minimum(rgba[:, :, 3], keyed_alpha), rgba[:, :, 3])
    result = trim_alpha(Image.fromarray(rgba, "RGBA"))
    return result


def remove_stray_components(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    mask = rgba[:, :, 3] > 36
    height, width = mask.shape
    visited = np.zeros((height, width), dtype=np.bool_)
    components: list[dict[str, object]] = []

    for start_y in range(height):
        for start_x in range(width):
            if not mask[start_y, start_x] or visited[start_y, start_x]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_y, start_x)])
            visited[start_y, start_x] = True
            pixels: list[tuple[int, int]] = []
            min_x = max_x = start_x
            min_y = max_y = start_y
            sum_x = 0
            sum_y = 0
            while queue:
                y, x = queue.popleft()
                pixels.append((y, x))
                sum_x += x
                sum_y += y
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                for next_y in range(max(0, y - 1), min(height, y + 2)):
                    for next_x in range(max(0, x - 1), min(width, x + 2)):
                        if (
                            mask[next_y, next_x]
                            and not visited[next_y, next_x]
                        ):
                            visited[next_y, next_x] = True
                            queue.append((next_y, next_x))
            area = len(pixels)
            components.append(
                {
                    "pixels": pixels,
                    "area": area,
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "center": (sum_x / area, sum_y / area),
                }
            )

    if not components:
        return image
    components.sort(key=lambda component: int(component["area"]), reverse=True)
    largest = components[0]
    largest_area = int(largest["area"])
    main_x, main_y = largest["center"]
    max_distance = max(width, height) * 0.52
    keep_components = []
    for component in components:
        area = int(component["area"])
        center_x, center_y = component["center"]
        distance = math.hypot(center_x - main_x, center_y - main_y)
        if component is largest or (
            area >= max(8, largest_area * 0.075)
            and distance <= max_distance
        ):
            keep_components.append(component)

    keep_mask = np.zeros((height, width), dtype=np.bool_)
    for component in keep_components:
        for y, x in component["pixels"]:
            keep_mask[y, x] = True
    rgba[:, :, 3] = np.where(keep_mask, rgba[:, :, 3], 0)
    cleaned = Image.fromarray(rgba, "RGBA")
    box = cleaned.getchannel("A").getbbox()
    if not box:
        return cleaned
    left, top, right, bottom = box
    padding = 3
    return cleaned.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(width, right + padding),
            min(height, bottom + padding),
        )
    )


def process_source_categories(
    source_root: Path,
    secondary_root: Path | None,
    output_root: Path,
) -> tuple[list[dict[str, object]], int, int]:
    entries: list[dict[str, object]] = []
    input_bytes = 0
    skipped_duplicates = 0
    known_secondary_keys: set[tuple[str, int]] = set()

    comic_folder = source_root / "1-剪纸拼贴元素"
    if comic_folder.exists():
        known_secondary_keys = {
            (path.name.casefold(), path.stat().st_size)
            for path in comic_folder.glob("*")
            if path.is_file()
        }

    for category in CATEGORIES:
        if category.source_folder is None:
            continue
        folder = source_root / category.source_folder
        if not folder.exists():
            continue
        source_files = sorted(
            (
                path
                for path in folder.rglob("*")
                if path.is_file() and path.suffix.casefold() in {".png", ".jpg", ".jpeg", ".webp"}
            ),
            key=natural_key,
        )
        for index, source_path in enumerate(source_files, start=1):
            input_bytes += source_path.stat().st_size
            output_path = (
                output_root
                / category.output_folder
                / f"{category.prefix}-{index:03d}.webp"
            )
            image = resize_for_web(load_source_image(source_path), category.max_side)
            size = save_webp(image, output_path, category.quality)
            entry = make_manifest_entry(
                asset_id=f"{category.prefix}-{index:03d}",
                name=f"{category.friendly_prefix} {index:03d}",
                category=category,
                output_path=output_path,
                output_root=output_root,
                size=size,
                source_name=source_path.stem,
            )
            entries.append(entry)

    if secondary_root and secondary_root.exists():
        for source_path in secondary_root.glob("*"):
            if not source_path.is_file() or source_path.suffix.casefold() not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue
            key = (source_path.name.casefold(), source_path.stat().st_size)
            if key in known_secondary_keys:
                skipped_duplicates += 1

    return entries, input_bytes, skipped_duplicates


def process_object_sheet(
    collage_path: Path,
    output_root: Path,
    refined_glasses_path: Path | None = None,
) -> tuple[list[dict[str, object]], int]:
    category = next(category for category in CATEGORIES if category.category_id == "object")
    sheet = ImageOps.exif_transpose(Image.open(collage_path)).convert("RGB")
    background = estimate_background(sheet)
    entries: list[dict[str, object]] = []
    object_output = output_root / category.output_folder
    if object_output.exists():
        shutil.rmtree(object_output)

    for index, (name, left, top, right, bottom) in enumerate(OBJECT_CROPS, start=1):
        if (
            name == "红框眼镜"
            and refined_glasses_path
            and refined_glasses_path.exists()
        ):
            crop = load_source_image(refined_glasses_path)
        else:
            crop = sheet.crop((left, top, right, bottom))
            crop = remove_connected_red_background(
                crop,
                background,
                preserve_red=any(
                    token in name
                    for token in (
                        "红色",
                        "红框",
                        "Fire",
                        "蝴蝶结",
                        "彩色",
                        "火柴盒",
                        "折叠",
                        "木质画框",
                    )
                ),
            )
            crop = remove_stray_components(crop)
        crop = resize_for_web(crop, category.max_side)
        output_path = (
            output_root
            / category.output_folder
            / f"{category.prefix}-{index:03d}.webp"
        )
        size = save_webp(crop, output_path, category.quality)
        entries.append(
            make_manifest_entry(
                asset_id=f"{category.prefix}-{index:03d}",
                name=name,
                category=category,
                output_path=output_path,
                output_root=output_root,
                size=size,
                source_name=name,
            )
        )
    return entries, collage_path.stat().st_size


def build_preview(entries: list[dict[str, object]], output_root: Path, preview_path: Path) -> None:
    selected: list[dict[str, object]] = []
    for category in CATEGORIES:
        selected.extend(
            [entry for entry in entries if entry["category"] == category.category_id][:24]
        )
    cell_width = 146
    cell_height = 132
    columns = 8
    rows = math.ceil(len(selected) / columns)
    preview = Image.new("RGB", (columns * cell_width, rows * cell_height), "#ded8c8")
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()

    for index, entry in enumerate(selected):
        row, column = divmod(index, columns)
        x = column * cell_width
        y = row * cell_height
        image_path = output_root.parent.parent / str(entry["image"])
        with Image.open(image_path) as source:
            thumb = source.convert("RGBA")
        thumb.thumbnail((cell_width - 20, cell_height - 32), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", (cell_width - 8, cell_height - 8), "#f2eee2")
        tile_x = (tile.width - thumb.width) // 2
        tile_y = max(4, (tile.height - 24 - thumb.height) // 2)
        tile.alpha_composite(thumb, (tile_x, tile_y))
        preview.paste(tile.convert("RGB"), (x + 4, y + 4))
        label = f"{entry['id']} · {entry['category']}"
        draw.text((x + 8, y + cell_height - 22), label, fill="#171612", font=font)

    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path, "JPEG", quality=82, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Pinewood web material library.")
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--secondary-root", type=Path)
    parser.add_argument("--collage", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/assets/material-library"),
    )
    parser.add_argument(
        "--preview",
        type=Path,
        default=Path("output/material-library-preview.jpg"),
    )
    parser.add_argument(
        "--objects-only",
        action="store_true",
        help="Rebuild only the objects split from the supplied collage sheet.",
    )
    args = parser.parse_args()

    output_root = args.output.resolve()
    existing_manifest_path = output_root / "manifest.json"
    if args.objects_only:
        if not existing_manifest_path.exists():
            raise FileNotFoundError("Run a full build before --objects-only.")
        existing_manifest = json.loads(existing_manifest_path.read_text(encoding="utf-8"))
        source_entries = [
            entry
            for entry in existing_manifest.get("assets", [])
            if entry.get("category") != "object"
        ]
        old_total_input = int(existing_manifest.get("stats", {}).get("sourceInputBytes", 0))
        source_input_bytes = max(0, old_total_input - args.collage.stat().st_size)
        skipped_duplicates = int(existing_manifest.get("stats", {}).get("skippedDuplicateFiles", 0))
    else:
        if output_root.exists():
            shutil.rmtree(output_root)
        output_root.mkdir(parents=True, exist_ok=True)
        source_entries, source_input_bytes, skipped_duplicates = process_source_categories(
            args.source_root.resolve(),
            args.secondary_root.resolve() if args.secondary_root else None,
            output_root,
        )
    object_entries, collage_input_bytes = process_object_sheet(
        args.collage.resolve(),
        output_root,
        Path(__file__).resolve().parent
        / "material-sources"
        / "red-wire-glasses.png",
    )
    entries = source_entries + object_entries

    output_bytes = sum(
        path.stat().st_size for path in output_root.rglob("*.webp")
    )
    category_counts = {
        category.category_id: sum(
            1 for entry in entries if entry["category"] == category.category_id
        )
        for category in CATEGORIES
    }
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(UTC).isoformat(),
        "categories": [
            {
                "id": category.category_id,
                "label": category.label,
                "description": category.description,
                "count": category_counts[category.category_id],
            }
            for category in CATEGORIES
        ],
        "assets": entries,
        "stats": {
            "assetCount": len(entries),
            "sourceInputBytes": source_input_bytes + collage_input_bytes,
            "outputBytes": output_bytes,
            "skippedDuplicateFiles": skipped_duplicates,
            "ignoredFiles": ["PSD source files"],
        },
    }
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    build_preview(entries, output_root, args.preview.resolve())

    ratio = (output_bytes / max(1, source_input_bytes + collage_input_bytes)) * 100
    print(
        json.dumps(
            {
                "assets": len(entries),
                "categories": category_counts,
                "inputBytes": source_input_bytes + collage_input_bytes,
                "outputBytes": output_bytes,
                "outputPercent": round(ratio, 2),
                "skippedDuplicates": skipped_duplicates,
                "manifest": str(output_root / "manifest.json"),
                "preview": str(args.preview.resolve()),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
