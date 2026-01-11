from PIL import Image
import os

# Source and destination paths
brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

# Use the Thai culture final image
input_path = os.path.join(brain_dir, 'summary_final_1768130588694.png')
output_path = os.path.join(output_dir, 'summary_header.png')

img = Image.open(input_path)
print(f'Original: {img.size}')

# Get dimensions
w, h = img.size

# Crop tighter - remove more of the outer edges
# Target: 20:10 (2:1) aspect ratio for hero image
target_ratio = 20 / 10  # 2:1

# Calculate crop dimensions
# Make it wider and shorter
new_height = int(w / target_ratio)
top = (h - new_height) // 2

# Crop from the center
img_cropped = img.crop((0, top, w, top + new_height))
print(f'Cropped: {img_cropped.size}')

# Convert to RGB if needed
if img_cropped.mode in ('RGBA', 'P'):
    img_cropped = img_cropped.convert('RGB')

img_cropped.save(output_path, 'PNG', optimize=True)
print(f'Saved: {output_path} ({os.path.getsize(output_path)/1024:.0f} KB)')

# Also create expense and income headers with same crop
expense_input = os.path.join(brain_dir, 'expense_header_v2_1768127912320.png')
income_input = os.path.join(brain_dir, 'income_header_v2_1768127932708.png')

for name, path in [('expense', expense_input), ('income', income_input)]:
    if os.path.exists(path):
        img = Image.open(path)
        w, h = img.size
        new_height = int(w / target_ratio)
        top = (h - new_height) // 2
        img_cropped = img.crop((0, top, w, top + new_height))
        if img_cropped.mode in ('RGBA', 'P'):
            img_cropped = img_cropped.convert('RGB')
        out = os.path.join(output_dir, f'{name}_header.png')
        img_cropped.save(out, 'PNG', optimize=True)
        print(f'Saved: {out} ({os.path.getsize(out)/1024:.0f} KB)')

print('Done!')
