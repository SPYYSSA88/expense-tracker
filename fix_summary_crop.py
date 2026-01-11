from PIL import Image
import os

# Input and output paths
brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

input_path = os.path.join(brain_dir, 'summary_clean_header_1768136487011.png')
output_path = os.path.join(output_dir, 'summary_header.png')

img = Image.open(input_path)
print(f'Original: {img.size}')

w, h = img.size

# Crop to remove white borders - trim edges
# Target aspect ratio: 20:13 (matching our Flex Message)
target_ratio = 20 / 13

# Crop center portion removing white edges
# Estimate ~5% from top/bottom for white borders
top_crop = int(h * 0.05)
bottom_crop = int(h * 0.02)

# Calculate new dimensions
cropped_h = h - top_crop - bottom_crop
new_width = int(cropped_h * target_ratio)

# Center crop horizontally
left = (w - new_width) // 2
right = left + new_width

img_cropped = img.crop((left, top_crop, right, h - bottom_crop))
print(f'Cropped: {img_cropped.size}')

# Convert to RGB
if img_cropped.mode in ('RGBA', 'P'):
    img_cropped = img_cropped.convert('RGB')

img_cropped.save(output_path, 'PNG', optimize=True)
print(f'Saved: {output_path} ({os.path.getsize(output_path)/1024:.0f} KB)')
print('Done!')
