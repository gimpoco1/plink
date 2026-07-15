import { EntitlementsProvider } from "./hooks/useEntitlements";
import { AppProvider } from "./features/app/context/AppContext";
import { AppView } from "./features/app/views/AppView";
import { useAppModel } from "./features/app/hooks/useAppModel";
import { useNativeAppLifecycle } from "./features/app/hooks/useNativeAppLifecycle";

export default function App() {
  useNativeAppLifecycle();
  const model = useAppModel();
  return (
    <EntitlementsProvider value={model.entitlements}>
      <AppProvider value={model}>
        <AppView />
      </AppProvider>
    </EntitlementsProvider>
  );
}
