import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useState } from "react";
import { useRouter } from "@/router/provider";
import { ExternalLink } from "lucide-react";

import ExtensionCard from "./components/extension-card";
import ExtensionDetails from "./components/extension-details";
import { DeveloperMode } from "./components/developer-mode";
import { ExtensionsProvider, useExtensions } from "@/components/providers/extensions-provider";
import { toast } from "sonner";

const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/category/extensions?utm_source=ext_sidebar";

function ExtensionsPage() {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const router = useRouter();
  const selectedExtensionId = new URLSearchParams(router.search).get("id");

  const { extensions, revalidate } = useExtensions();

  const [isProcessing, setIsProcessing] = useState(false);

  const setExtensionEnabled = async (id: string, enabled: boolean) => {
    setIsProcessing(true);

    const success = await flow.extensions.setExtensionEnabled(id, enabled);
    if (success) {
      toast.success(`This extension has been successfully ${enabled ? "enabled" : "disabled"}!`);
    } else {
      toast.error(`Failed to ${enabled ? "enable" : "disable"} this extension!`);
    }

    setIsProcessing(false);
    return success;
  };

  const setExtensionPinned = async (id: string, pinned: boolean) => {
    setIsProcessing(true);

    const success = await flow.extensions.setExtensionPinned(id, pinned);
    if (success) {
      toast.success(`This extension has been successfully ${pinned ? "pinned" : "unpinned"}!`);
    } else {
      toast.error(`Failed to ${pinned ? "pin" : "unpin"} this extension!`);
    }

    setIsProcessing(false);
    return success;
  };

  const handleDetailsClick = (id: string) => {
    window.history.pushState(null, "", `/?id=${id}`);
  };

  const handleBack = () => {
    window.history.pushState(null, "", "/");
  };

  const handleExtensionLoaded = () => {
    // 重新加载扩展列表
    revalidate();
  };

  const selectedExtension = extensions.find((ext) => ext.id === selectedExtensionId);

  return (
    <div className="w-screen h-screen bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {!selectedExtension ? (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">Flow Extensions</h1>
                  <p className="text-muted-foreground mt-1">Manage your browser extensions</p>
                </div>
                <a
                  href={CHROME_WEB_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Button variant="outline" className="gap-2">
                    <ExternalLink size={16} />
                    Get more extensions
                  </Button>
                </a>
              </div>
            </div>

            <Card className="border-border">
              <CardContent>
                <DeveloperMode 
                  isDeveloperMode={isDeveloperMode}
                  onDeveloperModeChange={setIsDeveloperMode}
                  onExtensionLoaded={handleExtensionLoaded}
                />

                {extensions.length > 0 ? (
                  <div className="space-y-2">
                    {extensions.map((extension) => (
                      <ExtensionCard
                        key={extension.id}
                        extension={extension}
                        isProcessing={isProcessing}
                        setExtensionEnabled={setExtensionEnabled}
                        onDetailsClick={handleDetailsClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium mb-2">No extensions installed</h3>
                    <p className="text-muted-foreground mb-6">Install extensions to enhance your browsing experience</p>
                    <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer">
                      <Button className="gap-2">
                        <ExternalLink size={16} />
                        Browse Chrome Web Store
                      </Button>
                    </a>
                  </div>
                )}

                <div className="mt-8 text-center py-4 border-t border-border">
                  <a
                    href={CHROME_WEB_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1"
                  >
                    <ExternalLink size={14} />
                    Browse more extensions on Chrome Web Store
                  </a>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <ExtensionDetails 
            extension={selectedExtension} 
            isDeveloperMode={isDeveloperMode}
            isProcessing={isProcessing}
            setExtensionEnabled={setExtensionEnabled}
            setExtensionPinned={setExtensionPinned}
            onBack={handleBack} 
          />
        )}
      </motion.div>
    </div>
  );
}

function App() {
  return (
    <>
      <title>Extensions</title>
      <ExtensionsProvider>
        <ExtensionsPage />
      </ExtensionsProvider>
    </>
  );
}

export default App;

