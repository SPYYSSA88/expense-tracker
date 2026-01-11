from PIL import Image
import os

brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

# New compact size: 2500 x 422 (half of 843)
files = [
    ('rich_menu_login_1768125029832.png', 'rich_menu_login_sized.jpg'),
    ('uploaded_image_1768126653228.png', 'rich_menu_home_sized.jpg')  # User's uploaded home image
]

for input_name, output_name in files:
    input_path = os.path.join(brain_dir, input_name)
    output_path = os.path.join(output_dir, output_name)
    
    img = Image.open(input_path)
    # Resize to compact: 2500 x 422
    img_resized = img.resize((2500, 422), Image.LANCZOS)
    
    if img_resized.mode in ('RGBA', 'P'):
        img_resized = img_resized.convert('RGB')
    
    img_resized.save(output_path, 'JPEG', quality=85, optimize=True)
    print(f'{output_name}: {img_resized.size} ({os.path.getsize(output_path)/1024:.0f} KB)')

print('Done! Rich Menu images resized to compact size.')
