const NAMES = [
  "Alice Chen", "Bob Martinez", "Carol Jones", "Dave Kim", "Eve Wilson",
  "Frank Liu", "Grace Park", "Henry Zhao", "Iris Patel", "Jack Brown",
  "Karen Lee", "Leo Singh", "Mia Davis", "Noah Tanaka", "Olivia Moore",
  "Paul Nguyen", "Quinn Taylor", "Rita Gupta", "Sam Anderson", "Tina Wang",
];

const REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"];
const STATUSES = ["Active", "Inactive", "Pending", "Archived"];
const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Finance", "Operations", "HR"];
const PRODUCTS = ["Widget A", "Widget B", "Service X", "Service Y", "Platform Z"];

export interface SpreadsheetRow {
  ID: number;
  [key: string]: string | number;
}

export const DEFAULT_COLUMNS = ["ID", "Name", "Region", "Revenue", "Status"];

export interface FilePreset {
  columns: string[];
  generator: (count: number) => SpreadsheetRow[];
}

const FILE_PRESETS: Record<string, FilePreset> = {
  default: {
    columns: ["ID", "Name", "Region", "Revenue", "Status"],
    generator: (count) => {
      const rows: SpreadsheetRow[] = [];
      for (let i = 1; i <= count; i++) {
        rows.push({
          ID: i,
          Name: NAMES[i % NAMES.length],
          Region: REGIONS[i % REGIONS.length],
          Revenue: Math.round(Math.random() * 50000 + 200),
          Status: STATUSES[i % STATUSES.length],
        });
      }
      return rows;
    },
  },
  employees: {
    columns: ["ID", "Name", "Department", "Salary", "Status"],
    generator: (count) => {
      const rows: SpreadsheetRow[] = [];
      for (let i = 1; i <= count; i++) {
        rows.push({
          ID: i,
          Name: NAMES[i % NAMES.length],
          Department: DEPARTMENTS[i % DEPARTMENTS.length],
          Salary: Math.round(Math.random() * 80000 + 35000),
          Status: STATUSES[i % STATUSES.length],
        });
      }
      return rows;
    },
  },
  inventory: {
    columns: ["ID", "Product", "Region", "Quantity", "Price"],
    generator: (count) => {
      const rows: SpreadsheetRow[] = [];
      for (let i = 1; i <= count; i++) {
        rows.push({
          ID: i,
          Product: PRODUCTS[i % PRODUCTS.length],
          Region: REGIONS[i % REGIONS.length],
          Quantity: Math.round(Math.random() * 500 + 10),
          Price: Math.round(Math.random() * 200 + 5),
        });
      }
      return rows;
    },
  },
};

export function generateMockData(count = 100, preset = "default"): { data: SpreadsheetRow[]; columns: string[] } {
  const p = FILE_PRESETS[preset] || FILE_PRESETS.default;
  return { data: p.generator(count), columns: [...p.columns] };
}

export function getPresetForFile(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("employee") || lower.includes("staff") || lower.includes("hr")) return "employees";
  if (lower.includes("inventory") || lower.includes("product") || lower.includes("stock")) return "inventory";
  return "default";
}
