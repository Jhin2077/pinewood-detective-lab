from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass(frozen=True)
class ImportCategory:
    category_id: str
    label: str
    description: str
    source_folder: str
    output_folder: str
    prefix: str
    max_side: int
    quality: int


CATEGORIES = (
    ImportCategory(
        category_id="ransom-letter",
        label="剪报字母",
        description="A–Z 的复古杂志剪字与匿名信字母",
        source_folder="字母PNG",
        output_folder="ransom-letters",
        prefix="letter",
        max_side=560,
        quality=78,
    ),
    ImportCategory(
        category_id="ransom-number",
        label="剪报数字",
        description="0–9 的复古杂志剪字与档案编号",
        source_folder="数字PNG",
        output_folder="ransom-numbers",
        prefix="number",
        max_side=560,
        quality=78,
    ),
    ImportCategory(
        category_id="ransom-symbol",
        label="剪报符号",
        description="标点、箭头、连接词与匿名信装饰符号",
        source_folder="数字PNG/符号",
        output_folder="ransom-symbols",
        prefix="symbol",
        max_side=560,
        quality=78,
    ),
    ImportCategory(
        category_id="ransom-background",
        label="剪报背景",
        description="适合匿名信、档案页和拼贴排版的纸张纹理",
        source_folder="背景",
        output_folder="ransom-backgrounds",
        prefix="ransom-bg",
        max_side=1400,
        quality=68,
    ),
)

SYMBOL_LABELS = {
    "and": "连接词 AND",
    "arrows": "箭头",
    "asterisk": "星号",
    "at": "@ 符号",
    "colon": "冒号",
    "comma": "逗号",
    "dash": "短横线",
    "esclamation": "感叹号",
    "exclamation": "感叹号",
    "hashtag": "井号",
    "new": "文字 NEW",
    "parenthesis": "括号",
    "percent": "百分号",
    "plus": "加号",
    "point": "句点",
    "question": "问号",
    "quotation": "引号",
    "semicolon": "分号",
    "the": "文字 THE",
}


