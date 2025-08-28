import { setupInterceptRules } from "@/browser/utility/intercept-rules";
import { registerFlowInternalProtocol } from "@/browser/utility/protocols/_protocols/flow-internal";
import { registerPreloadScript, registerProtocolsWithSession } from "@/browser/utility/protocols/index";
import { debugPrint } from "@/modules/output";
import { sleep } from "@/modules/utils";
import { setAlwaysOpenExternal, shouldAlwaysOpenExternal } from "@/saving/open-external";
import { getProfilePath } from "@/sessions/profiles";
import { app, dialog, OpenExternalPermissionRequest, session, Session } from "electron";

const sessions: Map<string, Session> = new Map();

function registerCallbacksWithSession(session: Session) {
  session.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    debugPrint("PERMISSIONS", "permission request", webContents?.getURL() || "unknown-url", permission);

    if (permission === "openExternal") {
      const openExternalDetails = details as OpenExternalPermissionRequest;

      const requestingURL = openExternalDetails.requestingUrl;
      const externalURL = openExternalDetails.externalURL;

      if (openExternalDetails.externalURL) {
        const shouldAlwaysOpen = await shouldAlwaysOpenExternal(requestingURL, openExternalDetails.externalURL);
        if (shouldAlwaysOpen) {
          callback(true);
          return;
        }
      }

      const externalAppName =
        app.getApplicationNameForProtocol(openExternalDetails.externalURL ?? "") || "an unknown application";

      const url = new URL(openExternalDetails.requestingUrl);
      const minifiedUrl = `${url.protocol}//${url.host}`;

      dialog
        .showMessageBox({
          message: `"${minifiedUrl}" wants to open "${externalAppName}".`,
          buttons: ["Cancel", "Open", "Always Open"]
        })
        .then((response) => {
          switch (response.response) {
            case 2:
              if (externalURL) {
                setAlwaysOpenExternal(requestingURL, externalURL);
              }
            /* falls through */
            case 1:
              callback(true);
              break;
            case 0:
              callback(false);
              break;
          }
        });

      return;
    }

    callback(true);
  });
}

function createSession(profileId: string) {
  const profileSessionPath = getProfilePath(profileId);
  const profileSession = session.fromPath(profileSessionPath);

  registerProtocolsWithSession(profileSession);
  registerCallbacksWithSession(profileSession);

  setupInterceptRules(profileSession);
  registerPreloadScript(profileSession);

  return profileSession;
}

export function getSessionWithoutCreating(profileId: string): Session | undefined {
  return sessions.get(profileId);
}

export function getSession(profileId: string): Session {
  if (!sessions.has(profileId)) {
    const newSession = createSession(profileId);
    sessions.set(profileId, newSession);
  }

  return sessions.get(profileId) as Session;
}

export const defaultSessionReady = app.whenReady().then(async () => {
  const defaultSession = session.defaultSession;

  registerProtocolsWithSession(defaultSession);
  registerFlowInternalProtocol(defaultSession.protocol);

  setupInterceptRules(defaultSession);
  registerPreloadScript(defaultSession);

  // wait for 50 ms before returning
  return await sleep(50);
});
