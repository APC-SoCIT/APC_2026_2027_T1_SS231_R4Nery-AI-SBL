"""Run from the AI-For-All folder (the one containing /public):  python3 convert-images.py
Needs:  pip install pillow
Converts the heavy mascot PNGs to small WebP files (the patch already points the code at them)."""
from PIL import Image
import os

base = 'public/ai-for-all/'
jobs = {'Mascot-look-down': 640, 'Mascot-look-up': 800, 'Story-Ai-Mascot': 640,
        'Story-Page-Mascot-1': 640, 'Story-Page-Mascot-2': 640,
        'Story-Page-Mascot-3': 640, 'Admin-Page-Mascot': 640}
for name, mx in jobs.items():
    src = base + name + '.png'
    if not os.path.exists(src):
        continue
    im = Image.open(src).convert('RGBA')
    im.thumbnail((mx, mx), Image.LANCZOS)
    im.save(base + name + '.webp', 'WEBP', quality=82, method=6)
    os.remove(src)
    print(name, '->', os.path.getsize(base + name + '.webp') // 1024, 'KB')

im = Image.open('public/APC Logo.png').convert('RGBA')   # keep the PNG; it's still used nowhere else after the patch
im.thumbnail((256, 256), Image.LANCZOS)
im.save('public/apc-logo.webp', 'WEBP', quality=85, method=6)
print('apc-logo.webp done')