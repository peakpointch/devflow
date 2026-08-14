import chalk from "chalk";
import { getMaxWidth, leftPad, rightPad } from "./utils.js";
class Table {
  rows;
  columns;
  autoColumnWidth = /* @__PURE__ */ new Map();
  colSeparator;
  constructor(rows, columns) {
    this.rows = rows;
    this.columns = columns;
    this.colSeparator = chalk.gray(" \u2502 ");
  }
  getTitleRow() {
    return this.columns.map((col) => col.title ?? col.id);
  }
  alignCell(col, value) {
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
  getTitleStringRow() {
    let row = "";
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const cell = this.alignCell(col, col.title ?? col.id);
      row += col.formatTitle ? col.formatTitle(cell, col) : cell;
      if (i < this.columns.length - 1) {
        row += this.colSeparator;
      }
    }
    return row;
  }
  getRawTable() {
    const rawTable = [];
    for (const rowEntry of this.rows) {
      const row = {};
      for (const col of this.columns) {
        const value = col.getValue(rowEntry);
        row[col.id] = value;
      }
      rawTable.push(row);
    }
    return rawTable;
  }
  detectColumnWidth() {
    const rawTable = this.getRawTable();
    for (const col of this.columns) {
      const columnValues = [
        col.title ?? col.id,
        ...rawTable.map((row) => row[col.id]).filter(Boolean)
      ];
      this.autoColumnWidth.set(col.id, getMaxWidth(columnValues));
    }
  }
  getValueRows(options) {
    const opts = { titleRow: options.titleRow ?? false };
    const rawTable = [];
    if (opts.titleRow) rawTable.push(this.getTitleRow());
    for (const rowEntry of this.rows) {
      const row = [];
      for (const col of this.columns) {
        const value = col.getValue(rowEntry);
        row.push(value);
      }
      rawTable.push(row);
    }
    return rawTable;
  }
  getStringRows(options) {
    const opts = { titleRow: options?.titleRow ?? false };
    const stringRows = [];
    this.detectColumnWidth();
    if (opts?.titleRow) stringRows.push(this.getTitleStringRow());
    for (const row of this.rows) {
      let rowString = "";
      for (let i = 0; i < this.columns.length; i++) {
        const col = this.columns[i];
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
  toString(opts) {
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
export {
  Table
};
