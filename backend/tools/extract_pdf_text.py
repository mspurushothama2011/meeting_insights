import sys
from pathlib import Path

try:
    from pdfminer.high_level import extract_text
except Exception as e:
    print("ERROR: pdfminer.six is not installed or failed to import:", e)
    sys.exit(2)


def main():
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf_text.py <input.pdf> <output.txt>")
        sys.exit(1)
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    try:
        text = extract_text(str(input_path))
        output_path.write_text(text, encoding="utf-8")
        print(f"Extracted text to: {output_path}")
    except Exception as e:
        print("ERROR extracting text:", e)
        sys.exit(3)


if __name__ == "__main__":
    main()

