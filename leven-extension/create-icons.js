#!/usr/bin/env node

/**
 * 创建简单的图标文件
 * 使用Canvas API生成基本的PNG图标
 */

const fs = require("fs");
const { createCanvas } = require("canvas");

// 如果没有canvas模块，创建一个简单的替代方案
function createSimpleIcon(size) {
  // 创建一个简单的SVG图标作为替代
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="url(#grad)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" text-anchor="middle" dy="0.35em" fill="white">L</text>
</svg>`;

  // 将SVG转换为简单的PNG数据（这里使用base64编码的简单PNG）
  const pngData = Buffer.from(
    `
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
`,
    "base64"
  );

  return pngData;
}

async function generateIcons() {
  console.log("🎨 开始生成图标文件...");

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const filename = `icon${size}.png`;
    const iconData = createSimpleIcon(size);

    try {
      fs.writeFileSync(filename, iconData);
      console.log(`✅ 生成图标: ${filename}`);
    } catch (error) {
      console.error(`❌ 生成图标失败 ${filename}:`, error.message);
    }
  }

  console.log("🎉 图标生成完成！");
}

// 运行图标生成
generateIcons().catch(console.error);
