import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIDTH = 2500;
const HEIGHT = 843;

async function resizeImage(inputPath, outputPath) {
    try {
        const image = await loadImage(inputPath);
        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw image scaled to fit
        ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);

        // Save as JPEG with compression (LINE limit is 1MB)
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.7 });
        fs.writeFileSync(outputPath, buffer);

        const fileSizeKB = Math.round(buffer.length / 1024);
        console.log(`✅ Resized: ${outputPath} (${fileSizeKB} KB)`);
    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

async function main() {
    const imagesDir = path.join(__dirname, 'public', 'images');

    await resizeImage(
        path.join(imagesDir, 'rich_menu_home.png'),
        path.join(imagesDir, 'rich_menu_home_sized.jpg')
    );

    await resizeImage(
        path.join(imagesDir, 'rich_menu_login.png'),
        path.join(imagesDir, 'rich_menu_login_sized.jpg')
    );

    console.log('\n🎉 Done! Images resized to 2500x843');
}

main();
