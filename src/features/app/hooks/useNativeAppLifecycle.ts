import { useEffect } from "react";
import { App as CapacitorApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  NATIVE_AUTH_CALLBACK_URL,
  PASSWORD_RECOVERY_EVENT,
  isNativeApp,
} from "../../../lib/nativePlatform";
import { supabase } from "../../../lib/supabase";

const handledAuthCallbackUrls = new Set<string>();

function readCallbackParams(url: URL) {
  const params = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

function isAuthCallback(url: URL) {
  const expected = new URL(NATIVE_AUTH_CALLBACK_URL);
  return (
    url.protocol === expected.protocol &&
    url.hostname === expected.hostname &&
    url.pathname === expected.pathname
  );
}

function reportAuthError(message: string) {
  window.dispatchEvent(
    new CustomEvent("plink:auth-error", { detail: message }),
  );
}

async function handleAuthCallback(event: URLOpenListenerEvent) {
  if (!supabase) return;

  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return;
  }
  if (!isAuthCallback(url)) return;
  if (handledAuthCallbackUrls.has(url.toString())) return;
  handledAuthCallbackUrls.add(url.toString());
  if (handledAuthCallbackUrls.size > 20) {
    const oldestUrl = handledAuthCallbackUrls.values().next().value;
    if (oldestUrl) handledAuthCallbackUrls.delete(oldestUrl);
  }

  const params = readCallbackParams(url);
  const authError = params.get("error_description") ?? params.get("error");
  if (authError) {
    reportAuthError(authError);
    await Browser.close().catch(() => undefined);
    return;
  }

  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      reportAuthError(error.message);
      await Browser.close().catch(() => undefined);
      return;
    }
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      reportAuthError(error.message);
      await Browser.close().catch(() => undefined);
      return;
    }
  } else {
    reportAuthError("The sign-in callback did not contain a session.");
    await Browser.close().catch(() => undefined);
    return;
  }

  if (params.get("flow") === "recovery" || params.get("type") === "recovery") {
    window.dispatchEvent(new Event(PASSWORD_RECOVERY_EVENT));
  }

  await Browser.close().catch(() => undefined);
}

export function useNativeAppLifecycle() {
  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add("is-native-app");
    void StatusBar.setStyle({ style: Style.Light });
    void StatusBar.setOverlaysWebView({ overlay: false });

    let disposed = false;
    const listenerHandles = Promise.all([
      CapacitorApp.addListener("appUrlOpen", (event) => {
        void handleAuthCallback(event);
      }),
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) window.dispatchEvent(new Event("plink:app-resumed"));
      }),
    ]);

    void CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (!disposed && launchUrl?.url) {
        void handleAuthCallback({ url: launchUrl.url });
      }
    });

    return () => {
      disposed = true;
      document.documentElement.classList.remove("is-native-app");
      void listenerHandles.then((handles) => {
        handles.forEach((handle) => void handle.remove());
      });
    };
  }, []);
}
