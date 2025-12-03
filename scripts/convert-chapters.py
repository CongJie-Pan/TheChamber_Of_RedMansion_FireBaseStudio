#!/usr/bin/env python3
"""
Convert Red Mansion chapter text files to JSON format.

Usage:
    python scripts/convert-chapters.py

This script reads .txt files from docs/SoucreText/txt/ and converts them
to JSON files in src/data/chapters/.
"""

import json
import os
import re
from pathlib import Path

# Configuration
SOURCE_DIR = Path("docs/SoucreText/txt")
OUTPUT_DIR = Path("src/data/chapters")

def parse_chapter_title(first_line: str) -> tuple[int, str]:
    """
    Parse chapter number and title from the first line.

    Example: "第一回 甄士隱夢幻識通靈 賈雨村風塵懷閨秀"
    Returns: (1, "甄士隱夢幻識通靈 賈雨村風塵懷閨秀")
    """
    # Chinese number mapping
    chinese_nums = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
        '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25,
        '百': 100, '零': 0
    }

    # Try to extract chapter number from title
    match = re.match(r'第([一二三四五六七八九十百零]+)回\s*(.+)', first_line.strip())
    if match:
        chinese_num = match.group(1)
        title_text = match.group(2).strip()

        # Convert Chinese number to Arabic
        if chinese_num in chinese_nums:
            chapter_num = chinese_nums[chinese_num]
        elif chinese_num.startswith('二十'):
            if len(chinese_num) == 2:
                chapter_num = 20
            else:
                chapter_num = 20 + chinese_nums.get(chinese_num[2:], 0)
        elif chinese_num.startswith('十'):
            if len(chinese_num) == 1:
                chapter_num = 10
            else:
                chapter_num = 10 + chinese_nums.get(chinese_num[1:], 0)
        else:
            # Fallback: try to parse complex numbers
            chapter_num = 0
            for char in chinese_num:
                if char in chinese_nums:
                    chapter_num += chinese_nums[char]

        return chapter_num, title_text

    return 0, first_line.strip()

def parse_txt_file(file_path: Path) -> dict:
    """
    Parse a chapter text file and return structured data.

    Returns:
    {
        "id": 1,
        "title": "第一回 甄士隱夢幻識通靈 賈雨村風塵懷閨秀",
        "titleText": "甄士隱夢幻識通靈 賈雨村風塵懷閨秀",
        "paragraphs": [
            { "content": ["paragraph text..."] }
        ]
    }
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by double newlines to get paragraphs
    lines = content.strip().split('\n')

    # First line is the chapter title
    first_line = lines[0].strip()
    chapter_num, title_text = parse_chapter_title(first_line)

    # If chapter number couldn't be parsed from title, use filename
    if chapter_num == 0:
        # Extract number from filename (e.g., "1.txt" -> 1)
        chapter_num = int(file_path.stem)

    # Parse paragraphs (skip empty lines, group consecutive non-empty lines)
    paragraphs = []
    current_paragraph = []

    for line in lines[1:]:  # Skip first line (title)
        stripped = line.strip()
        if stripped:
            current_paragraph.append(stripped)
        elif current_paragraph:
            # Join lines and add as paragraph
            para_text = ''.join(current_paragraph)
            paragraphs.append({"content": [para_text]})
            current_paragraph = []

    # Don't forget the last paragraph
    if current_paragraph:
        para_text = ''.join(current_paragraph)
        paragraphs.append({"content": [para_text]})

    return {
        "id": chapter_num,
        "title": first_line,
        "titleText": title_text,
        "paragraphs": paragraphs
    }

def main():
    """Main conversion function."""
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Find all txt files
    txt_files = sorted(SOURCE_DIR.glob("*.txt"), key=lambda p: int(p.stem) if p.stem.isdigit() else 0)

    if not txt_files:
        print(f"No .txt files found in {SOURCE_DIR}")
        return

    print(f"Found {len(txt_files)} chapter files")

    # Process each file
    for txt_file in txt_files:
        print(f"Processing: {txt_file.name}")

        try:
            chapter_data = parse_txt_file(txt_file)
            chapter_num = chapter_data["id"]

            # Write JSON file with zero-padded filename
            output_file = OUTPUT_DIR / f"chapter-{chapter_num:03d}.json"

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(chapter_data, f, ensure_ascii=False, indent=2)

            print(f"  -> Created: {output_file.name} (Chapter {chapter_num}: {chapter_data['titleText'][:20]}...)")

        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\nDone! JSON files saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
