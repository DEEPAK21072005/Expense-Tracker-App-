import os
import subprocess
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
brain_dir = r"C:\Users\polis\.gemini\antigravity-ide\brain\e240c7e0-b353-4f0b-816b-a7413a8ba52d"
downloads_dir = r"C:\Users\polis\Downloads"
out_mp4 = os.path.join(downloads_dir, "expense-tracker-pro-demo.mp4")
out_mp3 = os.path.join(downloads_dir, "expense-tracker-pro-demo.mp3")
music_wav = os.path.abspath("demo_music.wav")
public_mp4 = os.path.abspath("public/demo.mp4")

# 1. Export Standalone MP3 Soundtrack
print("Exporting MP3 soundtrack to Downloads...")
cmd_mp3 = [
    ffmpeg, "-y",
    "-i", music_wav,
    "-b:a", "192k",
    out_mp3
]
subprocess.run(cmd_mp3, check=True)
print(f"MP3 created: {out_mp3} ({os.path.getsize(out_mp3) / 1024:.1f} KB)")

# 2. Define Slide Scenes (8 scenes, each ~4.5s - 5s, total 40.0s = 1200 frames @ 30 FPS)
scenes_data = [
    {
        "img": os.path.join(brain_dir, "dashboard_page_1789811645204.png"),
        "badge": "01 / 08 • EXECUTIVE DASHBOARD",
        "title": "Real-Time Net Worth & Cash Flow",
        "subtitle": "Multi-account balances, income vs. expense cash flow, and category spending distributions.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "accounts_page_1789811654947.png"),
        "badge": "02 / 08 • MULTI-ACCOUNT LEDGER",
        "title": "Comprehensive Account Tracking",
        "subtitle": "Checking, Savings, Credit Cards, and Cash accounts with atomic balance updates.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "transactions_page_1789811664894.png"),
        "badge": "03 / 08 • TRANSACTIONS & SEARCH",
        "title": "Instant Search & Assistive Quick Entry",
        "subtitle": "Multi-facet filtering, instant CSV export, and NLP smart entry ('N' or Cmd+K).",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "budgets_page_1789811675481.png"),
        "badge": "04 / 08 • MONTHLY BUDGETS",
        "title": "Category Budget Variance Monitors",
        "subtitle": "Proactive spending limit trackers with healthy, warning, and exceeded visual alerts.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "split_page_1789811685050.png"),
        "badge": "05 / 08 • GROUP BILL SPLITTING",
        "title": "Greedy Debt Minimization Engine",
        "subtitle": "Multi-party group expenses with exact cent allocation and optimal 'who owes whom' graphs.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "recurring_page_1789811695203.png"),
        "badge": "06 / 08 • SUBSCRIPTIONS & RECURRING",
        "title": "Upcoming Commitments & Projections",
        "subtitle": "Automated renewal countdowns and recurring bill commitments to prevent waste.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "reports_page_1789811705519.png"),
        "badge": "07 / 08 • EXECUTIVE PDF STATEMENTS",
        "title": "Pure Vector Monthly PDF Reports",
        "subtitle": "High-fidelity pdf-lib statements with financial KPI cards and paginated ledgers.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "settings_light_mode_final_1789811761307.png"),
        "badge": "08 / 08 • THEMES & SOVEREIGNTY",
        "title": "Adaptive Light & Dark Modes",
        "subtitle": "Instant theme switching, full JSON data export/import, and private cloud persistence.",
        "duration": 4.5
    },
    {
        "img": os.path.join(brain_dir, "settings_page_loaded_1789811738704.png"),
        "badge": "PRODUCTION READY • RENDER CLOUD",
        "title": "Expense Tracker Pro is Live!",
        "subtitle": "Deployed on Render with managed PostgreSQL: https://expense-tracker-pro-3hon.onrender.com",
        "duration": 4.0
    }
]

# Total duration check: 8 * 4.5 + 4.0 = 40.0 seconds
fps = 30.0
W, H = 1920, 1080

