const result = { "startCol": "0", "startRow": "0", "columns": [ "Name1", "Name2" ], "rows": [ [ "pranjal", "arman" ] ] };
const startRow = result.startRow !== undefined ? Number(result.startRow) : 0;
const startCol = result.startCol !== undefined ? Number(result.startCol) : 0;
const columns = result.columns;
const rows = result.rows;
const data = result.data;
const dataToFill = data || (columns ? [columns, ...rows] : rows);
const updates = {};
dataToFill.forEach((row, rIndex) => {
  const rowArray = Array.isArray(row) ? row : [row];
  rowArray.forEach((cellValue, cIndex) => {
    const ref = `r_${startRow + rIndex}_c_${startCol + cIndex}`;
    updates[ref] = { v: cellValue };
  });
});
console.log(updates);
