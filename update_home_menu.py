from PIL import Image
import os

# Input and output paths
input_path = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93/uploaded_image_1768126653228.png'
output_path = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images/rich_menu_home_sized.jpg'

# Open and resize
img = Image.open(input_path)
print(f'Original size: {img.size}')

img_resized = img.resize((2500, 843), Image.LANCZOS)

# Convert to RGB for JPEG
if img_resized.mode in ('RGBA', 'P'):
    img_resized = img_resized.convert('RGB')

# Save
img_resized.save(output_path, 'JPEG', quality=85, optimize=True)

file_size = os.path.getsize(output_path) / 1024
print(f'Saved: {output_path}')
print(f'Size: {file_size:.0f} KB')
print('Done!')