def natural_key(path: Path) -> list[object]:
    return [
        int(chunk) if chunk.isdigit() else chunk.casefold()
        for chunk in re.split(r"(\d+)", path.name)
    ]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def trim_alpha(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        return image
    box = image.getchannel("A").getbbox()
    return image.crop(box) if box else image


def load_image(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.seek(0)
        image = ImageOps.exif_transpose(source).copy()
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")
    return trim_alpha(image)


def resize_for_web(image: Image.Image, max_side: int) -> Image.Image:
    if max(image.size) <= max_side:
        return image
    scale = max_side / max(image.size)
    size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    return image.resize(size, Image.Resampling.LANCZOS)


def save_webp(
    image: Image.Image,
    destination: Path,
    quality: int,
) -> tuple[int, int]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if "A" in image.getbands() and image.getchannel("A").getextrema()[0] < 255:
        image = image.convert("RGBA")
        image.save(
            destination,
            "WEBP",
            quality=quality,
            alpha_quality=86,
            method=6,
            exact=False,
        )
    else:
        image = image.convert("RGB")
        image.save(destination, "WEBP", quality=quality, method=6)
    return image.size


def variant_number(path: Path) -> int:
    match = re.search(r"(\d+)(?:\(\d+\))?$", path.stem)
    return int(match.group(1)) if match else 1


def symbol_parts(path: Path) -> tuple[str, str]:
    match = re.match(r"(.+?)\s+(\d+)$", path.stem)
    source_key = match.group(1).strip() if match else path.stem.strip()
    variant = int(match.group(2)) if match else 1
    normalized = re.sub(r"[^a-z0-9]+", "-", source_key.casefold()).strip("-")
    if normalized == "esclamation":
        slug = "exclamation"
    else:
        slug = normalized
    label = SYMBOL_LABELS.get(source_key.casefold(), source_key)
    return f"{slug}-{variant:02d}", f"{label} · {variant:02d}"


def entry_for(
    *,
    asset_id: str,
    name: str,
    category: ImportCategory,
    output_path: Path,
    public_root: Path,
    size: tuple[int, int],
    source_path: Path,
) -> dict[str, object]:
    width, height = size
    return {
        "id": asset_id,
        "name": name,
        "category": category.category_id,
        "image": output_path.relative_to(public_root).as_posix(),
        "aspectRatio": round(width / max(1, height), 5),
        "width": width,
        "height": height,
        "keywords": [
            category.label,
            name,
            source_path.stem,
            source_path.parent.name,
            "字母拼贴",
            "匿名信",
            "剪报",
        ],
    }


def source_files_for(category: ImportCategory, source_root: Path) -> list[Path]:
    folder = source_root / Path(category.source_folder)
    if not folder.exists():
        raise FileNotFoundError(f"素材子目录不存在：{folder}")
    if category.category_id == "ransom-number":
        return sorted(
            (
                path
                for child in folder.iterdir()
                if child.is_dir() and child.name.isdigit()
                for path in child.iterdir()
                if path.is_file() and path.suffix.casefold() in IMAGE_SUFFIXES
            ),
            key=lambda path: (int(path.parent.name), natural_key(path)),
        )
    return sorted(
        (
            path
            for path in folder.rglob("*")
            if path.is_file() and path.suffix.casefold() in IMAGE_SUFFIXES
        ),
        key=lambda path: (path.parent.name.casefold(), natural_key(path)),
    )


def process_category(
    category: ImportCategory,
    source_root: Path,
    output_root: Path,
    public_root: Path,
    seen_hashes: set[str],
) -> tuple[list[dict[str, object]], int, int]:
    entries: list[dict[str, object]] = []
    input_bytes = 0
    skipped = 0
    output_folder = output_root / category.output_folder
    if output_folder.exists():
        shutil.rmtree(output_folder)
    output_folder.mkdir(parents=True, exist_ok=True)

    for path in source_files_for(category, source_root):
        digest = sha256(path)
        if digest in seen_hashes:
            skipped += 1
            continue
        seen_hashes.add(digest)
        input_bytes += path.stat().st_size

        variant = variant_number(path)
        if category.category_id == "ransom-letter":
            token = path.parent.name.upper()
            suffix = f"{token.casefold()}-{variant:02d}"
            name = f"剪报字母 {token} · {variant:02d}"
        elif category.category_id == "ransom-number":
            token = path.parent.name
            suffix = f"{token}-{variant:02d}"
            name = f"剪报数字 {token} · {variant:02d}"
        elif category.category_id == "ransom-symbol":
            suffix, name = symbol_parts(path)
        else:
            suffix = f"{variant:02d}"
            name = f"剪报纸张纹理 · {variant:02d}"

        asset_id = f"{category.prefix}-{suffix}"
        destination = output_folder / f"{asset_id}.webp"
        image = resize_for_web(load_image(path), category.max_side)
        size = save_webp(image, destination, category.quality)
        entries.append(
            entry_for(
                asset_id=asset_id,
                name=name,
                category=category,
                output_path=destination,
                public_root=public_root,
                size=size,
                source_path=path,
            )
        )
    return entries, input_bytes, skipped


def preview_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size=size)


def fit_preview(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    preview = image.copy()
    preview.thumbnail(box, Image.Resampling.LANCZOS)
    return preview


def build_preview(
    entries: list[dict[str, object]],
    public_root: Path,
    preview_path: Path,
) -> None:
    selected: list[dict[str, object]] = []
    for category in CATEGORIES:
        category_entries = [
            entry for entry in entries if entry["category"] == category.category_id
        ]
        if category.category_id == "ransom-letter":
            selected.extend(category_entries[::10])
        elif category.category_id == "ransom-number":
            selected.extend(category_entries[::10])
        elif category.category_id == "ransom-symbol":
            selected.extend(category_entries[:10])
        else:
            selected.extend(category_entries)

    columns = 7
    cell_width, cell_height = 190, 218
    header_height = 132
    rows = math.ceil(len(selected) / columns)
    width = columns * cell_width + 72
    height = header_height + rows * cell_height + 48
    preview = Image.new("RGB", (width, height), "#11110f")
    draw = ImageDraw.Draw(preview)
    draw.rectangle((20, 20, width - 20, height - 20), outline="#e8e0ce", width=3)
    draw.rectangle((30, 30, width - 30, height - 30), outline="#d6282f", width=2)
    draw.text(
        (54, 46),
        "字母拼贴素材 · 新增分类预览",
        font=preview_font(34, True),
        fill="#eee7d6",
    )
    draw.text(
        (54, 92),
        "RANSOM LETTER COLLAGE · 398 WEB ASSETS",
        font=preview_font(17),
        fill="#d6282f",
    )

    for index, entry in enumerate(selected):
        row, column = divmod(index, columns)
        x = 42 + column * cell_width
        y = header_height + row * cell_height
        draw.rounded_rectangle(
            (x, y, x + cell_width - 12, y + cell_height - 12),
            radius=6,
            fill="#1a1a16",
            outline="#555246",
            width=2,
        )
        image_box = (x + 10, y + 10, x + cell_width - 22, y + 160)
        draw.rectangle(image_box, fill="#eee7d6")
        source_path = public_root / str(entry["image"])
        with Image.open(source_path) as source:
            image = source.convert("RGBA")
        image = fit_preview(
            image,
            (image_box[2] - image_box[0] - 12, image_box[3] - image_box[1] - 12),
        )
        image_x = image_box[0] + (image_box[2] - image_box[0] - image.width) // 2
        image_y = image_box[1] + (image_box[3] - image_box[1] - image.height) // 2
        preview.paste(image, (image_x, image_y), image)
        draw.text(
            (x + 12, y + 172),
            str(entry["name"])[:18],
            font=preview_font(14, True),
            fill="#eee7d6",
        )
        draw.text(
            (x + 12, y + 194),
            str(entry["category"]).replace("ransom-", ""),
            font=preview_font(11),
            fill="#aaa493",
        )

    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import and compress ransom-letter collage assets."
    )
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/assets/material-library"),
    )
    parser.add_argument(
        "--preview",
        type=Path,
        default=Path("output/letter-collage-preview.jpg"),
    )
    args = parser.parse_args()

    source_root = args.source_root.resolve()
    output_root = args.output.resolve()
    public_root = output_root.parent.parent
    manifest_path = output_root / "manifest.json"
    if not source_root.exists():
        raise FileNotFoundError(f"素材文件夹不存在：{source_root}")
    if not manifest_path.exists():
        raise FileNotFoundError(f"素材清单不存在：{manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    imported_ids = {category.category_id for category in CATEGORIES}
    existing_entries = [
        entry
        for entry in manifest.get("assets", [])
        if entry.get("category") not in imported_ids
    ]
    existing_categories = [
        category
        for category in manifest.get("categories", [])
        if category.get("id") not in imported_ids
    ]

    seen_hashes: set[str] = set()
    imported_entries: list[dict[str, object]] = []
    imported_input_bytes = 0
    skipped_duplicates = 0
    for category in CATEGORIES:
        print(f"处理分类：{category.label}", flush=True)
        entries, input_bytes, skipped = process_category(
            category,
            source_root,
            output_root,
            public_root,
            seen_hashes,
        )
        imported_entries.extend(entries)
        imported_input_bytes += input_bytes
        skipped_duplicates += skipped
        print(
            f"  {len(entries)} 项，跳过重复 {skipped} 项",
            flush=True,
        )

    entries = existing_entries + imported_entries
    insertion_index = next(
        (
            index + 1
            for index, category in enumerate(existing_categories)
            if category.get("id") == "text"
        ),
        len(existing_categories),
    )
    imported_categories = [
        {
            "id": category.category_id,
            "label": category.label,
            "description": category.description,
            "count": sum(
                1
                for entry in imported_entries
                if entry["category"] == category.category_id
            ),
        }
        for category in CATEGORIES
    ]
    categories = (
        existing_categories[:insertion_index]
        + imported_categories
        + existing_categories[insertion_index:]
    )

    old_letter_input = int(
        manifest.get("stats", {}).get("letterCollageInputBytes", 0)
    )
    old_letter_skipped = int(
        manifest.get("stats", {}).get("letterCollageSkippedDuplicates", 0)
    )
    source_input_bytes = (
        int(manifest.get("stats", {}).get("sourceInputBytes", 0))
        - old_letter_input
        + imported_input_bytes
    )
    total_skipped = (
        int(manifest.get("stats", {}).get("skippedDuplicateFiles", 0))
        - old_letter_skipped
        + skipped_duplicates
    )
    output_bytes = sum(path.stat().st_size for path in output_root.rglob("*.webp"))

    manifest["generatedAt"] = datetime.now(UTC).isoformat()
    manifest["categories"] = categories
    manifest["assets"] = entries
    manifest["stats"] = {
        **manifest.get("stats", {}),
        "assetCount": len(entries),
        "sourceInputBytes": source_input_bytes,
        "outputBytes": output_bytes,
        "skippedDuplicateFiles": total_skipped,
        "letterCollageInputBytes": imported_input_bytes,
        "letterCollageSkippedDuplicates": skipped_duplicates,
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    build_preview(imported_entries, public_root, args.preview.resolve())

    print(
        json.dumps(
            {
                "importedAssets": len(imported_entries),
                "totalAssets": len(entries),
                "inputBytes": imported_input_bytes,
                "outputBytes": sum(
                    (
                        output_root / category.output_folder
                    ).stat().st_size
                    if (output_root / category.output_folder).is_file()
                    else sum(
                        path.stat().st_size
                        for path in (output_root / category.output_folder).glob("*.webp")
                    )
                    for category in CATEGORIES
                ),
                "skippedDuplicates": skipped_duplicates,
                "manifest": str(manifest_path),
                "preview": str(args.preview.resolve()),
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
