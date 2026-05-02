import { useSheetStore } from '../store/useSheetStore';
import { useEffect, useState } from 'react';

const getColName = (c: number) => {
  let name = '';
  let temp = c;
  while (temp >= 0) {
    name = String.fromCharCode(65 + (temp % 26)) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
};

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

export const FormulaBar = () => {
  const activeCell = useSheetStore(state => state.activeCell);
  const data = useSheetStore(state => state.data);
  const setCellData = useSheetStore(state => state.setCellData);
  
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (activeCell) {
      const cell = data[activeCell];
      setInputValue(cell?.f ?? cell?.v?.toString() ?? '');
    } else {
      setInputValue('');
    }
  }, [activeCell, data]);

  let displayRef = '';
  if (activeCell) {
    const { r, c } = parseRef(activeCell);
    displayRef = `${getColName(c)}${r + 1}`;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (activeCell) {
      const isFormula = e.target.value.startsWith('=');
      setCellData(activeCell, { 
        [isFormula ? 'f' : 'v']: e.target.value,
        ...(!isFormula && { f: undefined }) 
      });
    }
  };

  return (
    <div className="flex items-center border-b border-border bg-surface p-1 shadow-sm relative z-10 h-9">
      <div className="flex flex-1 items-center px-2">
        <input
          type="text"
          className="w-full bg-transparent outline-none font-mono text-sm text-textMain placeholder-textMuted/50"
          value={inputValue}
          onChange={handleChange}
          placeholder="Enter a value or formula (e.g. =SUM(A1:B2))"
        />
      </div>
    </div>
  );
};
