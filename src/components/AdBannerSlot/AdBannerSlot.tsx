import { useEffect, useRef, useState } from "react";
import "./AdBannerSlot.css";

type AdBannerSlotProps = {
  slotId?: string;
  placement: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_SCRIPT_ID = "plink-adsense-script";
let adsenseLoadPromise: Promise<void> | null = null;

function loadAdSense(clientId: string) {
  if (adsenseLoadPromise) return adsenseLoadPromise;

  adsenseLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      ADSENSE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AdSense script."));
    document.head.appendChild(script);
  });

  return adsenseLoadPromise;
}

const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID?.trim();
const showAdSlots = import.meta.env.VITE_SHOW_AD_SLOTS === "true";
const showPlaceholder =
  import.meta.env.DEV ||
  import.meta.env.VITE_SHOW_AD_PLACEHOLDERS === "true";

export function AdBannerSlot({ slotId, placement }: AdBannerSlotProps) {
  if (!showAdSlots) return null;

  const adRef = useRef<HTMLModElement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const trimmedSlotId = slotId?.trim();
  const canRenderLiveAd = Boolean(adsenseClientId && trimmedSlotId);

  useEffect(() => {
    if (!canRenderLiveAd || !adRef.current) return;

    let cancelled = false;

    loadAdSense(adsenseClientId!)
      .then(() => {
        if (cancelled || !adRef.current) return;

        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch {
          if (!cancelled) setLoadFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [canRenderLiveAd]);

  if (!canRenderLiveAd && !showPlaceholder) return null;

  return (
    <section
      className={`adBannerSlot${loadFailed ? " adBannerSlot--fallback" : ""}`}
      aria-label={`${placement} ad placement`}
    >
      {canRenderLiveAd && !loadFailed ? (
        <ins
          ref={adRef}
          className="adsbygoogle adBannerSlot__unit"
          data-ad-client={adsenseClientId}
          data-ad-format="auto"
          data-ad-slot={trimmedSlotId}
          data-full-width-responsive="false"
          style={{ display: "block" }}
        />
      ) : (
        <div className="adBannerSlot__placeholder">
          <span>Ad</span>
        </div>
      )}
    </section>
  );
}
