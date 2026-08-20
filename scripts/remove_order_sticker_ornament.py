from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "brand-assets/order/collectively-delanie-order-sticker-bold-white-600dpi.png"
OUTPUT = ROOT / "brand-assets/order/collectively-delanie-order-sticker-bold-white-no-ornament-600dpi.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    draw = ImageDraw.Draw(image)
    # Remove only the mauve divider/ornament directly beneath “DELANIE”.
    draw.rectangle((1080, 2220, 2520, 2405), fill="#FFFFFF")
    image.save(OUTPUT, format="PNG", dpi=(600, 600), optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
