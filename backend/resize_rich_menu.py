from PIL import Image
import os

# Input and output paths
input_path = r"C:\Users\Admin\.gemini\antigravity\brain\235b8686-ef24-4c79-86b6-124d5a40621e\rich_menu_luxury_1768039412115.png"
output_path = r"c:\Users\Admin\.gemini\antigravity\scratch\expense-tracker\backend\public\images\rich_menu.jpg"

# LINE Rich Menu sizes allowed: 2500x1686, 2500x843, 1200x810, 1200x405, 800x540, 800x270
target_width = 2500
target_height = 843

# Open and resize
img = Image.open(input_path)
img_resized = img.resize((target_width, target_height), Image.LANCZOS)

# Convert to RGB (JPEG doesn't support alpha)
if img_resized.mode in ('RGBA', 'P'):
    img_resized = img_resized.convert('RGB')

# Save as JPEG with compression (LINE max is 1MB)
img_resized.save(output_path, "JPEG", quality=85, optimize=True)
print(f"✅ Resized and compressed image saved to: {output_path}")
print(f"📐 Size: {target_width}x{target_height}")
print(f"📦 File size: {os.path.getsize(output_path) / 1024:.1f} KB")
print(f"📐 New size: {target_width}x{target_height}")
