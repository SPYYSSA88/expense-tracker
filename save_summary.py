from PIL import Image
import os

brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

input_path = os.path.join(brain_dir, 'summary_full_1768129390866.png')
output_path = os.path.join(output_dir, 'summary_header.png')

img = Image.open(input_path)
print(f'Original: {img.size}')

# Crop to remove surrounding background (center crop to 20:13 ratio)
target_ratio = 20 / 13
current_ratio = img.width / img.height

if current_ratio > target_ratio:
    # Too wide, crop width
    new_width = int(img.height * target_ratio)
    left = (img.width - new_width) // 2
    img = img.crop((left, 0, left + new_width, img.height))
else:
    # Too tall, crop height
    new_height = int(img.width / target_ratio)
    top = (img.height - new_height) // 2
    img = img.crop((0, top, img.width, top + new_height))

print(f'Cropped: {img.size}')

# Convert to RGB
if img.mode in ('RGBA', 'P'):
    img = img.convert('RGB')

img.save(output_path, 'PNG', optimize=True)
print(f'Saved: {output_path} ({os.path.getsize(output_path)/1024:.0f} KB)')
print('Done!')
