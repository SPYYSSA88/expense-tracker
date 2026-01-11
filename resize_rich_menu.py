from PIL import Image
import os

# Paths
brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

# Files to resize
files = [
    ('rich_menu_login_1768125029832.png', 'rich_menu_login_sized.jpg'),
    ('rich_menu_home_1768125045890.png', 'rich_menu_home_sized.jpg')
]

for input_name, output_name in files:
    input_path = os.path.join(brain_dir, input_name)
    output_path = os.path.join(output_dir, output_name)
    
    # Open and resize
    img = Image.open(input_path)
    img_resized = img.resize((2500, 843), Image.LANCZOS)
    
    # Convert to RGB (for JPEG)
    if img_resized.mode in ('RGBA', 'P'):
        img_resized = img_resized.convert('RGB')
    
    # Save as JPEG with quality that keeps file under 1MB
    quality = 80
    img_resized.save(output_path, 'JPEG', quality=quality, optimize=True)
    
    # Check file size
    file_size = os.path.getsize(output_path)
    print(f'{output_name}: {file_size/1024:.0f} KB ({img_resized.size})')
    
print('Done!')
