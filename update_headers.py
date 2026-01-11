from PIL import Image
import os

brain_dir = r'C:/Users/Admin/.gemini/antigravity/brain/a3a435fd-53e4-457f-90b1-f37df4662d93'
output_dir = r'c:/Users/Admin/.gemini/antigravity/scratch/expense-tracker/backend/public/images'

files = [
    ('expense_header_v2_1768127912320.png', 'expense_header.png'),
    ('income_header_v2_1768127932708.png', 'income_header.png')
]

for input_name, output_name in files:
    input_path = os.path.join(brain_dir, input_name)
    output_path = os.path.join(output_dir, output_name)
    
    img = Image.open(input_path)
    # Crop to 20:13 aspect ratio (Flex Message hero)
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
    
    # Convert to RGB
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    img.save(output_path, 'PNG', optimize=True)
    print(f'{output_name}: {img.size} ({os.path.getsize(output_path)/1024:.0f} KB)')

print('Done!')
