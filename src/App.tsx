import { EntitlementsProvider } from "./hooks/useEntitlements";
import { AppProvider } from "./features/app/context/AppContext";
import { AppView } from "./features/app/views/AppView";
import { useAppModel } from "./features/app/hooks/useAppModel";
import { useNativeAppLifecycle } from "./features/app/hooks/useNativeAppLifecycle";
import { I18nProvider } from "./i18n/I18nContext";
import { ThemeProvider } from "./theme/ThemeContext";

function AppContent() {
  useNativeAppLifecycle();
  const model = useAppModel();

  return (
    <I18nProvider>
      <EntitlementsProvider value={model.entitlements}>
        <AppProvider value={model}>
          <AppView />
        </AppProvider>
      </EntitlementsProvider>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
