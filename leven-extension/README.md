# Leven Extension

一个极简的测试扩展，用于验证Flow Browser的本地扩展功能。

## 📋 功能特性

- ✅ 简单的Hello World弹窗
- ✅ 美观的渐变界面设计
- ✅ 交互式点击效果
- ✅ 实时时间显示
- ✅ Chrome扩展API测试
- ✅ 键盘快捷键支持（ESC关闭）

## 🚀 安装步骤

### 1. 生成图标

1. 在浏览器中打开 `generate-icons.html`
2. 点击下载按钮生成三个尺寸的图标：
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)
3. 将下载的图标文件放到 `leven-extension` 目录中

### 2. 在Flow Browser中加载扩展

1. 打开Flow Browser
2. 进入扩展管理页面
3. 启用"开发者模式"
4. 点击"加载扩展"
5. 选择 `leven-extension` 文件夹
6. 扩展应该出现在扩展列表中

### 3. 测试扩展

1. 在浏览器工具栏中找到Leven扩展图标
2. 点击图标打开弹窗
3. 你应该看到"Hello World!"消息
4. 尝试点击弹窗内容，观察交互效果
5. 按ESC键关闭弹窗

## 📁 文件结构

```
leven-extension/
├── manifest.json          # 扩展配置文件
├── popup.html            # 弹窗HTML文件
├── popup.js              # 弹窗JavaScript文件
├── icon16.png            # 16x16图标
├── icon48.png            # 48x48图标
├── icon128.png           # 128x128图标
├── generate-icons.html   # 图标生成工具
└── README.md             # 说明文档
```

## 🔧 技术细节

### Manifest V3

- 使用最新的Manifest V3规范
- 最小权限要求：仅需要 `activeTab`
- 无后台脚本，纯前端实现

### 兼容性

- ✅ Flow Browser
- ✅ Chrome浏览器
- ✅ Edge浏览器
- ✅ 其他基于Chromium的浏览器

### 测试功能

- Chrome Runtime API可用性检测
- 扩展清单加载测试
- 用户交互响应测试
- 样式和动画效果测试

## 🐛 故障排除

### 扩展无法加载

1. 确保所有文件都在正确位置
2. 检查manifest.json语法是否正确
3. 确保图标文件存在且命名正确

### 弹窗无法显示

1. 检查浏览器控制台是否有错误
2. 确保popup.html和popup.js文件完整
3. 尝试重新加载扩展

### 图标不显示

1. 确保图标文件格式为PNG
2. 检查图标文件尺寸是否正确
3. 重新生成图标文件

## 📝 开发说明

这是一个用于测试的极简扩展，包含：

- **最小化设计**：只包含必要的文件
- **标准API使用**：使用标准的Chrome扩展API
- **错误处理**：包含基本的错误检测和日志
- **用户反馈**：提供视觉和交互反馈

## 🎯 测试目标

通过这个扩展可以测试：

1. ✅ 本地扩展加载功能
2. ✅ Manifest V3支持
3. ✅ Popup界面渲染
4. ✅ JavaScript执行
5. ✅ Chrome API访问
6. ✅ 用户交互响应
7. ✅ 样式和动画效果

如果这个扩展能正常工作，说明Flow Browser的本地扩展功能基本正常。
