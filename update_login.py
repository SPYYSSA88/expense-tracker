from PIL import Image
import os

brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

input_path = os.path.join(brain_dir, 'uploaded_image_1768129982543.png')
output_path = os.path.join(output_dir, 'rich_menu_login_sized.jpg')

img = Image.open(input_path)
print(f'Original: {img.size}')

# Resize to 2500 x 422
img_resized = img.resize((2500, 422), Image.LANCZOS)

if img_resized.mode in ('RGBA', 'P'):
    img_resized = img_resized.convert('RGB')

img_resized.save(output_path, 'JPEG', quality=85, optimize=True)
print(f'Saved: {output_path}')
print(f'Size: {os.path.getsize(output_path)/1024:.0f} KB')
print('Done!')
