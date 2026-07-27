import json
import re
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOC_DIR = ROOT / "public" / "documents" / "learning-library" / "files"
OUT_DIR = ROOT / "public" / "data" / "topics"
DOCS_DIR = ROOT / "docs"

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


TOPICS = {
    1: ("Vị trí địa lí và phạm vi lãnh thổ", "C1", [(2, 25)], "Mục 1.1-1.2"),
    2: ("Ảnh hưởng của vị trí địa lí và phạm vi lãnh thổ", "C1", [(26, 32)], "Mục 1.3"),
    3: ("Đặc điểm địa hình Việt Nam", "C1", [(33, 50)], "Mục 2.1"),
    4: ("Các khu vực địa hình", "C1", [(51, 84)], "Mục 2.2"),
    5: ("Đặc điểm khoáng sản Việt Nam", "C1", [(107, 115)], "Mục 3.1"),
    6: ("Phân bố và sử dụng khoáng sản", "C1", [(116, 133)], "Mục 3.2-3.3"),
    7: ("Phân hoá địa hình và tự nhiên", "C1", [(85, 106)], "Mục 2.3"),
    8: ("Khí hậu nhiệt đới ẩm gió mùa", "C2", [(1, 24)], "Mục 1.1"),
    9: ("Lưu vực sông và hệ thống sông lớn", "C2", [(35, 41)], "Mục 2.1.a"),
    10: ("Phân hoá khí hậu Việt Nam", "C2", [(25, 34)], "Mục 1.2"),
    11: ("Tác động biến đổi khí hậu tới khí hậu và thuỷ văn", "C2", [(97, 104)], "Mục 4.1-4.2"),
    12: ("Khí hậu và nông nghiệp", "C2", [(78, 86)], "Mục 3.1"),
    13: ("Phân tích một hệ thống sông", "C2", [(42, 63)], "Mục 2.1.b"),
    14: ("Hồ, đầm và nước ngầm", "C2", [(64, 77)], "Mục 2.2-2.3"),
    15: ("Đọc biểu đồ khí hậu và trạm khí tượng thuỷ văn", "C2", [(1, 34), (35, 41)], "Mục 1.1-1.2 và 2.1.a"),
    16: ("Vẽ và phân tích biểu đồ khí hậu", "C2", [(1, 34)], "Mục 1.1-1.2"),
    17: ("Vai trò khí hậu đối với du lịch", "C2", [(87, 91)], "Mục 3.2"),
    18: ("Ứng phó với biến đổi khí hậu", "C2", [(105, 116)], "Mục 4.3"),
    19: ("Khai thác tổng hợp tài nguyên nước", "C2", [(92, 96)], "Mục 3.3"),
    20: ("Tác động biến đổi khí hậu tới tự nhiên", "C2", [(97, 104)], "Mục 4.1-4.2"),
    21: ("Ba nhóm đất chính", "C3", [(13, 34)], "Mục 1.2"),
    22: ("Tính chất nhiệt đới gió mùa của thổ nhưỡng", "C3", [(1, 12)], "Mục 1.1"),
    23: ("Đất feralit và giá trị sử dụng", "C3", [(14, 22)], "Mục 1.2.a"),
    24: ("Đất phù sa và giá trị sử dụng", "C3", [(23, 34)], "Mục 1.2.b-c"),
    25: ("Sự đa dạng sinh vật Việt Nam", "C3", [(43, 50)], "Mục 2.1"),
    26: ("Chống thoái hoá đất", "C3", [(35, 42)], "Mục 1.3"),
    27: ("Bảo tồn đa dạng sinh học", "C3", [(51, 64)], "Mục 2.2"),
    28: ("Phạm vi Biển Đông và vùng biển Việt Nam", "C4", [(1, 14)], "Mục 1.1-1.2"),
    29: ("Đặc điểm tự nhiên vùng biển đảo", "C4", [(15, 28)], "Mục 1.3"),
    30: ("Tài nguyên biển và thềm lục địa", "C4", [(45, 58)], "Mục 2.2"),
    31: ("Môi trường biển đảo Việt Nam", "C4", [(29, 44)], "Mục 2.1"),
    32: ("Luật biển và các vùng biển Việt Nam", "C4", [(6, 14)], "Mục 1.2"),
    33: ("Thuận lợi, khó khăn kinh tế biển và bảo vệ chủ quyền", "C4", [(36, 44), (45, 58)], "Mục 2.1.b và 2.2"),
}

