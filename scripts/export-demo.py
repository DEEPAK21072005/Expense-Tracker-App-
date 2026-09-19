import os
import cv2
import numpy as np
from PIL import Image, ImageSequence

src_webp = r"C:\Users\polis\.gemini\antigravity-ide\brain\e240c7e0-b353-4f0b-816b-a7413a8ba52d\complete_e2e_check_1789756984733.webp"
downloads_dir = r"C:\Users\polis\Downloads"
out_mp4 = os.path.join(downloads_dir, "expense-tracker-pro-demo.mp4")
out_webp = os.path.join(downloads_dir, "expense-tracker-pro-demo.webp")

print(f"Loading source animation from: {src_webp}")
im = Image.open(src_webp)
frames = [frame.copy().convert("RGB") for frame in ImageSequence.Iterator(im)]
total_frames = len(frames)
print(f"Extracted {total_frames} frames.")

# Target duration: exactly 40.0 seconds
target_duration_s = 40.0
fps = total_frames / target_duration_s  # 562 / 40.0 = 14.05 fps

# 1. Export MP4 Video (H.264 / mp4v)
width, height = frames[0].size
# Round dimensions to even numbers for video codecs
width = width - (width % 2)
height = height - (height % 2)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
# We can resample or write at 30 fps for smooth playback
target_fps = 30.0
total_target_frames = int(target_duration_s * target_fps)  # 1200 frames

print(f"Writing MP4 video to: {out_mp4} at {target_fps} FPS ({total_target_frames} frames = {target_duration_s}s)...")
out = cv2.VideoWriter(out_mp4, fourcc, target_fps, (width, height))

for i in range(total_target_frames):
    # Map index to source frame
    src_idx = min(int(i * total_frames / total_target_frames), total_frames - 1)
    frame_rgb = frames[src_idx]
    if frame_rgb.size != (width, height):
        frame_rgb = frame_rgb.resize((width, height), Image.Resampling.LANCZOS)
    frame_bgr = cv2.cvtColor(np.array(frame_rgb), cv2.COLOR_RGB2BGR)
    out.write(frame_bgr)

out.release()
print(f"MP4 export complete! File size: {os.path.getsize(out_mp4) / 1024 / 1024:.2f} MB")

# 2. Export 40s WebP Animation
# 40 seconds = 40,000 ms. Frame duration = 40000 / total_frames
frame_duration_ms = int(round(40000 / total_frames))
print(f"Writing 40-second WebP to: {out_webp} (duration per frame: {frame_duration_ms} ms)...")

# Optimize WebP size: resize to 1280x748 for compact high quality
target_w = 1280
target_h = int(round(height * (target_w / width)))
target_h = target_h - (target_h % 2)

resized_frames = [f.resize((target_w, target_h), Image.Resampling.BILINEAR) for f in frames]
resized_frames[0].save(
    out_webp,
    save_all=True,
    append_images=resized_frames[1:],
    duration=frame_duration_ms,
    loop=0,
    quality=80,
    method=4
)
print(f"WebP export complete! File size: {os.path.getsize(out_webp) / 1024 / 1024:.2f} MB")

# Also copy to public/demo.mp4 and public/demo.webp for the repo/site if needed
public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public"))
os.makedirs(public_dir, exist_ok=True)
import shutil
shutil.copy2(out_mp4, os.path.join(public_dir, "demo.mp4"))
print("Copied demo.mp4 to public/demo.mp4")
