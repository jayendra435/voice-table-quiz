#!/usr/bin/env python3
"""One-time, resumable raw extraction for downloaded SSC CGL PDFs.

This deliberately preserves page text and provenance. Question segmentation and
topic/answer work happen later from these JSON checkpoints, not from the PDFs.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import pymupdf


APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"C:\Users\Jay\Desktop\adda247_ssc_cgl_pdf_downloader\pdfs\tier1\2025")
DEFAULT_DOWNLOAD_LOG = Path(r"C:\Users\Jay\Desktop\adda247_ssc_cgl_pdf_downloader\download_log.csv")
RAW_ROOT = APP_ROOT / "content" / "ssc_cgl" / "raw" / "tier1" / "2025"
MANIFEST_PATH = APP_ROOT / "content" / "ssc_cgl" / "manifests" / "tier1_2025.json"
RUN_LOG_PATH = APP_ROOT / "content" / "ssc_cgl" / "logs" / "raw_extraction.jsonl"
EXTRACTION_VERSION = 2


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1_048_576), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repair_mojibake(text: str) -> str:
    """Fix common UTF-8-as-Windows-1252 PDF text without touching normal text."""
    if not any(marker in text for marker in ("â€", "â€“", "â€”", "Â")):
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except UnicodeError:
        return text


def metadata_from_name(path: Path) -> dict[str, str]:
    # Expected form: 2025-09-12_S1_English.pdf
    date, shift, language = path.stem.split("_", maxsplit=2)
    return {
        "id": f"ssc-cgl-tier1-{date}-{shift.lower()}-english",
        "exam": "SSC CGL",
        "tier": "tier1",
        "examYear": date[:4],
        "examDate": date,
        "shift": shift,
        "language": language,
    }


def source_urls(log_path: Path) -> dict[str, str]:
    if not log_path.exists():
        return {}
    with log_path.open(newline="", encoding="utf-8") as handle:
        return {
            row["filename"]: row["source_url"]
            for row in csv.DictReader(handle)
            if row.get("status") == "downloaded" and row.get("filename")
        }


def read_existing_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {"schemaVersion": 1, "batch": "ssc-cgl-tier1-2025", "documents": []}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def atomic_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def append_log(event: dict) -> None:
    RUN_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with RUN_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")


def extract(pdf_path: Path, source_url: str) -> dict:
    identity = metadata_from_name(pdf_path)
    file_hash = sha256(pdf_path)
    document = pymupdf.open(pdf_path)
    pages = []
    total_characters = 0
    total_images = 0
    for page_number, page in enumerate(document, start=1):
        text = repair_mojibake(page.get_text("text", sort=True)).replace("\r\n", "\n")
        image_count = len(page.get_images(full=True))
        total_characters += len(text)
        total_images += image_count
        pages.append({
            "page": page_number,
            "text": text,
            "characterCount": len(text),
            "wordCount": len(text.split()),
            "imageCount": image_count,
            "textExtractionStatus": "ok" if text.strip() else "empty",
        })
    document.close()
    return {
        "schemaVersion": 1,
        "extractionVersion": EXTRACTION_VERSION,
        "extractedAt": datetime.now(UTC).isoformat(),
        "document": {
            **identity,
            "originalFilename": pdf_path.name,
            "sourceUrl": source_url,
            "fileSizeBytes": pdf_path.stat().st_size,
            "sha256": file_hash,
            "pageCount": len(pages),
            "totalCharacterCount": total_characters,
            "totalImageCount": total_images,
            "extractionStatus": "complete" if all(page["textExtractionStatus"] == "ok" for page in pages) else "complete_with_ocr_needed",
        },
        "pages": pages,
    }


def main(args: argparse.Namespace) -> int:
    source_dir = args.source.resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")
    pdfs = sorted(source_dir.glob("*.pdf"))
    if args.max_files is not None:
        pdfs = pdfs[: args.max_files]
    urls = source_urls(args.download_log)
    manifest = read_existing_manifest()
    by_id = {entry["id"]: entry for entry in manifest["documents"]}

    for pdf_path in pdfs:
        identity = metadata_from_name(pdf_path)
        output_path = RAW_ROOT / f"{identity['id']}.json"
        current_hash = sha256(pdf_path)
        if output_path.exists():
            prior = json.loads(output_path.read_text(encoding="utf-8"))
            if prior["document"].get("sha256") == current_hash and prior.get("extractionVersion") == EXTRACTION_VERSION and not args.force:
                print(f"SKIP {pdf_path.name}")
                continue
        if args.dry_run:
            print(f"DRY RUN {pdf_path.name} -> {output_path.name}")
            continue
        record = extract(pdf_path, urls.get(pdf_path.name, ""))
        atomic_json(output_path, record)
        summary = {
            **record["document"],
            "rawPath": output_path.relative_to(APP_ROOT).as_posix(),
        }
        by_id[summary["id"]] = summary
        manifest["documents"] = sorted(by_id.values(), key=lambda item: (item["examDate"], item["shift"]))
        manifest["updatedAt"] = datetime.now(UTC).isoformat()
        atomic_json(MANIFEST_PATH, manifest)
        append_log({
            "at": datetime.now(UTC).isoformat(),
            "event": "raw_extraction_complete",
            "id": summary["id"],
            "filename": pdf_path.name,
            "pageCount": summary["pageCount"],
            "characterCount": summary["totalCharacterCount"],
            "status": summary["extractionStatus"],
        })
        print(f"EXTRACTED {pdf_path.name}: {summary['pageCount']} pages, {summary['totalCharacterCount']:,} characters")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Extract raw, resumable SSC CGL PDF records.")
    result.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    result.add_argument("--download-log", type=Path, default=DEFAULT_DOWNLOAD_LOG)
    result.add_argument("--max-files", type=int, help="Process only the first N PDFs for a controlled batch.")
    result.add_argument("--dry-run", action="store_true")
    result.add_argument("--force", action="store_true", help="Regenerate checkpoints even when the PDF hash is unchanged.")
    return result


if __name__ == "__main__":
    raise SystemExit(main(parser().parse_args()))