TOPIC_META = {
    1: ("Vị trí địa lí và phạm vi lãnh thổ", "Vị trí - lãnh thổ", "Vị trí địa lí và lãnh thổ"),
    2: ("Ảnh hưởng của vị trí địa lí", "Ảnh hưởng vị trí", "Vị trí địa lí và lãnh thổ"),
    3: ("Đặc điểm địa hình Việt Nam", "Địa hình VN", "Địa hình và khoáng sản"),
    4: ("Các khu vực địa hình", "Khu vực địa hình", "Địa hình và khoáng sản"),
    5: ("Đặc điểm khoáng sản Việt Nam", "Khoáng sản VN", "Địa hình và khoáng sản"),
    6: ("Phân bố và sử dụng khoáng sản", "Sử dụng khoáng sản", "Địa hình và khoáng sản"),
    7: ("Phân hoá địa hình và tự nhiên", "Phân hoá địa hình", "Địa hình và khoáng sản"),
    8: ("Khí hậu nhiệt đới ẩm gió mùa", "Khí hậu gió mùa", "Khí hậu và thuỷ văn"),
    9: ("Lưu vực sông và hệ thống sông lớn", "Hệ thống sông", "Khí hậu và thuỷ văn"),
    10: ("Phân hoá khí hậu Việt Nam", "Phân hoá khí hậu", "Khí hậu và thuỷ văn"),
    11: ("Tác động biến đổi khí hậu tới khí hậu và thuỷ văn", "Tác động BĐKH", "Khí hậu và thuỷ văn"),
    12: ("Khí hậu và nông nghiệp", "Khí hậu - nông nghiệp", "Khí hậu và thuỷ văn"),
    13: ("Phân tích một hệ thống sông", "Phân tích sông", "Khí hậu và thuỷ văn"),
    14: ("Hồ, đầm và nước ngầm", "Hồ đầm - nước ngầm", "Khí hậu và thuỷ văn"),
    15: ("Đọc biểu đồ khí hậu", "Đọc biểu đồ", "Khí hậu và thuỷ văn"),
    16: ("Vẽ và phân tích biểu đồ khí hậu", "Vẽ biểu đồ", "Khí hậu và thuỷ văn"),
    17: ("Vai trò khí hậu đối với du lịch", "Khí hậu - du lịch", "Khí hậu và thuỷ văn"),
    18: ("Ứng phó với biến đổi khí hậu", "Ứng phó BĐKH", "Khí hậu và thuỷ văn"),
    19: ("Khai thác tổng hợp tài nguyên nước", "Tài nguyên nước", "Khí hậu và thuỷ văn"),
    20: ("Tác động biến đổi khí hậu tới tự nhiên", "BĐKH và tự nhiên", "Khí hậu và thuỷ văn"),
    21: ("Ba nhóm đất chính", "Ba nhóm đất", "Thổ nhưỡng và sinh vật"),
    22: ("Tính chất nhiệt đới gió mùa của thổ nhưỡng", "Thổ nhưỡng gió mùa", "Thổ nhưỡng và sinh vật"),
    23: ("Đất feralit và giá trị sử dụng", "Đất feralit", "Thổ nhưỡng và sinh vật"),
    24: ("Đất phù sa và giá trị sử dụng", "Đất phù sa", "Thổ nhưỡng và sinh vật"),
    25: ("Sự đa dạng sinh vật Việt Nam", "Đa dạng sinh vật", "Thổ nhưỡng và sinh vật"),
    26: ("Chống thoái hoá đất", "Chống thoái hoá đất", "Thổ nhưỡng và sinh vật"),
    27: ("Bảo tồn đa dạng sinh học", "Bảo tồn sinh học", "Thổ nhưỡng và sinh vật"),
    28: ("Phạm vi Biển Đông và vùng biển Việt Nam", "Phạm vi biển", "Biển đảo Việt Nam"),
    29: ("Đặc điểm tự nhiên vùng biển đảo", "Tự nhiên biển đảo", "Biển đảo Việt Nam"),
    30: ("Tài nguyên biển và thềm lục địa", "Tài nguyên biển", "Biển đảo Việt Nam"),
    31: ("Môi trường biển đảo Việt Nam", "Môi trường biển", "Biển đảo Việt Nam"),
    32: ("Luật biển và các vùng biển Việt Nam", "Luật biển", "Biển đảo Việt Nam"),
    33: ("Thuận lợi, khó khăn kinh tế biển và bảo vệ chủ quyền", "Kinh tế biển", "Biển đảo Việt Nam"),
}

