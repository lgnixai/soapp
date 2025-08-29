import React, { useState, useEffect } from "react";
import { AppStatus, AppsConfig } from "@/shared/types/apps-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, RotateCcw, Settings, RefreshCw } from "lucide-react";

function formatUptime(startTime?: Date | string | null) {
  if (!startTime) return "";
  const started = typeof startTime === "string" ? new Date(startTime) : startTime;
  const diffMs = Date.now() - started.getTime();
  if (diffMs <= 0) return "0s";
  const sec = Math.floor(diffMs / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [] as string[];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export default function AppsManagerPage() {
  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([]);
  const [config, setConfig] = useState<AppsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const reloadConfig = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("apps-manager:reload-config");
      if (!result.success) setMessage(`重载失败: ${result.error}`);
      await refreshConfig();
      await refreshStatuses();
    } catch (error) {
      setMessage(`重载失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const startSelected = async () => {
    setLoading(true);
    try {
      await Promise.all([...selectedIds].map((id) => window.electronAPI.invoke("apps-manager:start-app", id)));
      await refreshStatuses();
    } finally {
      setLoading(false);
    }
  };

  const stopSelected = async () => {
    setLoading(true);
    try {
      await Promise.all([...selectedIds].map((id) => window.electronAPI.invoke("apps-manager:stop-app", id)));
      await refreshStatuses();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatuses();
    refreshConfig();
    const interval = setInterval(refreshStatuses, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "unhealthy":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRunningColor = (isRunning: boolean) => {
    return isRunning ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allSelected = appStatuses.length > 0 && selectedIds.size === appStatuses.length;
  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(appStatuses.map((s) => s.id)));
    else setSelectedIds(new Set());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">应用程序管理器</h1>
        <div className="flex gap-2">
          <Button onClick={startSelected} disabled={loading || selectedIds.size === 0}>
            Start Select
          </Button>
          <Button onClick={stopSelected} variant="outline" disabled={loading || selectedIds.size === 0}>
            Stop Select
          </Button>
          <Button onClick={reloadConfig} variant="outline" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
        </div>
      </div>

      <div className="mb-8 overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900/40">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
              </th>
              <th className="px-3 py-2 text-left">Program</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {appStatuses.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={(e) => toggleSelect(s.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">{s.name || s.id}</td>
                <td className="px-3 py-2">
                  <Badge className={getRunningColor(s.isRunning)}>{s.isRunning ? "RUNNING" : "STOPPED"}</Badge>
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {s.isRunning ? `pid ${s.pid ?? "-"}, uptime ${formatUptime(s.startTime)}` : "-"}
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <Button size="sm" disabled={loading || s.isRunning} onClick={() => startApp(s.id)}>
                    Start
                  </Button>
                  <Button size="sm" variant="outline" disabled={loading || !s.isRunning} onClick={() => stopApp(s.id)}>
                    Stop
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => restartApp(s.id)} title="Restart">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {appStatuses.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  暂无应用
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">配置</TabsTrigger>
          <TabsTrigger value="details">详细信息</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {appStatuses.map((status) => (
            <Card key={status.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {status.name}
                </CardTitle>
                <CardDescription>详细状态信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div>应用ID：{status.id}</div>
                <div>进程ID：{status.pid ?? "无"}</div>
                <div>运行状态：{status.isRunning ? "运行中" : "已停止"}</div>
                <div>健康状态：{status.healthStatus}</div>
                <div>启动时间：{status.startTime ? new Date(status.startTime).toLocaleString() : "无"}</div>
                <div>重启次数：{status.restartCount}</div>
                <div>
                  最后健康检查：{status.lastHealthCheck ? new Date(status.lastHealthCheck).toLocaleString() : "无"}
                </div>
                {status.error && <div className="text-red-600">错误：{status.error}</div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle>全局配置</CardTitle>
                <CardDescription>系统级配置参数</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>版本：{config.version}</div>
                <div>最大并发应用：{config.global.maxConcurrentApps}</div>
                <div>默认超时：{config.global.defaultTimeout}ms</div>
                <div>自动重启：{config.global.autoRestartEnabled ? "启用" : "禁用"}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {message && (
        <div className="fixed bottom-4 right-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-800 max-w-md">
          {message}
        </div>
      )}
    </div>
  );
}
