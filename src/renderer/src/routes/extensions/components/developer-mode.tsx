import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FolderOpen, Package, RefreshCw } from "lucide-react";

interface DeveloperModeProps {
  isDeveloperMode: boolean;
  onDeveloperModeChange: (enabled: boolean) => void;
  onExtensionLoaded?: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
    };
  }
}

export function DeveloperMode({ isDeveloperMode, onDeveloperModeChange, onExtensionLoaded }: DeveloperModeProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadUnpacked = async () => {
    try {
      setIsLoading(true);
      
      // 使用Electron的dialog API来选择文件夹
      const result = await window.electronAPI?.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择扩展文件夹'
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const extensionPath = result.filePaths[0];
        
        const response = await flow.extensions.loadUnpackedExtension(extensionPath);
        
        if (response.success) {
          toast.success(`扩展加载成功: ${response.extensionId}`);
          onExtensionLoaded?.();
        } else {
          toast.error(`扩展加载失败: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('加载扩展时出错:', error);
      toast.error('加载扩展时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackExtension = () => {
    toast.info('打包扩展功能即将推出');
  };

  const handleUpdateExtension = () => {
    toast.info('更新扩展功能即将推出');
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={isDeveloperMode}
            onCheckedChange={onDeveloperModeChange}
            id="developer-mode"
          />
          <label
            htmlFor="developer-mode"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            开发者模式
          </label>
        </div>
      </div>
      
      {isDeveloperMode && (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadUnpacked}
            disabled={isLoading}
            className="gap-2"
          >
            <FolderOpen size={16} />
            {isLoading ? '加载中...' : '加载扩展'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePackExtension}
            className="gap-2"
          >
            <Package size={16} />
            打包扩展
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpdateExtension}
            className="gap-2"
          >
            <RefreshCw size={16} />
            更新
          </Button>
        </div>
      )}
    </div>
  );
}