ESSAY_TOPIC_MAP = {
    "C1": {
        1: [1, 2],
        2: [2, 8, 10],
        3: [2, 29],
        4: [1, 2],
        5: [5],
        7: [6],
        8: [5],
    },
    "C2": {
        1: [10],
        2: [10, 15, 16],
        3: [9, 13],
        4: [9, 13],
        5: [14, 19],
        6: [14, 19],
        7: [17],
        8: [17, 16],
    },
    "C3": {
        1: [21, 23, 24],
        2: [22, 23],
        3: [22],
        4: [24],
        5: [25],
        6: [27],
    },
    "C4": {
        1: [28, 32],
        2: [32],
        3: [30, 33],
        4: [31],
        5: [31, 33],
        6: [31],
        7: [29],
        8: [29],
    },
}

OLD_APP_IMAGE_BASE = "/hsg8-infographics/topic-original"
OLD_APP_IMAGE_SOURCE = "https://raw.githubusercontent.com/duanaithcs-cloud/anh-infographic-33-bubbles/main"

TOPIC_IMAGES = {
    13: [
        {
            "url": "/hsg8-infographics/bieu-do-luu-luong-song-dia8.png",
            "caption": "Tư liệu vẽ và nhận xét biểu đồ lưu lượng dòng chảy sông ngòi Địa lí 8",
            "width": 1660,
            "height": 2238,
        }
    ],
    15: [
        {
            "url": "/hsg8-infographics/bieu-do-luu-luong-song-dia8.png",
            "caption": "Tư liệu đọc và nhận xét biểu đồ lưu lượng dòng chảy theo tháng",
            "width": 1660,
            "height": 2238,
        }
    ],
    16: [
        {
            "url": "/hsg8-infographics/bieu-do-luu-luong-song-dia8.png",
            "caption": "Mẫu trình bày biểu đồ đường và nhận xét số liệu thuỷ văn",
            "width": 1660,
            "height": 2238,
        }
    ],
    19: [
        {
            "url": "/hsg8-infographics/bieu-do-luu-luong-song-dia8.png",
            "caption": "Bài luyện khai thác số liệu tài nguyên nước và chế độ dòng chảy",
            "width": 1660,
            "height": 2238,
        }
    ],
}


def clean_text(text: str) -> str:
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", text).strip())


def doc_key(path: Path) -> str:
    name = path.name.upper()
    match = re.search(r"C([1-4])", name)
    if not match:
        raise ValueError(f"Cannot detect C key from {path.name}")
    return f"C{match.group(1)}"


def extract_all_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))

    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS))
        if text.strip():
            paragraphs.append(clean_text(text))
    return paragraphs


def extract_part_a(path: Path) -> list[str]:
    paragraphs = extract_all_paragraphs(path)
    stop = next((idx for idx, line in enumerate(paragraphs) if line.startswith("B. ")), len(paragraphs))
    return paragraphs[:stop]


def parse_essay_items(key: str, path: Path) -> list[dict]:
    paragraphs = extract_all_paragraphs(path)
    start = next((idx for idx, line in enumerate(paragraphs) if "Tự luận" in line), None)
    if start is None:
        raise SystemExit(f"Cannot find essay section in {path.name}")

    items: list[dict] = []
    current: dict | None = None
    mode = "question"

    for line in paragraphs[start + 1 :]:
        question_match = re.match(r"^Câu\s+(\d+)[\.:]\s*(.*)", line, re.I)
        if question_match:
            if current:
                items.append(finalize_essay_item(key, current))
            current = {
                "source_no": int(question_match.group(1)),
                "question_lines": [question_match.group(2).strip()],
                "guide_lines": [],
            }
            mode = "question"
            continue

        if current is None:
            continue

        if line.startswith("✅ Đáp án"):
            mode = "guide"
            after_colon = line.split(":", 1)[1].strip() if ":" in line else ""
            if after_colon:
                current["guide_lines"].append(after_colon)
            continue

        if mode == "question":
            current["question_lines"].append(line)
        else:
            current["guide_lines"].append(line)

    if current:
        items.append(finalize_essay_item(key, current))
    return items


