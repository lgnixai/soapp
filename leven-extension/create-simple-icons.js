#!/usr/bin/env node

/**
 * 创建简单的图标文件
 * 生成基本的PNG图标数据
 */

const fs = require("fs");

// 创建一个简单的1x1像素的PNG文件
function createSimplePNG() {
  // 这是一个最小的PNG文件数据（1x1像素，透明）
  const pngData = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG签名
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR块
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1像素
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // 位深度、颜色类型等
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT块
    0x54,
    0x08,
    0x99,
    0x01,
    0x01,
    0x00,
    0x00,
    0xff, // 图像数据
    0xff,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0xe2, // CRC
    0x21,
    0xbc,
    0x33,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49, // IEND块
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82 // 结束
  ]);

  return pngData;
}

// 创建一个简单的彩色PNG文件
function createColoredPNG(size) {
  // 这是一个简单的彩色PNG文件（使用渐变背景）
  const width = size;
  const height = size;

  // 创建图像数据
  const imageData = Buffer.alloc(width * height * 4);

  // 填充渐变颜色（从蓝色到紫色）
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = Math.floor(102 + (x / width) * 54); // 102-156
      const g = Math.floor(126 + (y / height) * 49); // 126-175
      const b = Math.floor(234 + (x / width) * 22); // 234-256
      const a = 255;

      imageData[index] = r; // R
      imageData[index + 1] = g; // G
      imageData[index + 2] = b; // B
      imageData[index + 3] = a; // A
    }
  }

  // 创建PNG文件头
  const pngHeader = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a // PNG签名
  ]);

  // 创建IHDR块
  const ihdrData = Buffer.alloc(25);
  ihdrData.writeUInt32BE(13, 0); // 长度
  ihdrData.write("IHDR", 4); // 类型
  ihdrData.writeUInt32BE(width, 8); // 宽度
  ihdrData.writeUInt32BE(height, 12); // 高度
  ihdrData.writeUInt8(8, 16); // 位深度
  ihdrData.writeUInt8(2, 17); // 颜色类型 (RGB)
  ihdrData.writeUInt8(0, 18); // 压缩方法
  ihdrData.writeUInt8(0, 19); // 过滤方法
  ihdrData.writeUInt8(0, 20); // 交错方法

  // 计算CRC
  const crc = require("crypto").createHash("crc32").update(ihdrData.slice(4, 21)).digest();
  ihdrData.writeUInt32BE(crc.readUInt32BE(0), 21);

  // 创建IDAT块（压缩的图像数据）
  const zlib = require("zlib");
  const compressedData = zlib.deflateSync(imageData);

  const idatData = Buffer.alloc(8 + compressedData.length + 4);
  idatData.writeUInt32BE(compressedData.length, 0);
  idatData.write("IDAT", 4);
  compressedData.copy(idatData, 8);

  // 计算IDAT CRC
  const idatCrc = require("crypto")
    .createHash("crc32")
    .update(idatData.slice(4, 8 + compressedData.length))
    .digest();
  idatData.writeUInt32BE(idatCrc.readUInt32BE(0), 8 + compressedData.length);

  // 创建IEND块
  const iendData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

  // 组合所有数据
  return Buffer.concat([pngHeader, ihdrData, idatData, iendData]);
}

async function generateIcons() {
  console.log("🎨 开始生成图标文件...");

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const filename = `icon${size}.png`;

    try {
      // 使用简单的PNG数据
      const iconData = createColoredPNG(size);
      fs.writeFileSync(filename, iconData);
      console.log(`✅ 生成图标: ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ 生成图标失败 ${filename}:`, error.message);

      // 如果失败，创建一个最小的PNG文件
      try {
        const simpleData = createSimplePNG();
        fs.writeFileSync(filename, simpleData);
        console.log(`✅ 生成简单图标: ${filename}`);
      } catch (fallbackError) {
        console.error(`❌ 生成简单图标也失败:`, fallbackError.message);
      }
    }
  }

  console.log("🎉 图标生成完成！");
}

// 运行图标生成
generateIcons().catch(console.error);
