import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  ScatterChart, Scatter, 
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, Settings2, SlidersHorizontal, ZoomOut, Pen, Save } from 'lucide-react';
import html2canvas from 'html2canvas';

interface VisTabProps {
  data: any[];
  onSaveChart: (chart: {url: string, name: string}) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function VisTab({ data, onSaveChart }: VisTabProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'pie' | 'area'>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>('');
  const [yAxisCol, setYAxisCol] = useState<string>('');
  const [topN, setTopN] = useState<number | 'all'>('all');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');

  // Zooming state
  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [domainLeft, setDomainLeft] = useState<string | number>('dataMin');
  const [domainRight, setDomainRight] = useState<string | number>('dataMax');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const zoomOut = () => {
    setRefAreaLeft('');
    setRefAreaRight('');
    setDomainLeft('dataMin');
    setDomainRight('dataMax');
    setIsZoomed(false);
  };

  const zoom = () => {
    let left = refAreaLeft;
    let right = refAreaRight;

    if (left === right || right === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // Need chartData inside here to swap if drawn right-to-left
    // But since zoom doesn't take chartData directly, we can just use chartData from the outside scope
    const leftIndex = chartData.findIndex((d: any) => d.name === left);
    const rightIndex = chartData.findIndex((d: any) => d.name === right);
    if (leftIndex > rightIndex) {
      const temp = left;
      left = right;
      right = temp;
    }

    setRefAreaLeft('');
    setRefAreaRight('');
    setDomainLeft(left);
    setDomainRight(right);
    setIsZoomed(true);
  };

  const handleSaveChart = async () => {
    const element = document.getElementById('chart-container');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      onSaveChart({
        url: imgData,
        name: `${chartType.toUpperCase()} - ${yAxisCol} by ${xAxisCol}`
      });
    } catch (err) {
      console.error("Failed to capture chart", err);
    }
  };

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Guess which columns are numeric based on the first few rows
    return columns.filter(col => {
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const val = data[i][col];
        if (val !== null && val !== undefined && val !== '') {
          return typeof val === 'number' || !isNaN(Number(val));
        }
      }
      return false;
    });
  }, [columns, data]);

  React.useEffect(() => {
    if (!xAxisCol && columns.length > 0) {
      setXAxisCol(columns[0]);
    }
    if (!yAxisCol && numericColumns.length > 0) {
      setYAxisCol(numericColumns[0]);
    } else if (!yAxisCol && columns.length > 0) {
      setYAxisCol(columns[0]);
    }
  }, [columns, numericColumns, xAxisCol, yAxisCol]);

  const chartData = useMemo(() => {
    if (!data || !xAxisCol || !yAxisCol) return [];

    let processedData = data.map(row => ({
      name: String(row[xAxisCol]),
      value: Number(row[yAxisCol]) || 0,
      original: row
    }));

    // Grouping by X axis if there are identical X values (optional, but good for categorical X)
    const grouped = processedData.reduce((acc: any, curr) => {
      if (!acc[curr.name]) {
        acc[curr.name] = { 
          name: curr.name, 
          sum: 0, 
          count: 0, 
          min: curr.value, 
          max: curr.value 
        };
      }
      acc[curr.name].sum += curr.value;
      acc[curr.name].count += 1;
      if (curr.value < acc[curr.name].min) acc[curr.name].min = curr.value;
      if (curr.value > acc[curr.name].max) acc[curr.name].max = curr.value;
      return acc;
    }, {});
    
    // Convert back to array
    processedData = Object.values(grouped).map((g: any) => {
      let finalValue = g.sum;
      if (aggregation === 'sum') finalValue = g.sum;
      else if (aggregation === 'avg') finalValue = g.sum / g.count;
      else if (aggregation === 'count') finalValue = g.count;
      else if (aggregation === 'min') finalValue = g.min;
      else if (aggregation === 'max') finalValue = g.max;

      return {
        name: g.name,
        value: Number(finalValue.toFixed(2)) // rounding to 2 decimal places max
      };
    });

    // Default sorting for categorical X: descending by value so Top N makes sense
    processedData.sort((a, b) => b.value - a.value);

    if (topN !== 'all') {
      processedData = processedData.slice(0, topN as number);
    }

    return processedData;
  }, [data, xAxisCol, yAxisCol, topN, aggregation]);

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 h-full min-h-[600px] bg-slate-50">
      
      {/* Settings Sidebar */}
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
            <Settings2 size={20} className="text-indigo-600" />
            Chart Settings
          </h3>
          
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setChartType('bar')} className={`flex items-center gap-2 p-2 rounded-xl border text-sm transition-colors font-medium border-transparent ${chartType === 'bar' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                <BarChart2 size={16} /> Bar
              </button>
              <button onClick={() => setChartType('line')} className={`flex items-center gap-2 p-2 rounded-xl border text-sm transition-colors font-medium border-transparent ${chartType === 'line' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                <LineChartIcon size={16} /> Line
              </button>
              <button onClick={() => setChartType('area')} className={`flex items-center gap-2 p-2 rounded-xl border text-sm transition-colors font-medium border-transparent ${chartType === 'area' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                <Activity size={16} /> Area
              </button>
              <button onClick={() => setChartType('pie')} className={`flex items-center gap-2 p-2 rounded-xl border text-sm transition-colors font-medium border-transparent ${chartType === 'pie' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                <PieChartIcon size={16} /> Pie
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">X-Axis (Label)</label>
            <select 
              value={xAxisCol} 
              onChange={(e) => setXAxisCol(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Y-Axis (Value)</label>
            <select 
              value={yAxisCol} 
              onChange={(e) => setYAxisCol(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
              {numericColumns.length === 0 && columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aggregation</label>
            <select 
              value={aggregation} 
              onChange={(e) => setAggregation(e.target.value as 'sum' | 'avg' | 'count' | 'min' | 'max')}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
            <SlidersHorizontal size={20} className="text-indigo-600" />
            Data Slices
          </h3>
          
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top N Data</label>
            <select 
              value={topN === 'all' ? 'all' : topN.toString()} 
              onChange={(e) => setTopN(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="all">All Data</option>
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Filters data by highest Y-Axis values.</p>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px]">
        {chartData.length === 0 ? (
          <div className="text-slate-400 text-sm">No data available for the selected columns.</div>
        ) : (
          <div className="w-full h-full min-h-[450px] flex flex-col">
            <div className="flex justify-between items-center w-full mb-4 px-4">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <Pen size={14} /> Highlight/drag on chart area to zoom in
              </span>
              <div className="flex gap-2">
                {isZoomed && (
                  <button 
                    onClick={zoomOut}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full transition-colors font-medium"
                  >
                    <ZoomOut size={14} /> Reset Zoom
                  </button>
                )}
                <button 
                  onClick={handleSaveChart}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors font-medium"
                >
                  <Save size={14} /> Add to Report
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-white relative p-4 rounded-xl" id="chart-container">
              <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart 
                  data={isZoomed ? chartData.slice(
                    Math.min(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)),
                    Math.max(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)) + 1
                  ) : chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  onMouseDown={(e: any) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
                  onMouseMove={(e: any) => e && refAreaLeft && e.activeLabel && setRefAreaRight(e.activeLabel)}
                  onMouseUp={zoom}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="value" name={`${aggregation.toUpperCase()} of ${yAxisCol}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  {refAreaLeft && refAreaRight ? (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
                  ) : null}
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart 
                  data={isZoomed ? chartData.slice(
                    Math.min(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)),
                    Math.max(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)) + 1
                  ) : chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  onMouseDown={(e: any) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
                  onMouseMove={(e: any) => e && refAreaLeft && e.activeLabel && setRefAreaRight(e.activeLabel)}
                  onMouseUp={zoom}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="value" name={`${aggregation.toUpperCase()} of ${yAxisCol}`} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  {refAreaLeft && refAreaRight ? (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#10b981" fillOpacity={0.1} />
                  ) : null}
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart 
                  data={isZoomed ? chartData.slice(
                    Math.min(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)),
                    Math.max(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)) + 1
                  ) : chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  onMouseDown={(e: any) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
                  onMouseMove={(e: any) => e && refAreaLeft && e.activeLabel && setRefAreaRight(e.activeLabel)}
                  onMouseUp={zoom}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="value" name={`${aggregation.toUpperCase()} of ${yAxisCol}`} stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} />
                  {refAreaLeft && refAreaRight ? (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#8b5cf6" fillOpacity={0.1} />
                  ) : null}
                </AreaChart>
              ) : chartType === 'scatter' ? (
                 <ScatterChart 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  onMouseDown={(e: any) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
                  onMouseMove={(e: any) => e && refAreaLeft && e.activeLabel && setRefAreaRight(e.activeLabel)}
                  onMouseUp={zoom}
                 >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="name" name={xAxisCol} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                  <YAxis dataKey="value" name={`${aggregation.toUpperCase()} of ${yAxisCol}`} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Scatter name="Data" data={isZoomed ? chartData.slice(
                    Math.min(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)),
                    Math.max(chartData.findIndex(d => d.name === domainLeft), chartData.findIndex(d => d.name === domainRight)) + 1
                  ) : chartData} fill="#ec4899" />
                  {refAreaLeft && refAreaRight ? (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#ec4899" fillOpacity={0.1} />
                  ) : null}
                </ScatterChart>
              ) : (
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