def finalize_essay_item(key: str, raw: dict) -> dict:
    source_no = raw["source_no"]
    question = "\n".join(line for line in raw["question_lines"] if line).strip()
    guide = "\n".join(line for line in raw["guide_lines"] if line).strip()
    return {
        "id": f"{key.lower()}-tu-luan-{source_no:02d}",
        "source_no": source_no,
        "question": question,
        "guide": guide,
        "source_section": f"{key} / Phần B. Tổng hợp câu hỏi ôn tập / Dạng tự luận",
    }


def distribute_essay_items(docs: dict[str, tuple[Path, list[str]]]) -> tuple[dict[int, list[dict]], list[dict]]:
    essay_by_topic: dict[int, list[dict]] = defaultdict(list)
    audit: list[dict] = []

    for key, (source_path, _) in docs.items():
        for item in parse_essay_items(key, source_path):
            topic_ids = ESSAY_TOPIC_MAP.get(key, {}).get(item["source_no"], [])
            if not topic_ids:
                raise SystemExit(f"No topic mapping for {item['id']}")
            for topic_id in topic_ids:
                essay_by_topic[topic_id].append(item)
            audit.append(
                {
                    "essay_id": item["id"],
                    "source_file": source_path.name,
                    "source_section": item["source_section"],
                    "source_no": item["source_no"],
                    "question": item["question"],
                    "guide_chars": len(item["guide"]),
                    "topic_ids": topic_ids,
                    "topic_labels": [TOPICS[topic_id][0] for topic_id in topic_ids],
                }
            )

    for topic_id in range(1, 34):
        essay_by_topic[topic_id].sort(key=lambda item: (item["id"], item["source_no"]))
    return essay_by_topic, audit


def is_heading(text: str) -> bool:
    return bool(
        re.match(r"^(CHỦ ĐỀ|[1-9](?:\.[0-9]+)*\.?\s|[a-z]\)\s|\*\s)", text)
        and not text.startswith(("-", "+"))
    )


def make_blocks(lines: list[str]) -> list[dict]:
    return [{"type": "heading" if is_heading(line) else "paragraph", "text": line} for line in lines]


def make_focus_points(lines: list[str]) -> list[str]:
    points = []
    for line in lines:
        if line.startswith(("CHỦ ĐỀ", "A. ")):
            continue
        if line and (line.startswith(("-", "+", "*")) or re.match(r"^[a-z]\)\s", line)):
            points.append(line)
    if not points:
        points = [line for line in lines if not is_heading(line)][:8]
    return points[:14]


def make_key_points(lines: list[str]) -> list[str]:
    selected = []
    for line in lines:
        if line.startswith(("CHỦ ĐỀ", "A. ")):
            continue
        if is_heading(line) or line.startswith(("-", "+", "*")):
            selected.append(line)
    return selected[:18]


def make_catalog_excerpt(resource: dict) -> str:
    points = resource.get("focus_points") or resource.get("key_points") or []
    return "; ".join(points[:3])


