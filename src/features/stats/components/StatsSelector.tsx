import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../../../components/HomeLockedState/StatsSkeleton";
import { StatsAdvancedCards } from "./StatsAdvancedCards";
import { StatsCharts } from "./StatsCharts";
import { StatsProPreview } from "./StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "./StatsScreenParts";
import {
  compareValues,
  formatAveragePlacement,
  getDisplayName,
} from "../utils/statsUtils";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import type { PlayerProfile } from "../../../types";
import type { SelectableEntity } from "../types/statsTypes";
import type { SubjectReport } from "../../../utils/advancedStats";
import { useStatsScreenContext } from "../context/StatsScreenContext";

export function StatsSelector() {
  const {
    pickerPanelRef,
    activeKind,
    setActiveKind,
    areTeamReportsLocked,
    onOpenProPlan,
    canSeeAdvancedStats,
    compareEnabled,
    selectedPlayerOption,
    selectedTeamOption,
    openPicker,
    setPickerSearch,
    setOpenPicker,
    pickerOptions,
    selectedPlayerId,
    setSelectedPlayerId,
    pickerSearch,
    selectedTeamId,
    setSelectedTeamId,
    comparePlayerOption,
    compareTeamOption,
    comparePlayerId,
    setComparePlayerId,
    compareTeamId,
    setCompareTeamId,
    isCompareLocked,
    setCompareEnabled,
  } = useStatsScreenContext();
  return (
    <section className="statsSelectorPanel" ref={pickerPanelRef}>
      <div className="statsSelectorPanel__head">
        <div className="statsSelectorPanel__copy">
          <span className="statsEyebrow">Reporting</span>
          <h3>Choose who to analyze</h3>
        </div>
        <div className="statsSelectorControls">
          <div
            className={`statsScopeSwitch statsScopeSwitch--${activeKind}`}
            role="tablist"
            aria-label="Stats view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeKind === "players"}
              className={`statsScopeSwitch__option${
                activeKind === "players"
                  ? " statsScopeSwitch__option--active"
                  : ""
              }`}
              onClick={() => setActiveKind("players")}
            >
              Individuals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeKind === "teams"}
              className={`statsScopeSwitch__option${
                activeKind === "teams"
                  ? " statsScopeSwitch__option--active"
                  : ""
              }`}
              onClick={() => {
                if (areTeamReportsLocked) {
                  onOpenProPlan();
                  return;
                }
                if (!areTeamReportsLocked) setActiveKind("teams");
              }}
              aria-disabled={areTeamReportsLocked}
            >
              <span>Teams</span>
              {!canSeeAdvancedStats ? (
                <span className="statsControlProBadge">PRO</span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`statsPickerDock${
          compareEnabled ? " statsPickerDock--compare" : ""
        }`}
      >
        <div className="statsPickerSlot statsPickerSlot--primary">
          <PickerButton
            option={
              activeKind === "players"
                ? selectedPlayerOption
                : selectedTeamOption
            }
            placeholder={
              activeKind === "players" ? "Choose player" : "Choose team"
            }
            isOpen={
              openPicker === (activeKind === "players" ? "primary" : "team")
            }
            onClick={() => {
              setPickerSearch("");
              setOpenPicker((current) =>
                current === (activeKind === "players" ? "primary" : "team")
                  ? null
                  : activeKind === "players"
                    ? "primary"
                    : "team",
              );
            }}
          />
          {openPicker === "primary" && activeKind === "players" ? (
            <PickerPopover
              kind="players"
              options={pickerOptions}
              selectedId={selectedPlayerId}
              onSelect={(id) => {
                setSelectedPlayerId(id);
                setOpenPicker(null);
              }}
              search={pickerSearch}
              onSearchChange={setPickerSearch}
            />
          ) : null}
          {openPicker === "team" && activeKind === "teams" ? (
            <PickerPopover
              kind="teams"
              options={pickerOptions}
              selectedId={selectedTeamId}
              onSelect={(id) => {
                setSelectedTeamId(id);
                setOpenPicker(null);
              }}
              search={pickerSearch}
              onSearchChange={setPickerSearch}
            />
          ) : null}
        </div>

        {compareEnabled ? (
          <>
            <div className="statsPickerDock__vs">VS</div>
            <div className="statsPickerSlot statsPickerSlot--compare">
              <PickerButton
                option={
                  activeKind === "players"
                    ? comparePlayerOption
                    : compareTeamOption
                }
                placeholder={
                  activeKind === "players" ? "Choose player" : "Choose team"
                }
                isOpen={
                  openPicker ===
                  (activeKind === "players" ? "compare" : "teamCompare")
                }
                onClick={() => {
                  setPickerSearch("");
                  setOpenPicker((current) =>
                    current ===
                    (activeKind === "players" ? "compare" : "teamCompare")
                      ? null
                      : activeKind === "players"
                        ? "compare"
                        : "teamCompare",
                  );
                }}
              />
              {openPicker === "compare" && activeKind === "players" ? (
                <PickerPopover
                  kind="players"
                  options={pickerOptions}
                  selectedId={comparePlayerId}
                  onSelect={(id) => {
                    setComparePlayerId(id);
                    setOpenPicker(null);
                  }}
                  search={pickerSearch}
                  onSearchChange={setPickerSearch}
                />
              ) : null}
              {openPicker === "teamCompare" && activeKind === "teams" ? (
                <PickerPopover
                  kind="teams"
                  options={pickerOptions}
                  selectedId={compareTeamId}
                  onSelect={(id) => {
                    setCompareTeamId(id);
                    setOpenPicker(null);
                  }}
                  search={pickerSearch}
                  onSearchChange={setPickerSearch}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {activeKind === "players" || activeKind === "teams" ? (
        <label
          className={`statsCompareToggle${
            compareEnabled ? " statsCompareToggle--active" : ""
          }${isCompareLocked ? " statsCompareToggle--locked" : ""}`}
          onClick={(event) => {
            if (!isCompareLocked) return;
            event.preventDefault();
            onOpenProPlan();
          }}
        >
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(event) => {
              if (isCompareLocked) return;
              const next = event.target.checked;
              setCompareEnabled(next);
              if (!next) {
                setOpenPicker(null);
              }
            }}
          />
          <span className="statsCompareToggle__box" aria-hidden="true" />
          <span>
            Compare with another {activeKind === "players" ? "player" : "team"}
          </span>
          {isCompareLocked ? (
            <span className="statsControlProBadge">PRO</span>
          ) : null}
        </label>
      ) : null}
    </section>
  );
}
