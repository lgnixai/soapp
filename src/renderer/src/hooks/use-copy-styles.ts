import { useEffect } from "react";

/**
 * Custom hook to copy styles from main document to a container window
 */
export function useCopyStyles(containerWin: Window | null) {
  useEffect(() => {
    if (!containerWin) return;

    const containerDoc = containerWin.document;

    // Copy all styles from the current document to the new window
    const copyStyles = () => {
      // Get current styles from main document and portal
      const mainStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
      const portalStyles = containerDoc.querySelectorAll('style, link[rel="stylesheet"]');

      // Track which styles we've processed
      const processedPortalStyles = new Set();

      // For each style in the main document
      mainStyles.forEach((mainStyle) => {
        // For style tags, check by content
        if (mainStyle.tagName.toLowerCase() === "style") {
          const mainContent = mainStyle.textContent || "";
          let found = false;

          // Look for matching style tag in portal
          for (let i = 0; i < portalStyles.length; i++) {
            const portalStyle = portalStyles[i];
            if (
              !processedPortalStyles.has(i) &&
              portalStyle.tagName.toLowerCase() === "style" &&
              portalStyle.textContent === mainContent
            ) {
              // Mark as processed
              processedPortalStyles.add(i);
              found = true;
              break;
            }
          }

          // If not found, add it
          if (!found) {
            const clonedStyle = mainStyle.cloneNode(true) as HTMLElement;
            containerDoc.head.appendChild(clonedStyle);
          }
        }
        // For link tags, check by href attribute
        else if (mainStyle.tagName.toLowerCase() === "link") {
          const mainHref = mainStyle.getAttribute("href");
          const mainRel = mainStyle.getAttribute("rel");
          let found = false;

          // Only process stylesheet links
          if (mainRel === "stylesheet" && mainHref) {
            // Look for matching link in portal
            for (let i = 0; i < portalStyles.length; i++) {
              const portalStyle = portalStyles[i];
              if (
                !processedPortalStyles.has(i) &&
                portalStyle.tagName.toLowerCase() === "link" &&
                portalStyle.getAttribute("href") === mainHref
              ) {
                // Update attributes if needed
                const mainMedia = mainStyle.getAttribute("media");
                const portalMedia = portalStyle.getAttribute("media");
                if (mainMedia !== portalMedia) {
                  portalStyle.setAttribute("media", mainMedia || "");
                }

                const mainDisabled = mainStyle.getAttribute("disabled");
                const portalDisabled = portalStyle.getAttribute("disabled");
                if (mainDisabled !== portalDisabled) {
                  if (mainDisabled) {
                    portalStyle.setAttribute("disabled", mainDisabled);
                  } else {
                    portalStyle.removeAttribute("disabled");
                  }
                }

                // Mark as processed
                processedPortalStyles.add(i);
                found = true;
                break;
              }
            }

            // If not found, add it
            if (!found) {
              const clonedStyle = mainStyle.cloneNode(true) as HTMLElement;
              containerDoc.head.appendChild(clonedStyle);
            }
          }
        }
      });

      // Remove any portal styles that don't exist in the main document
      for (let i = 0; i < portalStyles.length; i++) {
        if (!processedPortalStyles.has(i)) {
          portalStyles[i].remove();
        }
      }
    };

    // Initial style copy
    copyStyles();

    // Set up a MutationObserver to watch for style changes in the main document
    const styleObserver = new MutationObserver(() => {
      if (containerWin && !containerWin.closed) {
        copyStyles();
      }
    });

    // Observe the document head for changes to styles
    styleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "media", "disabled"],
      characterData: true // Add this to observe text content changes in <style> tags
    });

    // Clean up observer when component unmounts
    return () => {
      styleObserver.disconnect();
    };
  }, [containerWin]);
}
