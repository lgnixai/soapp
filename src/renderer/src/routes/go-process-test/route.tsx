import React, { useState, useEffect } from "react";

interface GoProcessStatus {
  isRunning: boolean;
  processId: number | null;
}

export default function GoProcessTestPage() {
  const [status, setStatus] = useState<GoProcessStatus>({
    isRunning: false,
    processId: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const checkStatus = async () => {
    try {
      const result = await window.electronAPI.invoke("go-process:status");
      setStatus(result);
    } catch (error) {
      setMessage(`检查状态失败: ${error}`);
    }
  };

  const startProcess = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("go-process:start");
      if (result.success) {
        setMessage("Go进程启动成功");
        await checkStatus();
      } else {
        setMessage(`启动失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`启动失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const stopProcess = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("go-process:stop");
      if (result.success) {
        setMessage("Go进程停止成功");
        await checkStatus();
      } else {
        setMessage(`停止失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`停止失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const restartProcess = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await window.electronAPI.invoke("go-process:restart");
      if (result.success) {
        setMessage("Go进程重启成功");
        await checkStatus();
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
    checkStatus();
    // 定期检查状态
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Go进程管理测试</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">进程状态</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium">运行状态:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-sm ${
                status.isRunning ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {status.isRunning ? "运行中" : "已停止"}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-medium">进程ID:</span>
            <span className="ml-2 text-gray-600">{status.processId || "无"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={startProcess}
            disabled={loading || status.isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "启动中..." : "启动进程"}
          </button>

          <button
            onClick={stopProcess}
            disabled={loading || !status.isRunning}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "停止中..." : "停止进程"}
          </button>

          <button
            onClick={restartProcess}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "重启中..." : "重启进程"}
          </button>

          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            刷新状态
          </button>
        </div>

        {message && <div className="p-3 bg-blue-100 border border-blue-300 rounded text-blue-800">{message}</div>}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">说明</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 此页面用于测试Go进程的启动、停止和重启功能</li>
          <li>• 进程状态每2秒自动刷新一次</li>
          <li>• 应用退出时会自动停止Go进程</li>
          <li>• 如果进程无法正常停止，会在5秒后强制杀掉</li>
        </ul>
      </div>
    </div>
  );
}
