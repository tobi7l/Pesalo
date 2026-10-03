from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (255, 193, 7)    # amarillo (acento)
INK = (17, 17, 19)    # plato y cubiertos en negro


def draw_plate_icon(size):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2

    # cubiertos (se dibujan primero para que el anillo del plato los separe)
    fork_x = cx - size * 0.255
    fork_w = size * 0.017
    fork_top = cy - size * 0.27
    fork_bottom = cy + size * 0.27
    d.rectangle([fork_x - fork_w, fork_top + size * 0.06, fork_x + fork_w, fork_bottom], fill=INK)
    for i in range(3):
        tx = fork_x - size * 0.045 + i * size * 0.045
        d.rectangle([tx - fork_w * 0.8, fork_top, tx + fork_w * 0.8, fork_top + size * 0.10], fill=INK)
    d.rectangle([fork_x - size * 0.05, fork_top + size * 0.08, fork_x + size * 0.05, fork_top + size * 0.11], fill=INK)

    spoon_x = cx + size * 0.255
    spoon_w = size * 0.02
    d.rectangle([spoon_x - spoon_w, cy - size * 0.08, spoon_x + spoon_w, cy + size * 0.27], fill=INK)
    d.ellipse([spoon_x - size * 0.055, cy - size * 0.29, spoon_x + size * 0.055, cy - size * 0.08], fill=INK)

    # plato: anillo amarillo de separacion, aro negro y centro amarillo
    gap_r = size * 0.255
    d.ellipse([cx - gap_r, cy - gap_r, cx + gap_r, cy + gap_r], fill=BG)
    plate_r = size * 0.225
    d.ellipse([cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r], fill=INK)
    inner_r = plate_r * 0.62
    d.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=BG)
    return img


for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    draw_plate_icon(size).convert("RGB").save(os.path.join(OUT, name), "PNG")

for size, name in [(192, "icon-maskable-192.png"), (512, "icon-maskable-512.png")]:
    canvas = Image.new("RGB", (size, size), BG)
    inner = int(size * 0.7)
    canvas.paste(draw_plate_icon(inner).convert("RGB"), ((size - inner) // 2, (size - inner) // 2))
    canvas.save(os.path.join(OUT, name), "PNG")

print("icons generated:", sorted(os.listdir(OUT)))
