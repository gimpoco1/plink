import { ChevronDown, FileUp, Plus } from "lucide-react";
import { avatarStyleFor } from "../../utils/color";
import { formatPlayerName, getInitials } from "../../utils/text";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthTransferImport() {
  const {
    allFilteredLocalGamesSelected,
    backupInputRef,
    busy,
    deviceImportRef,
    filteredLocalGames,
    hasFilteredLocalGames,
    localGames,
    localProfiles,
    localSessionSearch,
    runImportFromDevice,
    selectedLocalGameIds,
    selectedLocalProfileIds,
    setLocalSessionSearch,
    setShowDeviceImport,
    setShowDevicePlayersImport,
    showDeviceImport,
    showDevicePlayersImport,
    toggleFilteredLocalGames,
    toggleLocalGame,
    toggleLocalProfile,
  } = useAuthDialogContext();
  return (
    <div className="authDialog__transferBlock">
      <div className="authDialog__transferTitle">Add to account</div>
      <p className="authDialog__text">
        Choose sessions or players you want saved in this account.
      </p>
      <div className="authDialog__transferActions">
        <div
          className={`authDialog__deviceSection${
            showDeviceImport && localGames.length > 0
              ? " authDialog__deviceSection--open"
              : ""
          }`}
        >
          <button
            className="authDialog__deviceToggle"
            type="button"
            onClick={() => setShowDeviceImport((value) => !value)}
            disabled={busy || localGames.length === 0}
            aria-expanded={showDeviceImport}
          >
            <span>Sessions on this device</span>
            <span
              className={`authDialog__deviceToggleChevron${showDeviceImport ? " authDialog__deviceToggleChevron--open" : ""}`}
              aria-hidden="true"
            >
              <ChevronDown size={17} strokeWidth={2.2} />
            </span>
          </button>
          {showDeviceImport && localGames.length > 0 ? (
            <div ref={deviceImportRef} className="authDialog__deviceImport">
              <div className="authDialog__deviceGroup">
                <div className="authDialog__deviceTools">
                  <input
                    className="input input-search-compact authDialog__deviceSearch"
                    type="search"
                    value={localSessionSearch}
                    onChange={(event) =>
                      setLocalSessionSearch(event.target.value)
                    }
                    placeholder="Search sessions or players"
                    aria-label="Search sessions saved on this device"
                  />

                  {filteredLocalGames.length >= 2 ? (
                    <label className="authDialog__selectAll">
                      <input
                        type="checkbox"
                        checked={allFilteredLocalGamesSelected}
                        onChange={toggleFilteredLocalGames}
                        disabled={!hasFilteredLocalGames}
                      />
                      <span>Select all</span>
                    </label>
                  ) : null}
                </div>

                <div className="authDialog__deviceList authDialog__deviceList--scroll">
                  {filteredLocalGames.map((game) => (
                    <label
                      key={game.id}
                      className="authDialog__deviceItem authDialog__deviceItem--session"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocalGameIds.includes(game.id)}
                        onChange={() => toggleLocalGame(game.id)}
                      />

                      <span className="authDialog__deviceSessionText">
                        <span className="authDialog__deviceSessionTitle">
                          <strong>{game.name}</strong>

                          <span
                            className="authDialog__sessionAvatars"
                            aria-label={`${game.players.length} player${
                              game.players.length === 1 ? "" : "s"
                            }`}
                          >
                            {game.players.slice(0, 4).map((player) => (
                              <span
                                key={player.id}
                                className="authDialog__sessionAvatar"
                                style={avatarStyleFor(player.avatarColor)}
                                title={player.name}
                              >
                                {getInitials(player.name)}
                              </span>
                            ))}

                            {game.players.length > 4 ? (
                              <span className="authDialog__sessionAvatar authDialog__sessionAvatar--more">
                                +{game.players.length - 4}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}

                  {!hasFilteredLocalGames ? (
                    <div className="authDialog__deviceEmpty">
                      No sessions match your search.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="authDialog__deviceActions">
                <button
                  className="btn authDialog__actionBtn authDialog__actionBtn--add authDialog__actionBtn--deviceImport"
                  type="button"
                  onClick={() =>
                    void runImportFromDevice(
                      {
                        gameIds: selectedLocalGameIds,
                        profileIds: [],
                      },
                      "Select at least one session to import.",
                    )
                  }
                  disabled={busy || selectedLocalGameIds.length === 0}
                >
                  <span className="authDialog__actionIcon" aria-hidden="true">
                    <Plus size={16} strokeWidth={2.4} />
                  </span>
                  <span>{busy ? "Working..." : "Add selected to account"}</span>
                </button>
                <p className="authDialog__deviceActionNote">
                  Added sessions move to your account and are removed from this
                  device&apos;s local storage. They may not be available offline
                  when signed out.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={`authDialog__deviceSection${
            showDevicePlayersImport && localProfiles.length > 0
              ? " authDialog__deviceSection--open"
              : ""
          }`}
        >
          <button
            className="authDialog__deviceToggle"
            type="button"
            onClick={() => setShowDevicePlayersImport((value) => !value)}
            disabled={busy || localProfiles.length === 0}
            aria-expanded={showDevicePlayersImport}
          >
            <span>Players on this device</span>
            <span
              className={`authDialog__deviceToggleChevron${showDevicePlayersImport ? " authDialog__deviceToggleChevron--open" : ""}`}
              aria-hidden="true"
            >
              <ChevronDown size={17} strokeWidth={2.2} />
            </span>
          </button>
          {showDevicePlayersImport && localProfiles.length > 0 ? (
            <div className="authDialog__deviceImport">
              <div className="authDialog__deviceGroup">
                <div className="authDialog__deviceList">
                  {localProfiles.map((profile) => (
                    <label
                      key={profile.id}
                      className="authDialog__deviceItem authDialog__deviceItem--player"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocalProfileIds.includes(profile.id)}
                        onChange={() => toggleLocalProfile(profile.id)}
                      />
                      <span
                        className="authDialog__devicePlayerAvatar"
                        style={avatarStyleFor(profile.avatarColor)}
                        aria-hidden="true"
                      >
                        {getInitials(profile.name)}
                      </span>
                      <span>
                        <strong>{formatPlayerName(profile.name)}</strong>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="authDialog__deviceActions">
                <button
                  className="btn authDialog__actionBtn authDialog__actionBtn--add authDialog__actionBtn--deviceImport"
                  type="button"
                  onClick={() =>
                    void runImportFromDevice(
                      {
                        gameIds: [],
                        profileIds: selectedLocalProfileIds,
                      },
                      "Select at least one player to import.",
                    )
                  }
                  disabled={busy || selectedLocalProfileIds.length === 0}
                >
                  <span className="authDialog__actionIcon" aria-hidden="true">
                    <Plus size={16} strokeWidth={2.4} />
                  </span>
                  <span>{busy ? "Working..." : "Add selected to account"}</span>
                </button>
                <p className="authDialog__deviceActionNote">
                  Added players move to your account and are removed from this
                  device&apos;s local storage. They may not be available offline
                  when signed out.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="authDialog__transferActions">
        <button
          className="btn btn--ghost authDialog__actionBtn authDialog__actionBtn--file"
          type="button"
          onClick={() => backupInputRef.current?.click()}
          disabled={busy}
        >
          <span className="authDialog__actionIcon" aria-hidden="true">
            <FileUp size={15} strokeWidth={2.1} />
          </span>
          <span>Restore from backup file</span>
        </button>
      </div>
    </div>
  );
}
