import { useEffect } from "react";
import { App as CapacitorApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Keyboard } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  NATIVE_AUTH_CALLBACK_URL,
  NATIVE_AUTH_COMPLETED_EVENT,
  NATIVE_BROWSER_DISMISSED_EVENT,
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

async function closeAuthBrowser() {
  await Browser.close().catch(() => undefined);
  window.dispatchEvent(new Event(NATIVE_BROWSER_DISMISSED_EVENT));
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
    await closeAuthBrowser();
    return;
  }

  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      reportAuthError(error.message);
      await closeAuthBrowser();
      return;
    }
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      reportAuthError(error.message);
      await closeAuthBrowser();
      return;
    }
  } else {
    reportAuthError("The sign-in callback did not contain a session.");
    await closeAuthBrowser();
    return;
  }

  if (params.get("flow") === "recovery" || params.get("type") === "recovery") {
    window.dispatchEvent(new Event(PASSWORD_RECOVERY_EVENT));
  } else {
    window.dispatchEvent(new Event(NATIVE_AUTH_COMPLETED_EVENT));
  }

  await closeAuthBrowser();
}

async function configureNativeStatusBar(forceWebViewResize = false) {
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: "#0b1015" });

  // A full-screen SFSafariViewController can reset the WKWebView frame when it
  // is dismissed while the StatusBar plugin still believes overlay is off.
  // Toggling the value forces Capacitor to calculate the non-overlaid frame
  // again instead of returning early with a stale frame.
  if (forceWebViewResize) {
    await StatusBar.setOverlaysWebView({ overlay: true });
  }
  await StatusBar.setOverlaysWebView({ overlay: false });
}

export function useNativeAppLifecycle() {
  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add("is-native-app");
    void configureNativeStatusBar();

    let disposed = false;
    let statusBarRestoreTimeout: number | undefined;

    // Dismissing the native auth browser can leave WKWebView with a stale
    // status-bar frame. Keep this repair scoped to browser dismissal: running
    // it on every foreground transition visibly resizes the whole app.
    function repairLayoutAfterBrowserDismissal() {
      if (disposed) return;
      window.clearTimeout(statusBarRestoreTimeout);
      void configureNativeStatusBar(true);
      statusBarRestoreTimeout = window.setTimeout(() => {
        if (!disposed) void configureNativeStatusBar(true);
      }, 150);
    }

    function setKeyboardOpen(isOpen: boolean) {
      document.documentElement.classList.toggle(
        "native-keyboard-open",
        isOpen,
      );
    }

    const listenerHandles = Promise.all([
      CapacitorApp.addListener("appUrlOpen", (event) => {
        void handleAuthCallback(event);
      }),
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        window.dispatchEvent(new Event("plink:app-resumed"));
      }),
      Browser.addListener(
        "browserFinished",
        repairLayoutAfterBrowserDismissal,
      ),
      Keyboard.addListener("keyboardWillShow", () => setKeyboardOpen(true)),
      Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true)),
      Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false)),
    ]);

    window.addEventListener(
      NATIVE_BROWSER_DISMISSED_EVENT,
      repairLayoutAfterBrowserDismissal,
    );

    void CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (!disposed && launchUrl?.url) {
        void handleAuthCallback({ url: launchUrl.url });
      }
    });

    return () => {
      disposed = true;
      window.clearTimeout(statusBarRestoreTimeout);
      window.removeEventListener(
        NATIVE_BROWSER_DISMISSED_EVENT,
        repairLayoutAfterBrowserDismissal,
      );
      document.documentElement.classList.remove("native-keyboard-open");
      document.documentElement.classList.remove("is-native-app");
      void listenerHandles.then((handles) => {
        handles.forEach((handle) => void handle.remove());
      });
    };
  }, []);
}
