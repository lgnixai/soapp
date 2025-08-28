import { OnboardingAdvanceCallback } from "@/components/onboarding/main";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { BackgroundGradientEditor } from "@/components/settings/sections/spaces/theme-editors/background-gradient";
import type { Space } from "~/flow/interfaces/sessions/spaces";

export function OnboardingSpaceColors({
  advance,
  profileId,
  spaceId
}: {
  advance: OnboardingAdvanceCallback;
  profileId: string;
  spaceId: string;
}) {
  const [spaceData, setSpaceData] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load current space data
  useEffect(() => {
    const loadSpaceData = async () => {
      if (!profileId || !spaceId) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const spaces = await flow.spaces.getSpacesFromProfile(profileId);
        const space = spaces.find((s) => s.id === spaceId);

        if (space) {
          // Set default colors if they don't exist
          if (!space.bgStartColor) space.bgStartColor = "#4285F4";
          if (!space.bgEndColor) space.bgEndColor = "#34A853";

          setSpaceData(space);
        }
      } catch (error) {
        console.error("Failed to load space data:", error);
        setErrorMessage("Couldn't load space data");
      } finally {
        setIsLoading(false);
      }
    };

    loadSpaceData();
  }, [profileId, spaceId]);

  // Update space with new data
  const updateSpaceData = (updates: Partial<Space>) => {
    if (spaceData) {
      setSpaceData({ ...spaceData, ...updates });
    }
  };

  // Save the space colors
  const saveColors = async () => {
    if (!profileId || !spaceId || !spaceData || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await flow.spaces.updateSpace(profileId, spaceId, {
        bgStartColor: spaceData.bgStartColor,
        bgEndColor: spaceData.bgEndColor
      });

      // Set as current space
      await flow.spaces.setUsingSpace(profileId, spaceId);

      setSaveSuccess(true);

      // Automatically advance after short delay
      setTimeout(() => {
        advance();
      }, 1000);
    } catch (error) {
      console.error("Failed to save space colors:", error);
      setErrorMessage("Couldn't save space colors. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        className="relative z-10 text-center max-w-2xl px-4 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Choose Colors</h1>
        <p className="text-gray-400 text-base">Select a background gradient for your space</p>
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-2xl px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-56">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-white">Loading...</span>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <AlertCircle className="h-10 w-10 text-amber-400 mb-3" />
            <div className="text-white text-lg font-medium mb-1">Something went wrong</div>
            <div className="text-gray-400 max-w-md mb-4">{errorMessage}</div>
            <Button
              onClick={advance}
              className="remove-app-drag cursor-pointer px-6 py-2 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white backdrop-blur-md border border-[#0066FF]/30"
            >
              Skip & Continue
            </Button>
          </div>
        ) : saveSuccess ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
            <div className="text-white text-lg font-medium mb-1">Colors Saved!</div>
            <div className="text-gray-400 max-w-md mb-4">Your space is ready to use!</div>
          </div>
        ) : spaceData ? (
          <div className="overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-5 remove-app-drag">
            {/* Use the BackgroundGradientEditor component */}
            <BackgroundGradientEditor editedSpace={spaceData} updateEditedSpace={updateSpaceData} />

            {/* Save Button */}
            <div className="pt-4 flex justify-center">
              <Button
                onClick={saveColors}
                disabled={isSaving}
                className="remove-app-drag cursor-pointer px-8 py-2 bg-[#0066FF] hover:bg-[#0055DD] text-white backdrop-blur-md border border-[#0066FF]/50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Colors"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Bottom skip button */}
      {!isLoading && !errorMessage && !saveSuccess && spaceData && (
        <div className="my-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          >
            <Button
              onClick={advance}
              variant="ghost"
              className="remove-app-drag cursor-pointer text-white/70 hover:text-white"
            >
              Skip
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}
