import React, { useState, useEffect } from "react";
import { AppStatus, AppsConfig } from "@/shared/types/apps-config";

export default function AppsManagerTestPage() {
  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([]);
  const [config, setConfig] = useState<AppsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refreshStatuses = async () => {
    try {
      const statuses = await window.electronAPI.invoke("apps-manager:get-all-statuses");
      setAppStatuses(statuses);
    } catch (error) {
      setMessage(`获取状态失败: ${error}`);
    }
  };

  const refreshConfig = async () => {
    try {
      const configData = await window.electronAPI.invoke("apps-manager:get-config");
      setConfig(configData);
    } catch (error) {
      setMessage(`获取配置失败: ${error}`);
    }
  };

  const startApp = async (appId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("apps-manager:start-app", appId);
      if (result.success) {
        setMessage(`应用 ${appId} 启动成功`);
        await refreshStatuses();
      } else {
        setMessage(`启动失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`启动失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const stopApp = async (appId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("apps-manager:stop-app", appId);
      if (result.success) {
        setMessage(`应用 ${appId} 停止成功`);
        await refreshStatuses();
      } else {
        setMessage(`停止失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`停止失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const restartApp = async (appId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("apps-manager:restart-app", appId);
      if (result.success) {
        setMessage(`应用 ${appId} 重启成功`);
        await refreshStatuses();
      } else {
        setMessage(`重启失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`重启失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatuses();
    refreshConfig();
    // 定期刷新状态
    const interval = setInterval(refreshStatuses, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRunningColor = (isRunning: boolean) => {
    return isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">应用程序管理器测试</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 应用程序状态 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">应用程序状态</h2>
          <div className="space-y-4">
            {appStatuses.map((status) => (
              <div key={status.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{status.name}</h3>
                    <p className="text-sm text-gray-600">ID: {status.id}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${getRunningColor(status.isRunning)}`}>
                      {status.isRunning ? '运行中' : '已停止'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status.healthStatus)}`}>
                      {status.healthStatus}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div>PID: {status.pid || '无'}</div>
                  <div>重启次数: {status.restartCount}</div>
                  <div>启动时间: {status.startTime ? new Date(status.startTime).toLocaleString() : '无'}</div>
                  <div>健康检查: {status.lastHealthCheck ? new Date(status.lastHealthCheck).toLocaleString() : '无'}</div>
                </div>

                {status.error && (
                  <div className="text-red-600 text-sm mb-3">
                    错误: {status.error}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => startApp(status.id)}
                    disabled={loading || status.isRunning}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    启动
                  </button>
                  <button
                    onClick={() => stopApp(status.id)}
                    disabled={loading || !status.isRunning}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    停止
                  </button>
                  <button
                    onClick={() => restartApp(status.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    重启
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 配置信息 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">配置信息</h2>
          {config ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">全局配置</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>版本: {config.version}</div>
                  <div>描述: {config.description}</div>
                  <div>最大并发应用: {config.global.maxConcurrentApps}</div>
                  <div>默认超时: {config.global.defaultTimeout}ms</div>
                  <div>自动重启: {config.global.autoRestartEnabled ? '启用' : '禁用'}</div>
                  <div>健康检查: {config.global.healthCheckEnabled ? '启用' : '禁用'}</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium">应用程序配置</h3>
                <div className="space-y-2">
                  {Object.entries(config.apps).map(([appId, appConfig]) => (
                    <div key={appId} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-medium">{appConfig.name}</h4>
                          <p className="text-sm text-gray-600">{appConfig.description}</p>
                        </div>
                        <div className="flex space-x-1">
                          <span className={`px-2 py-1 rounded text-xs ${appConfig.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {appConfig.enabled ? '启用' : '禁用'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${appConfig.autostart ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {appConfig.autostart ? '自启动' : '手动'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>端口: {appConfig.web.port}</div>
                        <div>URL: {appConfig.web.url}</div>
                        <div>类型: {appConfig.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">配置加载中...</div>
          )}
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={refreshStatuses}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          刷新状态
        </button>
        <button
          onClick={refreshConfig}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          刷新配置
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-800">
          {message}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">说明</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 此页面用于测试应用程序管理器的功能</li>
          <li>• 应用程序状态每2秒自动刷新一次</li>
          <li>• 应用退出时会自动停止所有应用程序</li>
          <li>• 支持健康检查、自动重启、错误处理等功能</li>
          <li>• 配置文件位于 apps/apps-config.json</li>
        </ul>
      </div>
    </div>
  );
}
