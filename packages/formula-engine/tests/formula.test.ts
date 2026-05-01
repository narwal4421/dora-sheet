import { HyperFormula } from 'hyperformula';

describe('Formula Engine Calculations', () => {
  let hf: HyperFormula;
  let sheetId: number;

  beforeEach(() => {
    hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    const name = hf.addSheet('Sheet1');
    sheetId = hf.getSheetId(name) as number;
  });

  test('SUM formula calculates correctly', () => {
    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [['1']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 1 }, [['2']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 2 }, [['=SUM(A1:A2)']]);
    
    expect(hf.getCellValue({ sheet: sheetId, col: 0, row: 2 })).toBe(3);
  });

  test('AVERAGE formula calculates correctly', () => {
    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [['10']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 1 }, [['20']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 2 }, [['=AVERAGE(A1:A2)']]);
    
    expect(hf.getCellValue({ sheet: sheetId, col: 0, row: 2 })).toBe(15);
  });

  test('IF formula with true/false branches', () => {
    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [['10']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 1 }, [['=IF(A1>5, "High", "Low")']]);
    
    expect(hf.getCellValue({ sheet: sheetId, col: 0, row: 1 })).toBe("High");
  });

  test('VLOOKUP returns correct value', () => {
    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [['Apples', '10']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 1 }, [['Bananas', '20']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 2 }, [['=VLOOKUP("Bananas", A1:B2, 2, FALSE)']]);
    
    expect(hf.getCellValue({ sheet: sheetId, col: 0, row: 2 })).toBe(20);
  });

  test('Circular reference returns { error: "CIRCULAR_REF" }', () => {
    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [['=A2']]);
    hf.setCellContents({ sheet: sheetId, col: 0, row: 1 }, [['=A1']]);
    
    const val = hf.getCellValue({ sheet: sheetId, col: 0, row: 0 }) as any;
    expect(val.type).toBe('CYCLE');
  });
});
