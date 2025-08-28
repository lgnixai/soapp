#!/usr/bin/env node

/**
 * Leven Extension 测试脚本
 * 用于验证扩展文件的完整性和正确性
 */

const fs = require('fs').promises;
const path = require('path');

class ExtensionTester {
    constructor() {
        this.extensionPath = __dirname;
        this.requiredFiles = [
            'manifest.json',
            'popup.html',
            'popup.js'
        ];
        this.requiredIcons = [
            'icon16.png',
            'icon48.png',
            'icon128.png'
        ];
        this.testResults = [];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
        this.testResults.push({ timestamp, type, message });
    }

    async testFileExists(filePath, description) {
        try {
            await fs.access(filePath);
            this.log(`✅ ${description} 存在`, 'PASS');
            return true;
        } catch (error) {
            this.log(`❌ ${description} 不存在: ${filePath}`, 'FAIL');
            return false;
        }
    }

    async testManifestJson() {
        this.log('开始测试 manifest.json...');
        
        const manifestPath = path.join(this.extensionPath, 'manifest.json');
        const exists = await this.testFileExists(manifestPath, 'manifest.json');
        
        if (!exists) return false;

        try {
            const content = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(content);
            
            // 检查必需字段
            const requiredFields = ['manifest_version', 'name', 'version'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    this.log(`❌ manifest.json 缺少必需字段: ${field}`, 'FAIL');
                    return false;
                }
            }
            
            // 检查版本
            if (manifest.manifest_version !== 3) {
                this.log(`⚠️ manifest_version 不是 3: ${manifest.manifest_version}`, 'WARN');
            }
            
            // 检查权限
            if (manifest.permissions && manifest.permissions.length > 0) {
                this.log(`ℹ️ 扩展权限: ${manifest.permissions.join(', ')}`, 'INFO');
            }
            
            this.log(`✅ manifest.json 验证通过 - 名称: ${manifest.name}, 版本: ${manifest.version}`, 'PASS');
            return true;
            
        } catch (error) {
            this.log(`❌ manifest.json 解析失败: ${error.message}`, 'FAIL');
            return false;
        }
    }

    async testPopupFiles() {
        this.log('开始测试 popup 文件...');
        
        const popupHtmlPath = path.join(this.extensionPath, 'popup.html');
        const popupJsPath = path.join(this.extensionPath, 'popup.js');
        
        const htmlExists = await this.testFileExists(popupHtmlPath, 'popup.html');
        const jsExists = await this.testFileExists(popupJsPath, 'popup.js');
        
        if (!htmlExists || !jsExists) return false;
        
        try {
            const htmlContent = await fs.readFile(popupHtmlPath, 'utf8');
            const jsContent = await fs.readFile(popupJsPath, 'utf8');
            
            // 检查HTML内容
            if (!htmlContent.includes('Hello World')) {
                this.log('⚠️ popup.html 中未找到 "Hello World" 文本', 'WARN');
            }
            
            if (!htmlContent.includes('popup.js')) {
                this.log('⚠️ popup.html 中未引用 popup.js', 'WARN');
            }
            
            // 检查JavaScript内容
            if (!jsContent.includes('DOMContentLoaded')) {
                this.log('⚠️ popup.js 中未找到 DOMContentLoaded 事件监听器', 'WARN');
            }
            
            if (!jsContent.includes('chrome.runtime')) {
                this.log('⚠️ popup.js 中未找到 Chrome API 调用', 'WARN');
            }
            
            this.log('✅ popup 文件验证通过', 'PASS');
            return true;
            
        } catch (error) {
            this.log(`❌ popup 文件读取失败: ${error.message}`, 'FAIL');
            return false;
        }
    }

    async testIcons() {
        this.log('开始测试图标文件...');
        
        let allIconsExist = true;
        for (const icon of this.requiredIcons) {
            const iconPath = path.join(this.extensionPath, icon);
            const exists = await this.testFileExists(iconPath, icon);
            if (!exists) allIconsExist = false;
        }
        
        if (allIconsExist) {
            this.log('✅ 所有图标文件存在', 'PASS');
        } else {
            this.log('⚠️ 部分图标文件缺失，请运行 generate-icons.html 生成图标', 'WARN');
        }
        
        return allIconsExist;
    }

    async testDirectoryStructure() {
        this.log('开始测试目录结构...');
        
        try {
            const files = await fs.readdir(this.extensionPath);
            this.log(`ℹ️ 扩展目录包含 ${files.length} 个文件`, 'INFO');
            
            const missingFiles = this.requiredFiles.filter(file => !files.includes(file));
            if (missingFiles.length > 0) {
                this.log(`❌ 缺少必需文件: ${missingFiles.join(', ')}`, 'FAIL');
                return false;
            }
            
            this.log('✅ 目录结构验证通过', 'PASS');
            return true;
            
        } catch (error) {
            this.log(`❌ 无法读取扩展目录: ${error.message}`, 'FAIL');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 开始 Leven Extension 测试...');
        this.log(`📁 扩展路径: ${this.extensionPath}`);
        
        const tests = [
            this.testDirectoryStructure(),
            this.testManifestJson(),
            this.testPopupFiles(),
            this.testIcons()
        ];
        
        const results = await Promise.all(tests);
        const passedTests = results.filter(result => result === true).length;
        const totalTests = tests.length;
        
        this.log(`\n📊 测试结果总结:`);
        this.log(`✅ 通过: ${passedTests}/${totalTests}`);
        this.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
        
        if (passedTests === totalTests) {
            this.log('🎉 所有测试通过！扩展准备就绪。', 'SUCCESS');
        } else {
            this.log('⚠️ 部分测试失败，请检查上述问题。', 'WARN');
        }
        
        return passedTests === totalTests;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            extensionPath: this.extensionPath,
            testResults: this.testResults,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.type === 'PASS').length,
                failed: this.testResults.filter(r => r.type === 'FAIL').length,
                warnings: this.testResults.filter(r => r.type === 'WARN').length
            }
        };
        
        return report;
    }
}

// 运行测试
async function main() {
    const tester = new ExtensionTester();
    const success = await tester.runAllTests();
    
    if (success) {
        console.log('\n🎯 扩展测试完成，可以尝试在Flow Browser中加载此扩展！');
        console.log('📖 请参考 README.md 了解详细的安装步骤。');
    } else {
        console.log('\n🔧 请修复上述问题后重新运行测试。');
    }
    
    return success;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ExtensionTester };
