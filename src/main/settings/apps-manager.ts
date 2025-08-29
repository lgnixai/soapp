import { BrowserWindow, nativeTheme } from "electron";
import { registerWindow, WindowType } from "@/modules/windows";
import { defaultSessionReady } from "@/browser/sessions";

let appsManagerBrowserWindow: BrowserWindow | null = null;

async function createAppsManagerWindow() {
  // wait for the default session to be ready so it can use flow-internal protocol
  await defaultSessionReady;

  // create the window
  const window = new BrowserWindow({
    width: 1200,
    minWidth: 800,
    height: 800,
    minHeight: 600,
    center: true,
    show: false,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay: {
      height: 40,
      symbolColor: nativeTheme.shouldUseDarkColors ? "white" : "black",
      color: "rgba(0,0,0,0)"
    },
    roundedCorners: true
  });

  window.loadURL("flow-internal://apps-manager/");

  window.on("closed", () => {
    appsManagerBrowserWindow = null;
  });

  registerWindow(WindowType.SETTINGS, "apps-manager", window);
  appsManagerBrowserWindow = window;

  return await new Promise((resolve) => {
    window.once("ready-to-show", () => {
      resolve(window);
    });
  });
}

export const appsManagerWindow = {
  show: async () => {
    if (!appsManagerBrowserWindow) {
      await createAppsManagerWindow();
    }

    if (!appsManagerBrowserWindow) return;

    appsManagerBrowserWindow.show();
    appsManagerBrowserWindow.focus();
  },
  hide: () => {
    if (!appsManagerBrowserWindow) return;

    appsManagerBrowserWindow.blur();
    appsManagerBrowserWindow.hide();
  },
  isVisible: () => {
    if (!appsManagerBrowserWindow) return false;

    return appsManagerBrowserWindow.isVisible();
  },
  toggle: () => {
    if (!appsManagerBrowserWindow) return;

    if (appsManagerBrowserWindow.isVisible()) {
      appsManagerBrowserWindow.hide();
    } else {
      appsManagerBrowserWindow.show();
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage: (channel: string, ...args: any[]) => {
    if (!appsManagerBrowserWindow) return;

    appsManagerBrowserWindow.webContents.send(channel, ...args);
  }
};
