/**
 * Cell-level styling system for the spreadsheet.
 *
 * Styles are stored per cell as a flat record keyed by "rowIndex:colName".
 * When an Excel file is imported via ExcelJS, the original formatting
 * (font bold/italic/underline/color, fill colour, alignment, borders)
 * is extracted and stored here so it survives into the DataGrid rendering.
 *
 * Users can also add/toggle styles via the toolbar; those changes are
 * merged into the same map.
 */

export interface CellFont {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  size?: number;
  /** hex colour WITHOUT leading # — e.g. "FF0000" */
  color?: string;
  name?: string;
}

export interface CellFill {
  /** hex colour WITHOUT leading # */
  bgColor?: string;
}

export interface CellAlignment {
  horizontal?: "left" | "center" | "right";
  vertical?: "top" | "middle" | "bottom";
  wrapText?: boolean;
}

export interface CellBorder {
  color?: string;
  style?: "thin" | "medium" | "thick" | "dashed" | "dotted";
}

export interface CellBorders {
  top?: CellBorder;
  bottom?: CellBorder;
  left?: CellBorder;
  right?: CellBorder;
}

export interface CellStyle {
  font?: CellFont;
  fill?: CellFill;
  alignment?: CellAlignment;
  borders?: CellBorders;
  numberFormat?: string;
}

/**
 * Map from "rowIndex:colName" → CellStyle.
 * rowIndex is the 0-based index in the data array (not Excel row number).
 */
export type CellStyleMap = Map<string, CellStyle>;

/** Build the key used for the CellStyleMap */
export function cellKey(rowIndex: number, col: string): string {
  return `${rowIndex}:${col}`;
}

/** Deep-merge two CellStyle objects (b wins) */
export function mergeStyles(a: CellStyle, b: CellStyle): CellStyle {
  return {
    font: { ...a.font, ...b.font },
    fill: { ...a.fill, ...b.fill },
    alignment: { ...a.alignment, ...b.alignment },
    borders: { ...a.borders, ...b.borders },
    numberFormat: b.numberFormat ?? a.numberFormat,
  };
}

/**
 * Apply a style patch to a set of cells.
 * Returns a new map (immutable update).
 */
export function applyStylePatch(
  map: CellStyleMap,
  cells: { rowIndex: number; col: string }[],
  patch: CellStyle,
): CellStyleMap {
  const next = new Map(map);
  for (const { rowIndex, col } of cells) {
    const key = cellKey(rowIndex, col);
    const existing = next.get(key) ?? {};
    next.set(key, mergeStyles(existing, patch));
  }
  return next;
}

/**
 * Toggle a boolean font property (e.g. bold, italic) for a set of cells.
 * If ALL selected cells already have the property set, it is turned off;
 * otherwise it is turned on.
 */
export function toggleFontProp(
  map: CellStyleMap,
  cells: { rowIndex: number; col: string }[],
  prop: keyof CellFont,
): CellStyleMap {
  const allSet = cells.every((c) => {
    const s = map.get(cellKey(c.rowIndex, c.col));
    return s?.font?.[prop] === true;
  });
  const value = !allSet;
  return applyStylePatch(map, cells, { font: { [prop]: value } as CellFont });
}

/** Convert a CellStyle for a single cell into a React CSSProperties object */
export function styleToCss(style: CellStyle | undefined): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {};

  if (style.font) {
    if (style.font.bold) css.fontWeight = "bold";
    if (style.font.italic) css.fontStyle = "italic";
    if (style.font.underline) css.textDecoration = (css.textDecoration ? css.textDecoration + " " : "") + "underline";
    if (style.font.strikethrough) css.textDecoration = (css.textDecoration ? css.textDecoration + " " : "") + "line-through";
    if (style.font.size) css.fontSize = `${style.font.size}pt`;
    if (style.font.color) css.color = `#${style.font.color}`;
    if (style.font.name) css.fontFamily = style.font.name;
  }

  if (style.fill?.bgColor) {
    css.backgroundColor = `#${style.fill.bgColor}`;
  }

  if (style.alignment) {
    if (style.alignment.horizontal) css.textAlign = style.alignment.horizontal;
    if (style.alignment.vertical) {
      const map: Record<string, string> = { top: "flex-start", middle: "center", bottom: "flex-end" };
      css.alignItems = map[style.alignment.vertical] || "center";
    }
    if (style.alignment.wrapText) css.whiteSpace = "pre-wrap";
  }

  if (style.borders) {
    const borderStr = (b?: CellBorder) => {
      if (!b) return undefined;
      const w = b.style === "medium" ? "2px" : b.style === "thick" ? "3px" : "1px";
      const s = b.style === "dashed" ? "dashed" : b.style === "dotted" ? "dotted" : "solid";
      const c = b.color ? `#${b.color}` : "var(--border)";
      return `${w} ${s} ${c}`;
    };
    if (style.borders.top) css.borderTop = borderStr(style.borders.top);
    if (style.borders.bottom) css.borderBottom = borderStr(style.borders.bottom);
    if (style.borders.left) css.borderLeft = borderStr(style.borders.left);
    if (style.borders.right) css.borderRight = borderStr(style.borders.right);
  }

  return css;
}

/** Check if a CellStyle is effectively empty (no visual properties set) */
export function isEmptyStyle(s: CellStyle | undefined): boolean {
  if (!s) return true;
  const { font, fill, alignment, borders } = s;
  if (font && Object.values(font).some((v) => v !== undefined)) return false;
  if (fill && fill.bgColor) return false;
  if (alignment && Object.values(alignment).some((v) => v !== undefined)) return false;
  if (borders && Object.values(borders).some((v) => v !== undefined)) return false;
  return true;
}
