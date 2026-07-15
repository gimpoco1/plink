import { forwardRef } from "react";
import "./AuthDialog.css";
import {
  useAuthDialogModel,
  type AuthDialogHandle,
  type AuthDialogProps,
} from "./useAuthDialogModel";
import { AuthDialogProvider } from "./AuthDialogContext";
import { AuthDialogView } from "./AuthDialogView";

export type { AuthDialogHandle };

export const AuthDialog = forwardRef<AuthDialogHandle, AuthDialogProps>(
  function AuthDialog(props, ref) {
    const model = useAuthDialogModel(props, ref);
    return (
      <AuthDialogProvider value={model}>
        <AuthDialogView />
      </AuthDialogProvider>
    );
  },
);
