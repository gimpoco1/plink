import { forwardRef } from "react";
import "./ManagePlayersDialog.css";
import {
  useManagePlayersDialogModel,
  type ManagePlayersDialogHandle,
  type ManagePlayersDialogProps,
} from "./useManagePlayersDialogModel";
import { ManagePlayersDialogProvider } from "./ManagePlayersDialogContext";
import { ManagePlayersDialogView } from "./ManagePlayersDialogView";

export type { ManagePlayersDialogHandle };

export const ManagePlayersDialog = forwardRef<
  ManagePlayersDialogHandle,
  ManagePlayersDialogProps
>(function ManagePlayersDialog(props, ref) {
  const model = useManagePlayersDialogModel(props, ref);

  return (
    <ManagePlayersDialogProvider value={model}>
      <ManagePlayersDialogView />
    </ManagePlayersDialogProvider>
  );
});
