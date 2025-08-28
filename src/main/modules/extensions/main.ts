import { getSessionWithoutCreating } from "@/browser/sessions";
import { app, protocol, Session, session } from "electron";
import { ElectronChromeExtensions, setPartitionSessionGrabber } from "electron-chrome-extensions";

// A hack to load profiles rather than partitions
const partitionSessionGrabber = (partition: string) => {
  // custom: grab the session from the profile
  const PROFILE_PREFIX = "profile:";
  if (partition.startsWith(PROFILE_PREFIX)) {
    const profileId = partition.slice(PROFILE_PREFIX.length);
    const session = getSessionWithoutCreating(profileId);
    if (session) {
      return session;
    } else {
      throw new Error(`Session not found for profile ${profileId}`);
    }
  }

  return session.fromPartition(partition);
};

setPartitionSessionGrabber(partitionSessionGrabber);

// Register CRX protocol in default session
app.whenReady().then(() => {
  protocol.handle("crx", async (request) => {
    const url = URL.parse(request.url);

    if (!url) {
      return new Response("Invalid URL", { status: 404 });
    }

    const partition = url?.searchParams.get("partition");

    if (!partition) {
      return new Response("No partition", { status: 400 });
    }

    let session: Session | null = null;
    try {
      session = partitionSessionGrabber(partition);
    } catch {
      // Not found, return 404 below
    }

    if (!session) {
      return new Response("Session not found", { status: 404 });
    }

    const extensions = ElectronChromeExtensions.fromSession(session);

    if (!extensions) {
      return new Response("Extensions not found", { status: 404 });
    }

    return extensions.handleCrxRequest(request);
  });
});
