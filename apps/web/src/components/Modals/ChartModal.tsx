import { useState, useMemo, useRef, useEffect, type FC } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  X, Download, BarChart3, LineChart, PieChart, AreaChart, 
  Sparkles, RefreshCw 
} from 'lucide-react';
import { useSheetStore } from '../../store/useSheetStore';
import { toast } from '../../store/useToastStore';

export type ChartModalType = 'bar' | 'line' | 'pie' | 'area';

interface ChartModalProps {
  type: ChartModalType;
  onClose: () => void;
}

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1], 10), c: parseInt(match[2], 10) };
};

const getColName = (c: number) => {
  let name = '';
  let temp = c;
  while (temp >= 0) {
    name = String.fromCharCode(65 + (temp % 26)) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
};

export const ChartModal: FC<ChartModalProps> = ({ type: initialType, onClose }) => {
  const [currentType, setCurrentType] = useState<ChartModalType>(initialType);
  const [chartTitle, setChartTitle] = useState('Data Analysis Chart');
  const echartsRef = useRef<ReactECharts>(null);

  const data = useSheetStore(state => state.data);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const activeCell = useSheetStore(state => state.activeCell);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Extract series and categories from selected range or surrounding data
  const chartData = useMemo(() => {
    let minR = 0, maxR = 0, minC = 0, maxC = 0;

    if (selectionRange) {
      const s = parseRef(selectionRange.start);
      const e = parseRef(selectionRange.end);
      minR = Math.min(s.r, e.r);
      maxR = Math.max(s.r, e.r);
      minC = Math.min(s.c, e.c);
      maxC = Math.max(s.c, e.c);
    } else if (activeCell) {
      const { r, c } = parseRef(activeCell);
      minR = Math.max(0, r - 5);
      maxR = r + 5;
      minC = c;
      maxC = c + 1;
    }

    const categories: string[] = [];
    const values: number[] = [];
    const multiSeries: { name: string; data: number[] }[] = [];

    // Check if multi-column selection
    const colCount = maxC - minC + 1;

    if (colCount >= 2) {
      // First column as labels, rest as series
      const seriesNames: string[] = [];
      for (let c = minC + 1; c <= maxC; c++) {
        const headerCell = data[`r_${minR}_c_${c}`];
        seriesNames.push(headerCell?.v?.toString() || `Series ${getColName(c)}`);
      }

      // Check if row minR is a header (text values)
      const firstRowHasHeaders = isNaN(Number(data[`r_${minR}_c_${minC + 1}`]?.v));
      const dataStartR = firstRowHasHeaders ? minR + 1 : minR;

      for (let c = 0; c < seriesNames.length; c++) {
        multiSeries.push({ name: seriesNames[c], data: [] });
      }

      for (let r = dataStartR; r <= maxR; r++) {
        const labelCell = data[`r_${r}_c_${minC}`];
        const label = labelCell?.v !== undefined && labelCell?.v !== null 
          ? String(labelCell.v) 
          : `Row ${r + 1}`;
        categories.push(label);

        for (let c = 0; c < seriesNames.length; c++) {
          const valCell = data[`r_${r}_c_${minC + 1 + c}`];
          const val = Number(valCell?.v);
          multiSeries[c].data.push(isNaN(val) ? 0 : val);
        }
      }
    } else {
      // Single column: auto-generate item labels
      for (let r = minR; r <= maxR; r++) {
        const cell = data[`r_${r}_c_${minC}`];
        const val = Number(cell?.v);
        if (!isNaN(val) && cell?.v !== undefined && cell?.v !== '') {
          categories.push(`Row ${r + 1}`);
          values.push(val);
        }
      }
      if (values.length === 0) {
        // Fallback demo data if selection is empty
        categories.push('Product A', 'Product B', 'Product C', 'Product D', 'Product E');
        values.push(120, 200, 150, 80, 270);
      }
    }

    return { categories, values, multiSeries };
  }, [data, selectionRange, activeCell]);

  const option = useMemo(() => {
    const isPie = currentType === 'pie';
    const isArea = currentType === 'area';
    const chartKind = currentType === 'area' ? 'line' : currentType;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

    if (isPie) {
      const pieData = chartData.categories.map((cat, idx) => ({
        name: cat,
        value: chartData.multiSeries.length > 0 ? (chartData.multiSeries[0].data[idx] ?? 0) : (chartData.values[idx] ?? 0)
      }));

      return {
        backgroundColor: 'transparent',
        title: {
          text: chartTitle,
          left: 'center',
          textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 600 }
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          textStyle: { color: '#f8fafc' },
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'horizontal',
          bottom: 10,
          textStyle: { color: '#94a3b8' }
        },
        series: [
          {
            name: 'Value',
            type: 'pie',
            radius: ['35%', '70%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#0f172a',
              borderWidth: 2
            },
            label: {
              show: true,
              color: '#cbd5e1'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            data: pieData
          }
        ]
      };
    }

    const series = chartData.multiSeries.length > 0 
      ? chartData.multiSeries.map((s, idx) => ({
          name: s.name,
          type: chartKind,
          smooth: true,
          data: s.data,
          itemStyle: { color: colors[idx % colors.length] },
          ...(isArea ? {
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: colors[idx % colors.length] + '80' },
                  { offset: 1, color: colors[idx % colors.length] + '05' }
                ]
              }
            }
          } : {})
        }))
      : [{
          name: 'Value',
          type: chartKind,
          smooth: true,
          data: chartData.values,
          itemStyle: { color: '#6366f1' },
          ...(isArea ? {
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#6366f180' },
                  { offset: 1, color: '#6366f105' }
                ]
              }
            }
          } : {})
        }];

    return {
      backgroundColor: 'transparent',
      title: {
        text: chartTitle,
        left: 'center',
        textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        textStyle: { color: '#f8fafc' }
      },
      legend: chartData.multiSeries.length > 1 ? {
        top: 30,
        textStyle: { color: '#94a3b8' }
      } : undefined,
      grid: {
        left: '4%',
        right: '4%',
        bottom: '10%',
        top: chartData.multiSeries.length > 1 ? 70 : 50,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.categories,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      series
    };
  }, [currentType, chartTitle, chartData]);

  const downloadChart = () => {
    const chartInstance = echartsRef.current?.getEchartsInstance();
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({
      pixelRatio: 2,
      backgroundColor: '#0f172a'
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
    toast('Chart downloaded as PNG', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <Sparkles size={18} />
            </div>
            <div>
              <input 
                type="text" 
                value={chartTitle} 
                onChange={(e) => setChartTitle(e.target.value)}
                className="bg-transparent text-base font-bold text-textMain outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors"
                title="Click to rename chart"
              />
              <p className="text-xs text-textMuted mt-0.5">
                {selectionRange 
                  ? `Rendered from selection (${selectionRange.start} → ${selectionRange.end})` 
                  : 'Rendered from current active range'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadChart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-border text-textMain text-xs font-semibold border border-border/70 transition-all"
              title="Download High-Res PNG"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chart Type Selector Bar */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-background/50 border-b border-border/40">
          <span className="text-xs font-semibold text-textMuted mr-2">Chart Type:</span>
          {(['bar', 'line', 'pie', 'area'] as ChartModalType[]).map((t) => {
            const Icon = t === 'bar' ? BarChart3 : t === 'line' ? LineChart : t === 'pie' ? PieChart : AreaChart;
            const isActive = currentType === t;
            return (
              <button
                key={t}
                onClick={() => setCurrentType(t)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  isActive 
                    ? 'bg-accent text-white shadow-md shadow-accent/20 font-bold' 
                    : 'text-textMuted hover:text-textMain hover:bg-surfaceHover'
                }`}
              >
                <Icon size={14} />
                <span>{t}</span>
              </button>
            );
          })}
        </div>

        {/* Chart Canvas */}
        <div className="p-6 h-[420px] bg-background/20 relative">
          <ReactECharts
            ref={echartsRef}
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-surface/50 flex items-center justify-between text-xs text-textMuted">
          <div className="flex items-center gap-2">
            <RefreshCw size={12} className="text-accent animate-spin-slow" />
            <span>Interactive visualization &bull; Zoom and hover for details</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surfaceHover hover:bg-border text-textMain text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
