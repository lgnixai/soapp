# Flow Browser 开发者模式功能

## 概述

Flow Browser 现在支持开发者模式，允许用户加载本地开发的Chrome扩展。这个功能类似于Chrome浏览器的开发者模式，让开发者可以测试和调试自己的扩展。

## 功能特性

### 1. 开发者模式开关

- 在扩展管理页面启用/禁用开发者模式
- 启用后显示开发者工具按钮

### 2. 加载本地扩展

- 支持加载未打包的扩展文件夹
- 自动验证扩展的manifest.json文件
- 生成唯一的扩展ID
- 复制扩展文件到安全位置

### 3. 扩展管理

- 启用/禁用已加载的扩展
- 卸载本地扩展
- 更新扩展（重新加载）

## 使用方法

### 启用开发者模式

1. 打开Flow Browser
2. 进入扩展管理页面 (`flow://extensions`)
3. 打开"开发者模式"开关

### 加载本地扩展

1. 确保开发者模式已启用
2. 点击"加载扩展"按钮
3. 选择包含扩展文件的文件夹
4. 确认扩展加载成功

### 扩展文件夹结构

本地扩展文件夹应包含以下文件：

```
your-extension/
├── manifest.json          # 扩展清单文件（必需）
├── popup.html            # 弹出窗口（可选）
├── popup.js              # 弹出窗口脚本（可选）
├── background.js         # 后台脚本（可选）
├── icon16.png           # 16x16图标（可选）
├── icon48.png           # 48x48图标（可选）
└── icon128.png          # 128x128图标（可选）
```

### manifest.json 示例

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A test extension",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "My Extension"
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

## 技术实现

### 后端功能

1. **ExtensionManager类扩展**
   - `loadUnpackedExtension()`: 加载本地扩展
   - `removeUnpackedExtension()`: 移除本地扩展
   - `updateUnpackedExtension()`: 更新本地扩展

2. **IPC API**
   - `extensions:load-unpacked-extension`: 加载扩展
   - `extensions:remove-unpacked-extension`: 移除扩展
   - `extensions:update-unpacked-extension`: 更新扩展

3. **文件系统操作**
   - 验证扩展目录结构
   - 复制扩展文件到安全位置
   - 生成唯一扩展ID

### 前端功能

1. **DeveloperMode组件**
   - 开发者模式开关
   - 加载扩展按钮
   - 打包和更新按钮（预留）

2. **文件选择对话框**
   - 使用Electron的dialog API
   - 支持文件夹选择

## 安全考虑

1. **文件验证**
   - 验证manifest.json格式
   - 检查必需文件是否存在
   - 验证文件权限

2. **隔离存储**
   - 扩展文件复制到专用目录
   - 避免直接访问用户选择的文件夹

3. **权限控制**
   - 扩展权限限制
   - 用户确认对话框

## 测试扩展

项目包含一个测试扩展示例 (`test-extension/`)，可以用来验证开发者模式功能：

1. 进入扩展管理页面
2. 启用开发者模式
3. 点击"加载扩展"
4. 选择 `test-extension` 文件夹
5. 验证扩展是否正确加载

## 故障排除

### 常见问题

1. **扩展加载失败**
   - 检查manifest.json格式是否正确
   - 确保所有必需文件存在
   - 查看控制台错误信息

2. **扩展不显示**
   - 检查扩展是否已启用
   - 重新加载扩展页面
   - 查看扩展权限设置

3. **文件选择对话框不显示**
   - 确保开发者模式已启用
   - 检查Electron API是否正确暴露
   - 查看控制台错误信息

### 调试技巧

1. 打开开发者工具查看控制台输出
2. 检查扩展的background script日志
3. 验证扩展文件是否正确复制
4. 检查扩展ID是否唯一

## 未来计划

1. **扩展打包功能**
   - 将本地扩展打包为.crx文件
   - 支持扩展签名

2. **热重载功能**
   - 自动检测扩展文件变化
   - 自动重新加载修改的扩展

3. **扩展调试工具**
   - 扩展后台脚本调试
   - 扩展权限检查工具

4. **扩展商店集成**
   - 本地扩展发布到商店
   - 扩展更新检查

## 贡献

欢迎提交问题和功能请求来改进开发者模式功能！