# Try to load Arial or default font
def get_font(size, bold=False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except:
        return ImageFont.load_default()

font_badge = get_font(20, bold=True)
font_title = get_font(36, bold=True)
font_sub = get_font(22, bold=False)
font_top = get_font(18, bold=True)

def render_scene_frame(img_base, scene_info, progress):
    # progress is 0.0 to 1.0 across the scene duration
    # Subtle zoom: 1.00 to 1.03
    zoom = 1.0 + (progress * 0.03)
    zw = int(W * zoom)
    zh = int(H * zoom)
    
    # Resize and crop to 1920x1080 centered
    img_zoomed = img_base.resize((zw, zh), Image.Resampling.BILINEAR)
    x_off = (zw - W) // 2
    y_off = (zh - H) // 2
    frame = img_zoomed.crop((x_off, y_off, x_off + W, y_off + H)).convert("RGBA")
    
    # Overlay canvas
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Top Header Bar (Live on Render indicator)
    draw.rounded_rectangle([32, 24, 620, 68], radius=12, fill=(15, 23, 42, 220), outline=(51, 65, 85, 200), width=1)
    draw.ellipse([48, 41, 58, 51], fill=(34, 197, 94, 255)) # Green pulse dot
    draw.text((70, 36), "LIVE ON RENDER • expense-tracker-pro-3hon.onrender.com", font=font_top, fill=(241, 245, 249, 255))
    
    # Bottom Glassmorphic Card
    card_x0, card_y0 = 60, H - 200
    card_x1, card_y1 = W - 60, H - 40
    
    # Semi-transparent dark slate backdrop
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=16, fill=(11, 15, 25, 235), outline=(59, 130, 246, 160), width=2)
    
    # Accent badge
    draw.rounded_rectangle([card_x0 + 30, card_y0 + 20, card_x0 + 340, card_y0 + 52], radius=8, fill=(37, 99, 235, 240))
    draw.text((card_x0 + 44, card_y0 + 24), scene_info["badge"], font=font_badge, fill=(255, 255, 255, 255))
    
    # Main Title
    draw.text((card_x0 + 30, card_y0 + 64), scene_info["title"], font=font_title, fill=(255, 255, 255, 255))
    
    # Subtitle
    draw.text((card_x0 + 30, card_y0 + 114), scene_info["subtitle"], font=font_sub, fill=(203, 213, 225, 255))
    
    # Composite overlay on top of frame
    final_frame = Image.alpha_composite(frame, overlay).convert("RGB")
    return final_frame

# Pre-load base images
loaded_scenes = []
for s in scenes_data:
    raw_img = Image.open(s["img"]).convert("RGB")
    if raw_img.size != (W, H):
        raw_img = raw_img.resize((W, H), Image.Resampling.LANCZOS)
    loaded_scenes.append((raw_img, s))

total_video_frames = int(40.0 * fps) # 1200 frames
print(f"Rendering {total_video_frames} frames (40.0s @ {fps} FPS)...")

# Launch FFmpeg pipe with music soundtrack
cmd_video = [
    ffmpeg, "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{W}x{H}",
    "-pix_fmt", "rgb24",
    "-r", str(fps),
    "-i", "-",               # Video from pipe
    "-i", music_wav,         # Music soundtrack
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",            # High visual quality
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    out_mp4
]

proc = subprocess.Popen(cmd_video, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

current_scene_idx = 0
scene_start_frame = 0

for frame_idx in range(total_video_frames):
    t_sec = frame_idx / fps
    
    # Find active scene
    cum_t = 0.0
    for idx, (img_b, s_info) in enumerate(loaded_scenes):
        if cum_t + s_info["duration"] > t_sec or idx == len(loaded_scenes) - 1:
            active_idx = idx
            scene_progress = (t_sec - cum_t) / s_info["duration"]
            scene_progress = max(0.0, min(1.0, scene_progress))
            break
        cum_t += s_info["duration"]
        
    img_b, s_info = loaded_scenes[active_idx]
    frame = render_scene_frame(img_b, s_info, scene_progress)
    
    proc.stdin.write(frame.tobytes())
    if frame_idx % 150 == 0:
        print(f"Rendered frame {frame_idx}/{total_video_frames} ({t_sec:.1f}s)...")

stdout, stderr = proc.communicate()

if proc.returncode != 0:
    print("FFmpeg Error:", stderr.decode("utf-8", errors="ignore")[-600:])
    exit(1)

print(f"Video export complete! Path: {out_mp4} ({os.path.getsize(out_mp4) / 1024 / 1024:.2f} MB)")

# Copy to public/demo.mp4
import shutil
shutil.copy2(out_mp4, public_mp4)
print(f"Copied to {public_mp4}")
