from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (16, 185, 129)      # verde (theme)
BG2 = (5, 150, 105)      # verde mas oscuro (borde/plato)
WHITE = (255, 255, 255)

def draw_plate_icon(size, padding_ratio=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * padding_ratio)
    d.rectangle([0, 0, size, size], fill=BG)

    cx, cy = size / 2, size / 2
    plate_r = size * 0.30
    d.ellipse([cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r], fill=WHITE)
    inner_r = plate_r * 0.62
    d.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=BG2)

    fork_x = cx - size * 0.235
    fork_w = size * 0.017
    fork_top = cy - size * 0.30
    fork_bottom = cy + size * 0.30
    d.rectangle([fork_x - fork_w, fork_top + size*0.06, fork_x + fork_w, fork_bottom], fill=WHITE)
    for i in range(3):
        tx = fork_x - size*0.045 + i * size*0.045
        d.rectangle([tx - fork_w*0.8, fork_top, tx + fork_w*0.8, fork_top + size*0.10], fill=WHITE)
    d.rectangle([fork_x - size*0.05, fork_top + size*0.08, fork_x + size*0.05, fork_top + size*0.11], fill=WHITE)

    spoon_x = cx + size * 0.235
    spoon_w = size * 0.02
    d.rectangle([spoon_x - spoon_w, cy - size*0.10, spoon_x + spoon_w, cy + size*0.30], fill=WHITE)
    d.ellipse([spoon_x - size*0.055, cy - size*0.32, spoon_x + size*0.055, cy - size*0.10], fill=WHITE)

    return img

for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
    img = draw_plate_icon(size)
    img.convert("RGB").save(os.path.join(OUT, name), "PNG")

for size, name in [(192, "icon-maskable-192.png"), (512, "icon-maskable-512.png")]:
    img = draw_plate_icon(size, padding_ratio=0.0)
    canvas = Image.new("RGBA", (size, size), BG)
    scale = 0.7
    inner = int(size * scale)
    resized = draw_plate_icon(inner)
    offset = (size - inner) // 2
    canvas.paste(resized, (offset, offset), resized)
    canvas.convert("RGB").save(os.path.join(OUT, name), "PNG")

img180 = draw_plate_icon(180)
img180.convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"), "PNG")

print("icons generated:", os.listdir(OUT))
