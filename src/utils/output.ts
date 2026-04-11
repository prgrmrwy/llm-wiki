export function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );

  const renderRow = (row: string[]) =>
    row
      .map((cell, index) => (cell ?? "").padEnd(widths[index], " "))
      .join("  ");

  console.log(renderRow(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) {
    console.log(renderRow(row));
  }
}
