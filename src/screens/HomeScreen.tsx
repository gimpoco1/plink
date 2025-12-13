import { useMemo, useState } from "react";
import type { Game } from "../types";
import { GameRowCard } from "../components/GameRowCard";
import "./HomeScreen.css";

type Props = {
  games: Game[];
  onCreate: (input: { name: string; targetPoints: number }) => void;
  onEnter: (gameId: string) => void;
  onDelete: (gameId: string) => void;
};

export function HomeScreen({ games, onCreate, onEnter, onDelete }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("30");

  const parsedTarget = useMemo(() => Number.parseInt(target, 10), [target]);
  const canCreate =
    name.trim().length > 0 && Number.isFinite(parsedTarget) && parsedTarget > 0;
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
      }),
    []
  );

  return (
    <main className="content">
      <section className="homeCard">
        <div className="homeCard__title">New game</div>
        <div className="homeForm">
          <label className="field">
            <span className="field__label">Game name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Points to win</span>
            <input
              className="input"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="30"
            />
          </label>
          <button
            className="btn btn--primary btn--wide"
            type="button"
            disabled={!canCreate}
            onClick={() => onCreate({ name, targetPoints: parsedTarget })}
          >
            Create game
          </button>
        </div>
      </section>

      {games.length > 0 && (
        <section className="homeList" aria-label="Game history">
          <div className="homeList__title">Your games</div>
          <div className="gameRows">
            {games.map((g) => {
              const created = dateFmt.format(new Date(g.createdAt));
              return (
                <GameRowCard
                  key={g.id}
                  game={g}
                  createdLabel={created}
                  onEnter={() => onEnter(g.id)}
                  onDelete={() => onDelete(g.id)}
                />
              );
            })}
          </div>

        </section>
      )}
    </main>
  );
}
