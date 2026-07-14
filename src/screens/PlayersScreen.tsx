import "../features/players/styles/PlayersScreen.css";
import {
  usePlayersScreenModel,
  type PlayersScreenProps,
} from "../features/players/hooks/usePlayersScreenModel";
import { PlayersScreenProvider } from "../features/players/context/PlayersScreenContext";
import { PlayersScreenView } from "../features/players/views/PlayersScreenView";

export function PlayersScreen(props: PlayersScreenProps) {
  const model = usePlayersScreenModel(props);
  return (
    <PlayersScreenProvider value={model}>
      <PlayersScreenView />
    </PlayersScreenProvider>
  );
}
