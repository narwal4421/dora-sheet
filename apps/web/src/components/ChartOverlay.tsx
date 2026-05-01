import { useState } from 'react';
import ReactECharts from 'echarts-for-react';

type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export const ChartOverlay = ({ sheetId, dataPayload }: { sheetId: string, dataPayload: string }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestChart = async () => {
    setLoading(true);
    setReason(null);
    try {
      // Assuming a generic fetcher that handles auth tokens
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Placeholder for actual auth
        },
        body: JSON.stringify({
          sheetId,
          prompt: `Based on this selected data: ${dataPayload}, suggest the best chart type.`
        })
      });

      const json = await res.json();
      if (json.success && json.data.tool_used === 'create_chart') {
        const { chartType: recommendedType, reason: recommendedReason } = json.data.result;
        setChartType(recommendedType as ChartType);
        setReason(recommendedReason);
      } else {
        setReason("AI couldn't suggest a chart type.");
      }
    } catch (e) {
      console.error(e);
      setReason("Failed to fetch AI suggestion.");
    } finally {
      setLoading(false);
    }
  };

  // Dummy option for ECharts based on selected type
  const getOption = () => {
    const baseOption = {
      tooltip: {},
      xAxis: chartType !== 'pie' ? { data: ['A', 'B', 'C', 'D'] } : undefined,
      yAxis: chartType !== 'pie' ? {} : undefined,
      series: [{
        name: 'Data',
        type: chartType,
        data: chartType === 'pie' 
          ? [{value: 5, name: 'A'}, {value: 20, name: 'B'}, {value: 36, name: 'C'}, {value: 10, name: 'D'}] 
          : [5, 20, 36, 10]
      }]
    };
    return baseOption;
  };

  return (
    <div className="absolute top-20 right-10 w-96 bg-white border border-gray-300 shadow-xl rounded-lg p-4 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Chart Settings</h3>
        <button 
          onClick={suggestChart} 
          disabled={loading}
          className="bg-accent text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Thinking...' : '✨ Suggest Chart'}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Type:</label>
        <select 
          value={chartType} 
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="border border-gray-300 rounded p-1 text-sm outline-none"
        >
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="scatter">Scatter</option>
        </select>
        
        {reason && (
          <div className="group relative ml-2 cursor-help text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
              <span className="font-bold text-blue-300">AI Suggested:</span> {reason}
            </div>
          </div>
        )}
      </div>

      <div className="h-64 border border-gray-100 rounded-md bg-gray-50 p-2">
        <ReactECharts option={getOption()} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};
