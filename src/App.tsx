import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadCloud, FileType, AlertCircle, CheckCircle2, ChevronRight, BarChart as BarChartIcon, Columns, LogOut } from 'lucide-react';
import CleaningTab from './components/CleaningTab';
import VisTab from './components/VisTab';
import ReportTab from './components/ReportTab';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [data, setData] = useState<any[] | null>(null);
  const [metadata, setMetadata] = useState<{ name: string; rows: number; columns: number } | null>(null);
  const [savedCharts, setSavedCharts] = useState<{url: string, name: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Raw Data' | 'Cleaning' | 'Analysis and Visualizations' | 'Report and Strategy'>('Raw Data');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  const [dataHistory, setDataHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const processData = (parsedData: any[], fileName: string) => {
    if (parsedData.length === 0) {
      setError("The uploaded file is empty.");
      return;
    }
    
    // Check if the data is an array of objects or array of arrays
    let formattedData = parsedData;
    if (Array.isArray(parsedData[0]) && parsedData[0].length > 0) {
      const headers = parsedData[0];
      formattedData = parsedData.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index];
        });
        return obj;
      });
    }

    const columns = Object.keys(formattedData[0] || {}).length;
    setData(formattedData);
    setDataHistory([formattedData]);
    setHistoryIndex(0);
    setMetadata({ name: fileName, rows: formattedData.length, columns });
    setError(null);
    setCurrentPage(1);
  };

  const handleFileUpload = (file: File) => {
    setError(null);
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV Parsing Issues:", results.errors);
          }
          processData(results.data, fileName);
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
        }
      });
    } else if (extension === 'xls' || extension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          processData(json, fileName);
        } catch (err: any) {
          setError(`Error parsing Excel file: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setError("Error reading the file.");
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported file format. Please upload a CSV or Excel file.");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const resetData = () => {
    setData(null);
    setMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500 animate-pulse">Loading...</p>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/60 max-w-md w-full text-center border border-slate-100"
          >
            <h1 className="text-3xl font-bold text-slate-900 mb-2">AIData</h1>
            <p className="text-slate-500 mb-8">AI-powered data analytics workspace.</p>
            <button 
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              Sign in with Google
            </button>
          </motion.div>
        </div>
      ) : (
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="flex flex-col gap-3 items-center justify-center text-center py-6 relative">
          <div className="absolute right-0 top-6 flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:inline-block">{user.email}</span>
            <button onClick={logout} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600 rounded-lg transition-colors" title="Sign out">
              <LogOut size={20} />
            </button>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 font-display"
          >
            AIData <span className="text-indigo-600">- AI for Data Analytics</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 max-w-2xl"
          >
            Import your dataset into our powerful, interactive workspace to begin intelligent exploratory data analysis.
          </motion.p>
        </header>

        {!data ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`border-2 border-dashed rounded-3xl p-16 transition-all duration-300 ease-in-out flex flex-col items-center justify-center text-center gap-6 cursor-pointer
              ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl shadow-indigo-100' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50 hover:shadow-xl hover:shadow-slate-200/50'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-2 shadow-inner"
            >
              <UploadCloud size={40} />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Drop your dataset here</h3>
              <p className="text-base text-slate-500 mt-2 font-medium">Supports CSV, XLS, XLSX formats up to 50MB</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="mt-6 flex items-center gap-2 text-rose-600 bg-rose-50 px-5 py-3 rounded-xl text-sm border border-rose-100"
              >
                <AlertCircle size={18} />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <FileType size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    {metadata?.name}
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </h3>
                  <div className="text-sm font-medium text-slate-500 flex gap-4 mt-1">
                    <span className="flex items-center gap-1"><BarChartIcon size={14} />{metadata?.rows.toLocaleString()} Rows</span>
                    <span className="flex items-center gap-1"><Columns size={14} />{metadata?.columns.toLocaleString()} Columns</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={resetData}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-colors"
              >
                Upload Different File
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 overflow-x-auto justify-center">
                {(['Raw Data', 'Cleaning', 'Analysis and Visualizations', 'Report and Strategy'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${activeTab === tab ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                  >
                    {activeTab === tab && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 relative min-h-[600px] bg-slate-50/30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    {activeTab === 'Raw Data' && (
                      <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <h3 className="font-semibold text-slate-800">Data Preview</h3>
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
                        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[600px] bg-white">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                              <tr>
                                {Object.keys(data[0] || {}).map((header, i) => (
                                  <th key={i} className="p-3 font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row, i) => (
                                <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                                  {Object.values(row).map((val: any, j) => (
                                    <td key={j} className="p-3 text-slate-600 whitespace-nowrap truncate max-w-xs xl:max-w-sm" title={String(val)}>
                                      {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">null</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Cleaning' && (
                      <CleaningTab 
                        data={data as any[]} 
                        setData={setData as any} 
                        metadata={metadata} 
                        setMetadata={setMetadata}
                        dataHistory={dataHistory}
                        setDataHistory={setDataHistory}
                        historyIndex={historyIndex}
                        setHistoryIndex={setHistoryIndex}
                      />
                    )}

                    {activeTab === 'Analysis and Visualizations' && (
                      <VisTab data={data as any[]} onSaveChart={(chart) => setSavedCharts(prev => [...prev, chart])} />
                    )}

                    {activeTab === 'Report and Strategy' && (
                      <div className="h-full overflow-auto">
                        <ReportTab data={data as any[]} metadata={metadata} savedCharts={savedCharts} setSavedCharts={setSavedCharts} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Footer */}
        <footer className="mt-8 pb-4 text-center text-sm text-slate-500">
          Powered by Google Gemini (DWR)
        </footer>
      </div>
      )}
    </div>
  );
}

