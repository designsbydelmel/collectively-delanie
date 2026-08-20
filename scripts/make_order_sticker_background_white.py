from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "brand-assets/order/collectively-delanie-order-sticker-bold-600dpi.png"
OUTPUT = ROOT / "brand-assets/order/collectively-delanie-order-sticker-bold-white-600dpi.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    pixels = []
    for red, green, blue in image.getdata():
        # Convert only very light, near-neutral ivory pixels to pure white.
        if min(red, green, blue) >= 235 and max(red, green, blue) - min(red, green, blue) <= 18:
            pixels.append((255, 255, 255))
        else:
            pixels.append((red, green, blue))
    image.putdata(pixels)
    image.save(OUTPUT, format="PNG", dpi=(600, 600), optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
