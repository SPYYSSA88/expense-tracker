from PIL import Image
import os
import glob

def make_transparent(image_path, output_path):
    print(f"Processing {image_path} -> {output_path}...")
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check for white/near-white pixels (threshold 245+)
            if item[0] > 245 and item[1] > 245 and item[2] > 245:
                newData.append((255, 255, 255, 0))  # Make transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved {output_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

# Source directory (artifacts)
src_dir = r"C:\Users\Admin\.gemini\antigravity\brain\ae4a3cd8-c63c-40fc-be12-69ff55b4aa47"
# Target directory
dst_dir = r"frontend\public\icons"

# Mapping of new icons
icon_mapping = {
    "icon_home_v2": "nav_home.png",
    "icon_daily_v2": "nav_daily.png",
    "icon_report_v2": "nav_report.png",
    "icon_category_v2": "nav_category.png",
    "icon_profile_v2": "nav_profile.png",
    "icon_theme_v2": "setting_theme.png",
    "icon_language_v2": "setting_language.png",
    "icon_currency_v2": "setting_currency.png",
    "icon_date_v2": "setting_date.png",
    "icon_number_v2": "setting_number.png",
    "icon_chat_v2": "setting_chat.png",
    "icon_logout_v2": "setting_logout.png",
}

for prefix, output_name in icon_mapping.items():
    # Find the source file (with timestamp)
    pattern = os.path.join(src_dir, f"{prefix}_*.png")
    matches = glob.glob(pattern)
    if matches:
        src_file = matches[0]  # Get the first match
        dst_file = os.path.join(dst_dir, output_name)
        make_transparent(src_file, dst_file)
    else:
        print(f"Warning: No file found for {prefix}")

print("All icons processed!")
