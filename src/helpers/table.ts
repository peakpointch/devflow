import chalk from "chalk";
import { getMaxWidth, leftPad, rightPad } from "./utils.js";

type TableColumn<TRow, TColumn extends string> = {
  id: TColumn;
  title?: string;
  align?: "left" | "right" | "none";
  getValue: TableValueGetter<TRow>;
  format?: TableCellFormatter<TRow, TColumn>;
  formatTitle?: TableTitleCellFormatter<TRow, TColumn>;
};

type TableValueGetter<T> = (row: T) => string;

type TableCellFormatter<TRow, TColumn extends string> = (
  cell: string,
  row: TRow,
  column: Pick<TableColumn<TRow, TColumn>, "id" | "title" | "align">,
) => string;

type TableTitleCellFormatter<TRow, TColumn extends string> = (
  cell: string,
  column: Pick<TableColumn<TRow, TColumn>, "id" | "title" | "align">,
) => string;

type EntryTableRow = string[];
type RawEntryTable = EntryTableRow[];

type TableRow<TColumn extends string> = Record<TColumn, string>;
type RawTable<TColumn extends string> = TableRow<TColumn>[];

export class Table<TRow, TColumn extends string> {
  public rows: TRow[];
  public columns: TableColumn<TRow, TColumn>[];
  public autoColumnWidth: Map<TColumn, number> = new Map();
  public colSeparator: string;

  public constructor(rows: TRow[], columns: TableColumn<TRow, TColumn>[]) {
    this.rows = rows;
    this.columns = columns;
    this.colSeparator = chalk.gray(" │ ");
  }

  public getTitleRow(): string[] {
    return this.columns.map((col) => col.title ?? col.id);
  }

  private alignCell(col: TableColumn<TRow, TColumn>, value: string): string {
    const align = col.align ?? "left";
    switch (align) {
      case "left":
        return rightPad(value, this.autoColumnWidth.get(col.id) ?? 0);
      case "right":
        return leftPad(value, this.autoColumnWidth.get(col.id) ?? 0);
      case "none":
        return value;
    }
  }

  public getTitleStringRow(): string {
    let row: string = "";

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i]!;
      const cell = this.alignCell(col, col.title ?? col.id);
      row += col.formatTitle ? col.formatTitle(cell, col) : cell;
      if (i < this.columns.length - 1) {
        row += this.colSeparator;
      }
    }

    return row;
  }

  public getRawTable(): RawTable<TColumn> {
    const rawTable = [];

    for (const rowEntry of this.rows) {
      const row: Partial<TableRow<TColumn>> = {};
      for (const col of this.columns) {
        const value = col.getValue(rowEntry);
        row[col.id] = value;
      }
      rawTable.push(row as TableRow<TColumn>);
    }

    return rawTable;
  }

  public detectColumnWidth() {
    const rawTable = this.getRawTable();

    for (const col of this.columns) {
      const columnValues = [
        col.title ?? col.id,
        ...rawTable.map((row) => row[col.id]).filter(Boolean),
      ];

      this.autoColumnWidth.set(col.id, getMaxWidth(columnValues));
    }
  }

  public getValueRows(options: { titleRow: boolean }): RawEntryTable {
    const opts = { titleRow: options.titleRow ?? false };
    const rawTable = [];

    if (opts.titleRow) rawTable.push(this.getTitleRow());

    for (const rowEntry of this.rows) {
      const row: EntryTableRow = [];
      for (const col of this.columns) {
        const value = col.getValue(rowEntry);
        row.push(value);
      }
      rawTable.push(row);
    }

    return rawTable;
  }

  public getStringRows(options?: { titleRow?: boolean }): string[] {
    const opts = { titleRow: options?.titleRow ?? false };
    const stringRows: string[] = [];

    this.detectColumnWidth();

    if (opts?.titleRow) stringRows.push(this.getTitleStringRow());

    for (const row of this.rows) {
      let rowString: string = "";

      for (let i = 0; i < this.columns.length; i++) {
        const col = this.columns[i]!;
        const value = col.getValue(row);
        const cell = this.alignCell(col, value);
        rowString += col.format ? col.format(cell, row, col) : cell;
        if (i < this.columns.length - 1) {
          rowString += this.colSeparator;
        }
      }

      stringRows.push(rowString);
    }

    return stringRows;
  }

  public toString(
    opts?: Partial<{
      titleRow: boolean;
      rowCount: boolean;
      prefix: string;
      suffix: string;
    }>,
  ): string {
    const prefix = opts?.prefix ?? "";
    const suffix = opts?.suffix ?? "";
    const rows = this.getStringRows(opts);

    if (opts?.rowCount) {
      const footer = `${this.rows.length} ${this.rows.length === 1 ? "row" : "rows"}`;
      rows.push(chalk.dim(footer));
    }

    return prefix + rows.join(suffix + "\n" + prefix) + suffix;
  }
}
