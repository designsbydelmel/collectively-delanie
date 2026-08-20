from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    "/Users/delanieurrutia/.codex/generated_images/"
    "01a0160c-0f33-7601-9494-c5a8b82ba5a5/"
    "exec-0234c2c3-4aaa-4651-8ce7-f9753fa4c3fa.png"
)
QR_SOURCE = ROOT / "brand-assets/qr/CD QR Code.png"
OUTPUT = ROOT / "brand-assets/order/collectively-delanie-order-sticker-bold-600dpi.png"


def main() -> None:
    base = Image.open(SOURCE).convert("RGB")
    base = base.resize((3600, 3600), Image.Resampling.LANCZOS)

    qr = Image.open(QR_SOURCE).convert("RGB")
    qr = qr.resize((650, 650), Image.Resampling.NEAREST)

    # Fully cover the decorative generated pattern and restore a true quiet zone.
    draw = ImageDraw.Draw(base)
    draw.rectangle((1415, 2700, 2185, 3470), fill="#FFFFFF")
    base.paste(qr, (1475, 2760))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base.save(OUTPUT, format="PNG", dpi=(600, 600), optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
