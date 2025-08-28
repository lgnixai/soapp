import { PlatformConsumer } from "@/components/main/platform";
import { usePortalsProvider } from "@/components/portal/provider";
import { useBoundingRect } from "@/hooks/use-bounding-rect";
import { useCopyStyles } from "@/hooks/use-copy-styles";
import { mergeRefs } from "@/lib/merge-refs";
import { cn } from "@/lib/utils";
import { createContext, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

const DEFAULT_Z_INDEX = 3;

interface PortalComponentProps extends React.ComponentProps<"div"> {
  visible?: boolean;
  zIndex?: number;
}

type PortalContextValue = {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
};

const PortalContext = createContext<PortalContextValue>({
  x: null,
  y: null,
  width: null,
  height: null
});

export function usePortalContext() {
  const context = useContext(PortalContext);
  return context;
}

export function PortalComponent({
  visible = true,
  zIndex = DEFAULT_Z_INDEX,
  className,
  children,
  ref,
  ...args
}: PortalComponentProps) {
  const { usePortal } = usePortalsProvider();
  const portal = usePortal();

  const holderRef = useRef<HTMLDivElement>(null);
  const mergedRef = mergeRefs([ref, holderRef]);

  const boundsRect = useBoundingRect(holderRef);
  const bounds = useMemo(() => {
    return {
      x: Math.round(boundsRect?.x ?? 0),
      y: Math.round(boundsRect?.y ?? 0),
      width: Math.round(boundsRect?.width ?? 0),
      height: Math.round(boundsRect?.height ?? 0)
    };
  }, [boundsRect]);

  // Copy styles from parent window to portal window
  useCopyStyles(portal?.window ?? null);

  const portalChildren = useMemo(() => {
    const contextValue: PortalContextValue = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };

    return (
      <PortalContext.Provider key="portal-context" value={contextValue}>
        <PlatformConsumer>
          <div key="portal-children" className="w-screen h-screen">
            {children}
          </div>
        </PlatformConsumer>
      </PortalContext.Provider>
    );
  }, [children, bounds]);

  // Update visibility of the portal
  useMemo(() => {
    if (!portal?.window || portal.window.closed) return;

    try {
      flow.interface.setComponentWindowVisible(portal.id, visible);
    } catch (error) {
      console.warn("Failed to set portal visibility:", error);
    }
  }, [portal, visible]);

  // Update z-index of the portal
  useMemo(() => {
    if (!portal?.window || portal.window.closed) return;

    try {
      flow.interface.setComponentWindowZIndex(portal.id, zIndex);
    } catch (error) {
      console.warn("Failed to set portal z-index:", error);
    }
  }, [portal, zIndex]);

  // Update bounds of the portal
  useMemo(() => {
    if (!portal?.window || portal.window.closed) return;
    if (!bounds) return;

    try {
      flow.interface.setComponentWindowBounds(portal.id, {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    } catch (error) {
      console.warn("Failed to set portal bounds:", error);
    }
  }, [portal, bounds]);

  const sizer = createPortal(
    <div {...args} ref={mergedRef} className={cn("pointer-events-none", className)} />,
    window.document.body,
    "portal-sizer"
  );

  const wrapper =
    portal &&
    portal.window &&
    !portal.window.closed &&
    createPortal(portalChildren, portal.window.document.body, "portal-wrapper");

  return (
    <>
      {sizer}
      {wrapper}
    </>
  );
}
