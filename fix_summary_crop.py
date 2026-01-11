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

# Aggressively crop to remove ALL white borders
# Crop from all sides
top_crop = int(h * 0.06)    # 6% from top
bottom_crop = int(h * 0.04)  # 4% from bottom
left_crop = int(w * 0.02)    # 2% from left
right_crop = int(w * 0.02)   # 2% from right

img_cropped = img.crop((left_crop, top_crop, w - right_crop, h - bottom_crop))
print(f'Cropped: {img_cropped.size}')

# Now resize to exact 20:13 ratio
target_ratio = 20 / 13
cropped_w, cropped_h = img_cropped.size
current_ratio = cropped_w / cropped_h

if current_ratio > target_ratio:
    # Too wide, trim width
    new_w = int(cropped_h * target_ratio)
    left = (cropped_w - new_w) // 2
    img_final = img_cropped.crop((left, 0, left + new_w, cropped_h))
else:
    # Too tall, trim height
    new_h = int(cropped_w / target_ratio)
    top = (cropped_h - new_h) // 2
    img_final = img_cropped.crop((0, top, cropped_w, top + new_h))

print(f'Final: {img_final.size}')

# Convert to RGB
if img_final.mode in ('RGBA', 'P'):
    img_final = img_final.convert('RGB')

img_final.save(output_path, 'PNG', optimize=True)
print(f'Saved: {output_path} ({os.path.getsize(output_path)/1024:.0f} KB)')
print('Done!')
