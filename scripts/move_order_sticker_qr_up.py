from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    "/Users/delanieurrutia/.codex/generated_images/"
    "01a0160c-0f33-7601-9494-c5a8b82ba5a5/"
    "exec-0234c2c3-4aaa-4651-8ce7-f9753fa4c3fa.png"
)
QR_SOURCE = ROOT / "brand-assets/qr/CD QR Code.png"
OUTPUT = ROOT / "brand-assets/order/collectively-delanie-order-sticker-final-600dpi.png"


def make_background_white(image: Image.Image) -> Image.Image:
    pixels = []
    for red, green, blue in image.getdata():
        if min(red, green, blue) >= 235 and max(red, green, blue) - min(red, green, blue) <= 18:
            pixels.append((255, 255, 255))
        else:
            pixels.append((red, green, blue))
    image.putdata(pixels)
    return image


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    image = image.resize((3600, 3600), Image.Resampling.LANCZOS)
    image = make_background_white(image)
    draw = ImageDraw.Draw(image)

    # Remove only the mauve ornament beneath “DELANIE”.
    draw.rectangle((1080, 2220, 2520, 2405), fill="#FFFFFF")

    # Clear the generated QR, then place the authentic QR higher with a quiet zone.
    # The lower edge remains well above the uninterrupted circular border.
    draw.rectangle((1400, 2735, 2200, 3430), fill="#FFFFFF")
    qr = Image.open(QR_SOURCE).convert("RGB").resize((560, 560), Image.Resampling.NEAREST)
    image.paste(qr, (1520, 2790))
    # Restore the short lower-center portion of the inner olive circle.
    draw = ImageDraw.Draw(image)
    draw.arc((120, 120, 3480, 3480), start=76, end=104, fill="#263718", width=14)

    image.save(OUTPUT, format="PNG", dpi=(600, 600), optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
