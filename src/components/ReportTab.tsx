import React, { useState } from 'react';
import { Target, Sparkles, Edit3, Download, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

interface ReportTabProps {
  data: any[];
  metadata: { name: string; rows: number; columns: number } | null;
  savedCharts: {url: string, name: string}[];
  setSavedCharts: React.Dispatch<React.SetStateAction<{url: string, name: string}[]>>;
}

const STRATEGY_FOCUSES = [
  'Cost Reduction',
  'Revenue Growth',
  'Risk Management',
  'Customer Retention',
  'Operational Efficiency',
  'General Insight'
];

export default function ReportTab({ data, metadata, savedCharts, setSavedCharts }: ReportTabProps) {
  const [strategyFocus, setStrategyFocus] = useState(STRATEGY_FOCUSES[0]);
  const [reportContent, setReportContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!data || data.length === 0) {
      setError("No data available to analyze.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setIsEditing(false);
    
    try {
      // Send a sample of data (e.g., top 10 rows) + metadata
      const sample = data.slice(0, 10);
      
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataSample: sample,
          dataContext: metadata,
          strategyFocus
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setReportContent(result.result);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AI_Report_${metadata?.name || 'Data'}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 h-full bg-slate-50 min-h-[600px]">
      {/* Sidebar Controls */}
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg">
            <Target size={20} className="text-indigo-600" />
            Report Customization
          </h3>
          
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy Focus</label>
            <select 
              value={strategyFocus} 
              onChange={(e) => setStrategyFocus(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer"
            >
              {STRATEGY_FOCUSES.map(focus => <option key={focus} value={focus}>{focus}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">Select the business objective for the AI to model strategies against.</p>
          </div>

          <button 
            onClick={generateReport}
            disabled={isLoading || data?.length === 0}
            className="mt-4 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl flex items-center gap-2 justify-center transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {reportContent ? 'Regenerate Report' : 'Generate AI Report'}
          </button>
        </div>

        {reportContent && !isEditing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm uppercase tracking-wider">
              Actions
            </h3>
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl flex items-center gap-2 justify-center transition-all shadow-sm"
            >
              <Edit3 size={16} /> Edit Strategy
            </button>
            <button 
              onClick={exportPDF}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl flex items-center gap-2 justify-center transition-all shadow-sm"
            >
              <Download size={16} /> Export to PDF
            </button>
          </motion.div>
        )}
      </div>

      {/* Main Report Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 border-b border-rose-100 text-rose-600 text-sm font-medium">
            {error}
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          {!reportContent && !isLoading && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex-1 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-4"
            >
              <Sparkles size={48} className="text-slate-300 mx-auto" />
              <div>
                <div className="text-lg text-slate-600 mb-1 font-semibold">AI-Powered Insights</div>
                <div className="text-sm max-w-sm mx-auto font-medium">
                  Generate an Executive Summary and Actionable Next Steps based on your dataset and chosen strategy.
                </div>
              </div>
            </motion.div>
          )}

          {isLoading && (
             <motion.div 
               key="loading"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="flex-1 p-12 text-center text-indigo-600 flex flex-col items-center justify-center gap-4"
             >
              <RefreshCw size={40} className="animate-spin opacity-50" />
              <div className="text-sm font-medium animate-pulse">Analyzing patterns and generating strategy...</div>
            </motion.div>
          )}

          {reportContent && !isLoading && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col h-full"
            >
              {isEditing ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Interactive Editor</span>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Save & Preview
                    </button>
                  </div>
                  <textarea 
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    className="flex-1 w-full p-6 outline-none resize-none font-mono text-sm bg-slate-50 text-slate-700"
                    placeholder="Format report in markdown..."
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8" id="report-content">
                  <div className="max-w-3xl mx-auto prose prose-slate prose-indigo">
                    <div className="mb-8 border-b border-slate-200 pb-4">
                      <h1 className="text-3xl font-bold text-slate-900 m-0 font-display tracking-tight">Strategic Data Report</h1>
                      <div className="text-sm text-slate-500 mt-2 font-medium">
                         Generated for {metadata?.name || 'Dataset'} • Focus: <span className="text-indigo-600">{strategyFocus}</span>
                      </div>
                    </div>
                    <div className="markdown-body text-slate-700 leading-relaxed">
                      <Markdown>{reportContent}</Markdown>
                    </div>
                    
                    {savedCharts.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-slate-200">
                        <div className="flex justify-between items-end mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 m-0 font-display">Appendix: Visualizations</h2>
                          <button 
                            onClick={() => setSavedCharts([])}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold uppercase tracking-wider transition-colors"
                          >
                            Clear Visualizations
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-8">
                          {savedCharts.map((chart, idx) => (
                            <div key={idx} className="bg-white border text-center p-4 rounded-xl break-inside-avoid shadow-sm hover:shadow-md transition-shadow">
                              <h4 className="font-semibold text-slate-700 mb-4">{chart.name}</h4>
                              <img src={chart.url} alt={chart.name} className="w-full max-w-2xl mx-auto rounded-lg shadow-sm border border-slate-100" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
