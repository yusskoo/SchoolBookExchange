// 圖片壓縮腳本 - 將頭像壓縮到適合網頁的大小
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarsDir = path.join(__dirname, 'public', 'avatars');
const files = ['rabbit.jpg', 'pig.jpg', 'dog.jpg', 'cow.jpg', 'sheep.jpg', 'pony.jpg'];

async function compressImages() {
    for (const file of files) {
        const inputPath = path.join(avatarsDir, file);
        const tempPath = path.join(avatarsDir, `${file}.tmp`);

        try {
            console.log(`壓縮 ${file}...`);

            await sharp(inputPath)
                .resize(150, 150, { fit: 'cover' })  // 調整為 150x150
                .jpeg({ quality: 75 })                // JPEG 品質 75%
                .toFile(tempPath);

            // 取代原檔案
            fs.renameSync(tempPath, inputPath);

            const stats = fs.statSync(inputPath);
            console.log(`✓ ${file} 完成 (${Math.round(stats.size / 1024)}KB)`);
        } catch (error) {
            console.error(`✗ ${file} 失敗:`, error.message);
        }
    }

    console.log('\n所有圖片壓縮完成！');
}

compressImages();
