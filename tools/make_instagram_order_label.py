from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "brand-assets" / "order" / "collectively-delanie-instagram-order-label-3in.png"
SIZE = 1800

MAUVE = "#B18D94"
OLIVE = "#4F5C53"
WHITE = "#FFFFFF"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = {
        "serif": [
            "/System/Library/Fonts/Supplemental/Didot.ttc",
            "/System/Library/Fonts/Supplemental/Baskerville.ttc",
        ],
        "sans": [
            "/System/Library/Fonts/Avenir Next.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ],
    }
    for candidate in candidates[name]:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    return ImageOps.contain(image, box, Image.Resampling.LANCZOS)


def curved_text(
    base: Image.Image,
    text: str,
    text_font: ImageFont.FreeTypeFont,
    center: tuple[int, int],
    radius: int,
    start_angle: float,
    end_angle: float,
    fill: str,
) -> None:
    angles = [
        start_angle + (end_angle - start_angle) * i / (len(text) - 1)
        for i in range(len(text))
    ]
    for character, angle in zip(text, angles):
        if character == " ":
            continue
        # Render each character on an intentionally oversized transparent tile.
        # This prevents italic overhangs, serifs, descenders, and punctuation
        # from being clipped before the tile is rotated onto the arc.
        glyph = Image.new("RGBA", (320, 320), (255, 255, 255, 0))
        glyph_draw = ImageDraw.Draw(glyph)
        glyph_draw.text(
            (160, 160),
            character,
            font=text_font,
            fill=fill,
            anchor="mm",
        )
        rotated = glyph.rotate(-(angle + 90), expand=True, resample=Image.Resampling.BICUBIC)
        radians = math.radians(angle)
        x = center[0] + radius * math.cos(radians) - rotated.width / 2
        y = center[1] + radius * math.sin(radians) - rotated.height / 2
        base.alpha_composite(rotated, (round(x), round(y)))


canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
draw = ImageDraw.Draw(canvas)

# Pure-white label interior with transparency beyond the circular cut edge.
draw.ellipse((35, 35, SIZE - 35, SIZE - 35), fill=WHITE, outline=OLIVE, width=8)
draw.ellipse((62, 62, SIZE - 62, SIZE - 62), outline=MAUVE, width=7)

# Use the current Collectively Delanie logo without redrawing it. Normalize the
# pale source background to white so it blends into the requested white label.
logo = Image.open(ROOT / "brand-assets" / "logos" / "CD Logo.png").convert("RGB")
logo = logo.crop((115, 80, 1140, 955))
pixels = logo.load()
for y in range(logo.height):
    for x in range(logo.width):
        r, g, b = pixels[x, y]
        if r > 224 and g > 220 and b > 214:
            pixels[x, y] = (255, 255, 255)
logo = contain(logo, (900, 720))
canvas.paste(logo, ((SIZE - logo.width) // 2, 435))

# Render the curved message after the logo so none of its letters can be
# obscured by the logo image's white background.
curved_text(
    canvas,
    "Thank you for your order!",
    font("serif", 100),
    (SIZE // 2, 850),
    650,
    205,
    335,
    OLIVE,
)

# Two blank lines for handwriting, matching the reference layout.
draw.line((435, 1250, 1365, 1250), fill=OLIVE, width=5)
draw.line((435, 1400, 1365, 1400), fill=OLIVE, width=5)

# Place the original QR at the bottom in place of the butterfly. Nearest-neighbor
# resizing preserves the original module geometry.
qr = Image.open(ROOT / "brand-assets" / "qr" / "CD QR Code.png").convert("RGB")
qr = qr.resize((260, 260), Image.Resampling.NEAREST)
canvas.paste(qr, ((SIZE - qr.width) // 2, 1430))

OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT, dpi=(600, 600), optimize=True)
print(OUT)
