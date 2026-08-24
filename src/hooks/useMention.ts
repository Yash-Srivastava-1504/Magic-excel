/**
 * Shared hook for @-mention autocomplete used by ChatPanel and StackEditModal.
 */
import { useState, useCallback } from "react";
import type { ExcelFile } from "@/lib/useSpreadsheet";

export type MentionType = "column" | "file";

export interface UseMentionOptions {
  columns: string[];
  files?: ExcelFile[];
  /** When true, only column mentions are supported (no # file mentions) */
  columnOnly?: boolean;
}

export interface UseMentionReturn {
  showMention: boolean;
  mentionType: MentionType;
  mentionFilter: string;
  mentionIdx: number;
  filteredItems: (string | ExcelFile)[];
  setMentionIdx: React.Dispatch<React.SetStateAction<number>>;
  /** Call on every input change to update mention state */
  handleMentionChange: (val: string) => void;
  /** Insert a mention into `currentValue` and return the new value */
  insertMention: (item: string, type: MentionType, currentValue: string) => string;
  /** Close the mention dropdown */
  closeMention: () => void;
  /** Handle keyboard navigation inside the mention dropdown.
   *  Returns `true` if the key was consumed. */
  handleMentionKeyDown: (
    e: React.KeyboardEvent,
    currentValue: string,
    onInsert: (newValue: string) => void,
    onFileMention?: (file: ExcelFile) => void,
  ) => boolean;
}

export function useMention({
  columns,
  files = [],
  columnOnly = false,
}: UseMentionOptions): UseMentionReturn {
  const [showMention, setShowMention] = useState(false);
  const [mentionType, setMentionType] = useState<MentionType>("column");
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);

  const filteredItems: (string | ExcelFile)[] =
    mentionType === "column"
      ? columns.filter((c) => c.toLowerCase().includes(mentionFilter.toLowerCase()))
      : files.filter((f) => f.name.toLowerCase().includes(mentionFilter.toLowerCase()));

  const handleMentionChange = useCallback(
    (val: string) => {
      // Check for # file mentions first
      if (!columnOnly) {
        const hashIdx = val.lastIndexOf("#");
        if (hashIdx !== -1 && (hashIdx === 0 || val[hashIdx - 1] === " ")) {
          const partial = val.slice(hashIdx + 1);
          if (!partial.includes(" ")) {
            setShowMention(true);
            setMentionType("file");
            setMentionFilter(partial);
            setMentionIdx(0);
            return;
          }
        }
      }

      // Check for @ column mentions
      const atIdx = val.lastIndexOf("@");
      if (atIdx !== -1 && (atIdx === 0 || val[atIdx - 1] === " ")) {
        const partial = val.slice(atIdx + 1);
        if (!partial.includes(" ")) {
          const beforeAt = val.slice(0, atIdx).toLowerCase();
          const isRenameTarget = beforeAt.trimEnd().endsWith(" to");
          if (!isRenameTarget) {
            setShowMention(true);
            setMentionType("column");
            setMentionFilter(partial);
            setMentionIdx(0);
            return;
          }
        }
      }

      setShowMention(false);
    },
    [columnOnly],
  );

  const insertMention = useCallback(
    (item: string, type: MentionType, currentValue: string): string => {
      const symbol = type === "column" ? "@" : "#";
      const idx =
        type === "column"
          ? currentValue.lastIndexOf("@")
          : currentValue.lastIndexOf("#");
      const newVal = currentValue.slice(0, idx) + symbol + item + " ";
      setShowMention(false);
      return newVal;
    },
    [],
  );

  const closeMention = useCallback(() => setShowMention(false), []);

  const handleMentionKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      currentValue: string,
      onInsert: (newValue: string) => void,
      onFileMention?: (file: ExcelFile) => void,
    ): boolean => {
      if (!showMention) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((p) => Math.min(p + 1, filteredItems.length - 1));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((p) => Math.max(p - 1, 0));
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = filteredItems[mentionIdx];
        if (item) {
          if (mentionType === "column") {
            onInsert(insertMention(item as string, "column", currentValue));
          } else {
            const file = item as ExcelFile;
            onFileMention?.(file);
            onInsert(insertMention(file.name, "file", currentValue));
          }
        }
        return true;
      }
      if (e.key === "Escape") {
        setShowMention(false);
        return true;
      }
      return false;
    },
    [showMention, filteredItems, mentionIdx, mentionType, insertMention],
  );

  return {
    showMention,
    mentionType,
    mentionFilter,
    mentionIdx,
    filteredItems,
    setMentionIdx,
    handleMentionChange,
    insertMention,
    closeMention,
    handleMentionKeyDown,
  };
}