def update_data_ts(resources: dict[int, dict]) -> None:
    data_path = ROOT / "data.ts"
    text = data_path.read_text(encoding="utf-8")

    for topic_id, resource in resources.items():
        excerpt = json.dumps(make_catalog_excerpt(resource), ensure_ascii=False)
        pattern = re.compile(rf'(\{{ id: {topic_id},[\s\S]*? text: )"(?:\\.|[^"\\])*"(, icon:)', re.M)
        text, count = pattern.subn(rf"\1{excerpt}\2", text, count=1)
        if count != 1:
            raise SystemExit(f"Cannot update TOPIC_CATALOG text for topic {topic_id}")

    meta_lines = ["const LOCALIZED_TOPIC_META: Record<number, { label: string; short: string; group: string }> = {"]
    for topic_id in range(1, 34):
        label, short, group = TOPIC_META[topic_id]
        meta_lines.append(
            f"  {topic_id}: {{ label: {json.dumps(label, ensure_ascii=False)}, short: {json.dumps(short, ensure_ascii=False)}, group: {json.dumps(group, ensure_ascii=False)} }},"
        )
    meta_lines.append("};")
    replacement = "\n".join(meta_lines)
    text, count = re.subn(
        r"const LOCALIZED_TOPIC_META: Record<number, \{ label: string; short: string; group: string \}> = \{[\s\S]*?\n\};",
        replacement,
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit("Cannot update LOCALIZED_TOPIC_META block")
    data_path.write_text(text, encoding="utf-8")


def collect_lines(source_lines: list[str], ranges: list[tuple[int, int]]) -> list[str]:
    collected: list[str] = []
    for start, end in ranges:
        collected.extend(source_lines[start : end + 1])
    return collected


def topic_images(topic_id: int) -> list[dict]:
    title = TOPIC_META[topic_id][0]
    images = [
        {
            "url": f"{OLD_APP_IMAGE_BASE}/{topic_id:02d}.jpg",
            "caption": f"Infographic chuyên đề {topic_id:02d} từ app Dia8Dragon cũ - {title}",
            "width": 1376,
            "height": 768,
            "source": f"{OLD_APP_IMAGE_SOURCE}/{topic_id}.png",
        }
    ]
    images.extend(dict(image) for image in TOPIC_IMAGES.get(topic_id, []))
    return images


def main() -> None:
    docs = {doc_key(path): (path, extract_part_a(path)) for path in DOC_DIR.glob("LOP_8_C*.docx")}
    if set(docs) != {"C1", "C2", "C3", "C4"}:
        raise SystemExit(f"Expected C1-C4 documents, found: {sorted(docs)}")

    essay_by_topic, essay_audit = distribute_essay_items(docs)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"schema": "dia8dragon-topic-manifest.v2", "topics": []}
    audit = []
    resources: dict[int, dict] = {}

    for topic_id in range(1, 34):
        label, key, ranges, scope_label = TOPICS[topic_id]
        source_path, source_lines = docs[key]
        lines = collect_lines(source_lines, ranges)
        if not lines:
            raise SystemExit(f"Topic {topic_id} has no lines")

        source_scope = f"{key} / Phần A. Tổng hợp kiến thức cần nhớ / {scope_label}"
        full_text = "\n".join(lines)
        essays = essay_by_topic.get(topic_id, [])
        images = topic_images(topic_id)
        resource = {
            "topic_id": topic_id,
            "label": label,
            "source_file": source_path.name,
            "source_readable": True,
            "source_scope": source_scope,
            "source_ranges": [f"{start}-{end}" for start, end in ranges],
            "blocks": make_blocks(lines),
            "key_points": make_key_points(lines),
            "focus_points": make_focus_points(lines),
            "focus_source_section": source_scope,
            "essay_items": essays,
            "full_text": full_text,
            "summary": f"Nội dung trọng tâm được trích nguyên văn từ {source_scope}, bám đúng bong bóng: {label}.",
            "images": images,
            "stats": {
                "chars": len(full_text),
                "blocks": len(lines),
                "images": len(images),
                "essay_items": len(essays),
            },
        }
        resources[topic_id] = resource
        out_path = OUT_DIR / f"topic-{topic_id:02d}.json"
        out_path.write_text(json.dumps(resource, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest["topics"].append(
            {
                "topic_id": topic_id,
                "label": label,
                "path": f"/data/topics/topic-{topic_id:02d}.json",
                "source_file": source_path.name,
                "source_scope": source_scope,
                "essay_items": len(essays),
                "images": len(images),
            }
        )
        audit.append(
            {
                "topic_id": topic_id,
                "label": label,
                "source_scope": source_scope,
                "blocks": len(lines),
                "chars": len(full_text),
                "essay_items": len(essays),
                "images": len(images),
            }
        )

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DOCS_DIR / "DIA8_TOPIC_RESOURCE_AUDIT_C1_C4.json").write_text(
        json.dumps({"schema": "dia8dragon-topic-resource-audit.v2", "topics": audit}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (DOCS_DIR / "DIA8_ESSAY_AUDIT_C1_C4.json").write_text(
        json.dumps({"schema": "dia8dragon-essay-audit.v1", "essays": essay_audit}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    update_data_ts(resources)
    print(
        json.dumps(
            {
                "ok": True,
                "topics": len(audit),
                "essay_source_items": len(essay_audit),
                "topic_essay_links": sum(len(items) for items in essay_by_topic.values()),
                "topics_with_essays": sum(1 for items in essay_by_topic.values() if items),
                "images_total": sum(item["images"] for item in audit),
                "data_ts": "updated",
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
