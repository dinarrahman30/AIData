import React, { useState, useMemo } from 'react';
import { IterationCcw, Type, Scissors, AlertTriangle, Layers, Info, Copy, Undo2, Redo2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CleaningTabProps {
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  metadata: { name: string; rows: number; columns: number } | null;
  setMetadata: React.Dispatch<React.SetStateAction<{ name: string; rows: number; columns: number } | null>>;
  dataHistory: any[][];
  setDataHistory: React.Dispatch<React.SetStateAction<any[][]>>;
  historyIndex: number;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function CleaningTab({ data, setData, metadata, setMetadata, dataHistory, setDataHistory, historyIndex, setHistoryIndex }: CleaningTabProps) {
  const [selectedCol, setSelectedCol] = useState<string>('');
  const [customFillValue, setCustomFillValue] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;
  
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const duplicatesCount = useMemo(() => {
    if (!data || data.length === 0) return 0;
    const seen = new Set();
    let duplicates = 0;
    data.forEach(row => {
      const str = JSON.stringify(row);
      if (seen.has(str)) {
        duplicates++;
      } else {
        seen.add(str);
      }
    });
    return duplicates;
  }, [data]);

  const columnStats = useMemo(() => {
    if (!data || !selectedCol) return null;
    let missing = 0;
    let numCount = 0;
    let strCount = 0;
    let boolCount = 0;

    const numValues: number[] = [];

    data.forEach(row => {
      const val = row[selectedCol];
      if (val === null || val === undefined || val === '') {
        missing++;
      } else {
        const type = typeof val;
        if (type === 'number' || (type === 'string' && val.trim() !== '' && !isNaN(Number(val)))) {
          numCount++;
          numValues.push(Number(val));
        } else if (type === 'boolean' || val === 'true' || val === 'false') {
          boolCount++;
        } else {
          strCount++;
        }
      }
    });

    const total = data.length;
    let inferredType = 'String';
    if (numCount >= strCount && numCount >= boolCount && numCount > 0) inferredType = 'Number';
    else if (boolCount > strCount && boolCount > numCount) inferredType = 'Boolean';

    let outliersCount = 0;
    if (inferredType === 'Number' && numValues.length > 0) {
      const mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      const stdDev = Math.sqrt(numValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / numValues.length);
      if (stdDev > 0) {
        numValues.forEach(num => {
          const zScore = Math.abs((num - mean) / stdDev);
          if (zScore > 3) outliersCount++;
        });
      }
    }

    return {
      total,
      missing,
      missingPercentage: total > 0 ? ((missing / total) * 100).toFixed(1) : '0',
      inferredType,
      outliersCount
    };
  }, [data, selectedCol]);

  // If no column is selected initially, select the first one
  React.useEffect(() => {
    if (!selectedCol && columns.length > 0) {
      setSelectedCol(columns[0]);
    }
  }, [columns, selectedCol]);

  const saveUpdatedData = (newData: any[]) => {
    setData(newData);
    // Discard any future history if we are not at the end
    const newHistory = dataHistory.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setDataHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    updateMetadata(newData);
    setCurrentPage(1); // Reset page on data change
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevData = dataHistory[prevIndex];
      setData(prevData);
      updateMetadata(prevData);
    }
  };

  const handleRedo = () => {
    if (historyIndex < dataHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextData = dataHistory[nextIndex];
      setData(nextData);
      updateMetadata(nextData);
    }
  };

  const updateMetadata = (newData: any[]) => {
    if (metadata) {
      setMetadata({
        ...metadata,
        rows: newData.length,
        columns: Object.keys(newData[0] || {}).length
      });
    }
  };

  // 1. Missing Values
  const isMissing = (val: any) => {
    if (val === null || val === undefined || val === '') return true;
    if (typeof val === 'number' && isNaN(val)) return true;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (['nan', 'none', 'n/a', 'na', 'null', 'undefined'].includes(lower)) return true;
    }
    return false;
  };

  const handleMissingValues = (method: 'mean' | 'median' | 'mode' | 'drop' | 'custom', customValue?: string) => {
    if (!selectedCol) return;
    
    let newData = [...data];
    
    if (method === 'drop') {
      newData = newData.filter(row => !isMissing(row[selectedCol]));
    } else {
      let fillValue: any = null;
      const validValues = newData.filter(r => !isMissing(r[selectedCol])).map(r => r[selectedCol]);
      
      if (validValues.length > 0) {
        if (method === 'mean') {
          const numbers = validValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number);
          if (numbers.length > 0) {
            fillValue = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          }
        } else if (method === 'median') {
          const numbers = validValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number).sort((a, b) => a - b);
          if (numbers.length > 0) {
            const mid = Math.floor(numbers.length / 2);
            fillValue = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
          }
        } else if (method === 'mode') {
          const counts: Record<string, number> = {};
          validValues.forEach(v => counts[String(v)] = (counts[String(v)] || 0) + 1);
          fillValue = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }
      }
      
      if (method === 'custom') {
        fillValue = customValue;
      }

      if (fillValue !== null) {
        newData = newData.map(row => {
          if (isMissing(row[selectedCol])) {
            return { ...row, [selectedCol]: fillValue };
          }
          return row;
        });
      }
    }

    saveUpdatedData(newData);
  };

  // 2. Fix Data Types
  const handleFixDataType = (type: 'string' | 'number' | 'boolean') => {
    if (!selectedCol) return;
    const newData = data.map(row => {
      let val = row[selectedCol];
      let newVal = val;
      if (val !== null && val !== undefined && val !== '') {
        if (type === 'string') newVal = String(val);
        else if (type === 'number') newVal = Number(val);
        else if (type === 'boolean') {
          if (typeof val === 'string') newVal = val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
          else newVal = Boolean(val);
        }
      }
      return { ...row, [selectedCol]: newVal };
    });
    saveUpdatedData(newData);
  };

  // 3. Formatting
  const handleFormatting = (action: 'uppercase' | 'lowercase' | 'titlecase' | 'trim') => {
    if (!selectedCol) return;
    const newData = data.map(row => {
      let val = row[selectedCol];
      if (typeof val === 'string') {
        if (action === 'uppercase') val = val.toUpperCase();
        else if (action === 'lowercase') val = val.toLowerCase();
        else if (action === 'trim') val = val.trim();
        else if (action === 'titlecase') {
          val = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        }
      }
      return { ...row, [selectedCol]: val };
    });
    saveUpdatedData(newData);
  };

  // 4. Remove Duplicates
  const handleRemoveDuplicates = () => {
    const seen = new Set();
    const newData = data.filter(row => {
      const str = JSON.stringify(row);
      if (seen.has(str)) return false;
      seen.add(str);
      return true;
    });
    saveUpdatedData(newData);
  };

  // 5. Handle Outliers (Z-Score)
  const handleOutliers = (action: 'drop' | 'cap') => {
    if (!selectedCol) return;
    const values = data.map(r => r[selectedCol]).filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number);
    if (values.length === 0) return;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    if (stdDev === 0) return; // All values are same

    const zScoreThreshold = 3;

    if (action === 'drop') {
      const newData = data.filter(row => {
        const val = row[selectedCol];
        if (val === null || val === undefined || val === '') return true;
        const num = Number(val);
        if (isNaN(num)) return true;
        const zScore = Math.abs((num - mean) / stdDev);
        return zScore <= zScoreThreshold;
      });
      saveUpdatedData(newData);
    } else if (action === 'cap') {
      const minBound = mean - zScoreThreshold * stdDev;
      const maxBound = mean + zScoreThreshold * stdDev;
      const newData = data.map(row => {
        const val = row[selectedCol];
        if (val === null || val === undefined || val === '') return row;
        const num = Number(val);
        if (isNaN(num)) return row;
        let newVal = num;
        if (num < minBound) newVal = minBound;
        if (num > maxBound) newVal = maxBound;
        return { ...row, [selectedCol]: newVal };
      });
      saveUpdatedData(newData);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start gap-6 p-6 h-full min-h-[500px]">
      {/* Column Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 max-h-[600px]">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
             <Layers size={20} className="text-indigo-600" />
             Select Column
           </h3>
           <p className="text-xs text-slate-500 mb-2 font-medium">Choose a column to apply operations.</p>
           <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-1 relative">
             {columns.map(col => (
               <button
                 key={col}
                 onClick={() => setSelectedCol(col)}
                 className={`relative w-full text-left px-4 py-2.5 text-sm rounded-xl transition-colors font-medium border border-transparent flex items-center justify-between ${selectedCol === col ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'hover:bg-slate-50 hover:border-slate-200 text-slate-600 hover:text-slate-900'}`}
               >
                 <span className="truncate block" title={col}>{col}</span>
                 {selectedCol === col && (
                   <motion.div 
                     layoutId="selectedColIndicator"
                     className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-indigo-500 rounded-r-md"
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                   />
                 )}
               </button>
             ))}
           </div>
        </div>

        {/* Global Actions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
           <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
             <Copy size={16} className="text-indigo-600" />
             Dataset Info
           </h3>
           <div className="grid grid-cols-2 gap-2 text-center text-sm mb-1">
             <div className="bg-white border border-slate-200 p-2 rounded-lg">
               <div className="font-semibold text-slate-800">{metadata?.rows.toLocaleString() || 0}</div>
               <div className="text-[10px] text-slate-500 uppercase tracking-wide">Rows</div>
             </div>
             <div className="bg-white border border-slate-200 p-2 rounded-lg">
               <div className="font-semibold text-slate-800">{duplicatesCount.toLocaleString()}</div>
               <div className="text-[10px] text-slate-500 uppercase tracking-wide">Duplicates</div>
             </div>
           </div>
           <button 
             onClick={handleRemoveDuplicates}
             disabled={duplicatesCount === 0}
             className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm rounded-lg flex items-center gap-2 justify-center transition-colors shadow-sm"
           >
             <Layers size={16} />
             Drop Duplicate Rows
           </button>
        </div>

        {/* Memory / History */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
           <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
             <IterationCcw size={16} className="text-slate-600" />
             Memory History
           </h3>
           <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={handleUndo}
               disabled={historyIndex <= 0}
               className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm rounded-lg flex items-center gap-2 justify-center transition-colors shadow-sm"
             >
               <Undo2 size={16} />
               Undo
             </button>
             <button 
               onClick={handleRedo}
               disabled={historyIndex >= dataHistory.length - 1}
               className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm rounded-lg flex items-center gap-2 justify-center transition-colors shadow-sm"
             >
               <Redo2 size={16} />
               Redo
             </button>
           </div>
        </div>
      </div>

      {/* Cleaning Operations Panels */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        
        {/* Column Stats Banner */}
        {columnStats && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-wrap gap-6 items-center shadow-sm"
          >
             <div className="flex items-center gap-2">
               <Info size={18} className="text-indigo-600" />
               <h3 className="font-semibold text-slate-800">Column Stats : <span className="text-indigo-700">{selectedCol}</span></h3>
             </div>
             <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
               <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200. shadow-sm">
                 <span className="font-semibold text-slate-800">{columnStats.inferredType}</span>
                 <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Type</span>
               </div>
               <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                 <span className={`font-semibold ${columnStats.missing > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                   {columnStats.missing.toLocaleString()} ({columnStats.missingPercentage}%)
                 </span>
                 <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Missing</span>
               </div>
               {columnStats.inferredType === 'Number' && (
                 <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                   <span className={`font-semibold ${columnStats.outliersCount > 0 ? 'text-purple-600' : 'text-slate-800'}`}>
                     {columnStats.outliersCount.toLocaleString()}
                   </span>
                   <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Outliers</span>
                 </div>
               )}
               <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                 <span className="font-semibold text-slate-800">{columnStats.total.toLocaleString()}</span>
                 <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Total</span>
               </div>
             </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Missing Values */}
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 className="font-semibold text-slate-800">Missing Values</h3>
          </div>
          <p className="text-xs text-slate-500">Handle null, undefined, or empty values.</p>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button onClick={() => handleMissingValues('drop')} className="func-btn">Drop Rows</button>
            <button onClick={() => handleMissingValues('mean')} className="func-btn">Fill Mean</button>
            <button onClick={() => handleMissingValues('median')} className="func-btn">Fill Median</button>
            <button onClick={() => handleMissingValues('mode')} className="func-btn">Fill Mode</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-1 w-full">
            <input 
              type="text" 
              placeholder="Custom text..." 
              value={customFillValue}
              onChange={(e) => setCustomFillValue(e.target.value)}
              className="flex-1 w-full sm:w-auto text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-0" 
            />
            <button 
              onClick={() => handleMissingValues('custom', customFillValue)} 
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              Fill Text
            </button>
          </div>
        </motion.div>

        {/* Data Types */}
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Type size={20} />
            <h3 className="font-semibold text-slate-800">Fix Data Type</h3>
          </div>
          <p className="text-xs text-slate-500">Force convert column to a specific data type.</p>
          <div className="flex flex-col gap-2 mt-auto">
            <button onClick={() => handleFixDataType('string')} className="func-btn">Convert to String</button>
            <button onClick={() => handleFixDataType('number')} className="func-btn">Convert to Number</button>
            <button onClick={() => handleFixDataType('boolean')} className="func-btn">Convert to Boolean</button>
          </div>
        </motion.div>

        {/* Outliers */}
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
          <div className="flex items-center gap-2 text-purple-600">
            <IterationCcw size={20} />
            <h3 className="font-semibold text-slate-800">Handle Outliers</h3>
          </div>
          <p className="text-xs text-slate-500">Detect and handle numerical outliers (Z-Score &gt; 3).</p>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button onClick={() => handleOutliers('drop')} className="func-btn">Drop Row</button>
            <button onClick={() => handleOutliers('cap')} className="func-btn">Cap Values</button>
          </div>
        </motion.div>

        {/* Formatting */}
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
          <div className="flex items-center gap-2 text-green-600">
            <Scissors size={20} />
            <h3 className="font-semibold text-slate-800">Formatting</h3>
          </div>
          <p className="text-xs text-slate-500">Standardize string formats and spacing.</p>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button onClick={() => handleFormatting('trim')} className="func-btn">Trim Space</button>
            <button onClick={() => handleFormatting('lowercase')} className="func-btn">lower case</button>
            <button onClick={() => handleFormatting('uppercase')} className="func-btn">UPPER CASE</button>
            <button onClick={() => handleFormatting('titlecase')} className="func-btn">Title Case</button>
          </div>
        </motion.div>
        </div>

        {/* Cleaned Data Preview */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-semibold text-slate-800">Cleaned Data Preview</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} rows
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.length / rowsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(data.length / rowsPerPage)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[400px] bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                <tr>
                  {Object.keys(data[0] || {}).map((header, i) => (
                    <th key={i} className={`p-3 font-semibold whitespace-nowrap border-b border-slate-200 ${header === selectedCol ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className={`p-3 whitespace-nowrap truncate max-w-xs xl:max-w-sm ${Object.keys(data[0] || {})[j] === selectedCol ? 'bg-indigo-50/30 text-indigo-900 font-medium' : 'text-slate-600'}`} title={String(val)}>
                        {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
      {/* Dynamic styles for buttons */}
      <style>{`
        .func-btn {
          @apply px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-all text-center;
        }
      `}</style>
    </div>
  );
}
