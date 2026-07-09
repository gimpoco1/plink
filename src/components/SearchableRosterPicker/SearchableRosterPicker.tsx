import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Plus, Search, X } from "lucide-react";
import "./SearchableRosterPicker.css";

type SearchableRosterPickerProps = {
  variant?: "light" | "dark";
  createButtonTone?: "light" | "dark";
  className?: string;
  contentClassName?: string;
  listMaxHeight?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearAriaLabel?: string;
  showSearch?: boolean;
  emptyState?: ReactNode;
  createButtonLabel?: string;
  createButtonAriaLabel?: string;
  onCreateButtonClick?: () => void;
  showListImmediately?: boolean;
  listTriggerLabel?: string;
  listTriggerAriaLabel?: string;
  listTitle?: string;
  collapseLabel?: string;
  onListOpenChange?: (isOpen: boolean) => void;
  footerContent?: ReactNode;
  children?: ReactNode;
};

export function SearchableRosterPicker({
  variant = "light",
  createButtonTone,
  className,
  contentClassName,
  listMaxHeight,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  clearAriaLabel,
  showSearch = true,
  emptyState,
  createButtonLabel,
  createButtonAriaLabel,
  onCreateButtonClick,
  showListImmediately = false,
  listTriggerLabel = "Add players",
  listTriggerAriaLabel,
  listTitle,
  collapseLabel = "Hide list",
  onListOpenChange,
  footerContent,
  children,
}: SearchableRosterPickerProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedOpenRef = useRef<boolean | null>(null);
  const [isListOpen, setIsListOpen] = useState(showListImmediately);
  const [fadeState, setFadeState] = useState({ top: false, bottom: false });
  const itemCount = Children.count(children);
  const hasItems = itemCount > 0;
  const shouldShowList = showListImmediately || isListOpen;

  useEffect(() => {
    if (showListImmediately) setIsListOpen(true);
  }, [showListImmediately]);

  useEffect(() => {
    if (lastNotifiedOpenRef.current === shouldShowList) return;
    lastNotifiedOpenRef.current = shouldShowList;
    onListOpenChange?.(shouldShowList);
  }, [onListOpenChange, shouldShowList]);

  useEffect(() => {
    const node = listRef.current;
    if (!node || !hasItems || !shouldShowList) {
      setFadeState((current) =>
        current.top || current.bottom
          ? { top: false, bottom: false }
          : current,
      );
      return;
    }

    const updateFade = () => {
      const top = node.scrollTop > 6;
      const remainingScroll =
        node.scrollHeight - node.clientHeight - node.scrollTop;
      const bottom = remainingScroll > 6;
      setFadeState((current) =>
        current.top === top && current.bottom === bottom
          ? current
          : { top, bottom },
      );
    };

    updateFade();

    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateFade())
        : null;
    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
      resizeObserver?.disconnect();
    };
  }, [hasItems, itemCount, shouldShowList]);

  const style = listMaxHeight
    ? ({ "--roster-picker-max-height": listMaxHeight } as CSSProperties)
    : undefined;

  return (
    <div
      className={`rosterPicker rosterPicker--${variant}${
        className ? ` ${className}` : ""
      }`}
      style={style}
    >
      {!shouldShowList ? (
        <button
          type="button"
          className="rosterPicker__listTrigger"
          onClick={() => setIsListOpen(true)}
          aria-label={listTriggerAriaLabel ?? listTriggerLabel}
        >
          <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
          <span>{listTriggerLabel}</span>
        </button>
      ) : null}

      {shouldShowList && !showListImmediately ? (
        <div className="rosterPicker__openHeader">
          {listTitle ? (
            <div className="rosterPicker__openTitle">{listTitle}</div>
          ) : null}
          <button
            type="button"
            className="rosterPicker__collapseBtn"
            onClick={() => {
              setIsListOpen(false);
              onSearchChange("");
            }}
          >
            {collapseLabel}
          </button>
        </div>
      ) : null}

      {shouldShowList && showSearch ? (
        <label className="rosterPicker__search">
          <Search size={16} strokeWidth={2.4} aria-hidden="true" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
          />
          {searchValue ? (
            <button
              type="button"
              className="rosterPicker__clear"
              aria-label={clearAriaLabel ?? "Clear search"}
              onClick={() => onSearchChange("")}
            >
              <X size={15} strokeWidth={2.6} aria-hidden="true" />
            </button>
          ) : null}
        </label>
      ) : null}

      {shouldShowList && hasItems ? (
        <div
          className={`rosterPicker__listShell${
            fadeState.top ? " rosterPicker__listShell--fadeTop" : ""
          }${fadeState.bottom ? " rosterPicker__listShell--fadeBottom" : ""}`}
        >
          <div ref={listRef} className="rosterPicker__list">
            <div
              className={`rosterPicker__listContent${
                contentClassName ? ` ${contentClassName}` : ""
              }`}
            >
              {children}
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowList && !hasItems && emptyState ? (
        <div className="rosterPicker__empty">{emptyState}</div>
      ) : null}

      {shouldShowList && createButtonLabel && onCreateButtonClick ? (
        <button
          type="button"
          className={`rosterPicker__createBtn${
            (createButtonTone ?? variant) === "dark"
              ? " rosterPicker__createBtn--dark"
              : ""
          }`}
          onClick={onCreateButtonClick}
          aria-label={createButtonAriaLabel ?? createButtonLabel}
        >
          <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
          <span>{createButtonLabel}</span>
        </button>
      ) : null}

      {shouldShowList ? footerContent : null}
    </div>
  );
}
