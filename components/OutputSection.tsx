import React, { useState } from 'react';
import { Copy, Download, Grid, Layers, Terminal, RefreshCw, Bug } from 'lucide-react';
import { AppState } from '../types';

interface OutputSectionProps {
  state: AppState;
  onRegenerateShot?: (index: number) => void;
}

export const OutputSection: React.FC<OutputSectionProps> = ({ state, onRegenerateShot }) => {
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'EXTRACTED' | 'CODE' | 'DEBUG'>('PREVIEW');
  
  const markdownContent = state.generatedPromptText || "Awaiting execution brief...";

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    alert('Execution pack copied to clipboard.');
  };

  const downloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    state.extractedImages.forEach((img, index) => {
      downloadImage(img, `shot_${(index + 1).toString().padStart(2, '0')}.png`);
    });
  };

  return (
    <div className="h-full bg-zinc-950 text-white flex flex-col overflow-hidden">
      
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex-wrap">
        <button 
          onClick={() => setActiveTab('PREVIEW')}
          className={`flex items-center gap-2 px-6 py-5 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'PREVIEW' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-600 hover:text-white'}`}
        >
          <Grid size={14} /> Brain Ref
        </button>
        <button 
          onClick={() => setActiveTab('EXTRACTED')}
          disabled={state.extractedImages.length === 0}
          className={`flex items-center gap-2 px-6 py-5 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'EXTRACTED' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-600 hover:text-white'} ${state.extractedImages.length === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
        >
          <Layers size={14} /> Production
        </button>
        <button 
          onClick={() => setActiveTab('CODE')}
          className={`flex items-center gap-2 px-6 py-5 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'CODE' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-600 hover:text-white'}`}
        >
          <Terminal size={14} /> Brief
        </button>
        <button 
          onClick={() => setActiveTab('DEBUG')}
          className={`flex items-center gap-2 px-6 py-5 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'DEBUG' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-600 hover:text-white'}`}
        >
          <Bug size={14} /> Debug
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
        
        {/* PREVIEW TAB */}
        {activeTab === 'PREVIEW' && (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            {state.numberedCollage ? (
              <div className="relative group w-full shadow-2xl border border-zinc-800 aspect-[9/16] max-w-md bg-zinc-900">
                <img src={state.numberedCollage} alt="Numbered Collage" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button 
                        onClick={() => downloadImage(state.numberedCollage!, `grid_3x3_numbered.png`)}
                        className="bg-white text-black px-6 py-3 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 hover:bg-zinc-200 shadow-xl"
                    >
                        <Download size={14} /> Download Ref
                    </button>
                </div>
                <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 font-bold tracking-widest uppercase bg-black/60 px-3 py-1 backdrop-blur-sm border border-zinc-800/50">
                    BRAIN REFERENCE (A) — v2.5 GRID
                </div>
              </div>
            ) : (
               <div className="text-center space-y-6 opacity-20">
                 <div className="w-20 h-20 border border-zinc-600 flex items-center justify-center mx-auto rounded-full">
                    <Grid size={24} />
                 </div>
                 <p className="text-[10px] font-bold tracking-[0.3em] uppercase">Awaiting Execution</p>
               </div>
            )}
          </div>
        )}

        {/* EXTRACTED TAB */}
        {activeTab === 'EXTRACTED' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="flex justify-between items-center pb-6 border-b border-zinc-800">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">PRODUCTION ASSETS</h3>
                <button 
                    onClick={handleDownloadAll}
                    className="text-[10px] font-bold text-white underline decoration-zinc-700 hover:decoration-white underline-offset-8 uppercase tracking-widest"
                >
                    Download Batch
                </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {state.extractedImages.map((img, i) => (
                    <div key={i} className="relative group aspect-[9/16] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
                        <img src={img} alt={`Shot ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center">
                            <button 
                                onClick={() => downloadImage(img, `shot_${(i+1).toString().padStart(2, '0')}.png`)}
                                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-2xl"
                            >
                                <Download size={18} />
                            </button>
                            {onRegenerateShot && (
                              <button 
                                  onClick={() => onRegenerateShot(i)}
                                  className="p-3 bg-zinc-800 text-white rounded-full hover:scale-110 transition-transform shadow-2xl border border-zinc-600"
                              >
                                  <RefreshCw size={18} />
                              </button>
                            )}
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md text-[9px] font-bold border border-zinc-800 tracking-widest text-zinc-400">
                            { (i+1).toString().padStart(2, '0') }
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === 'CODE' && (
          <div className="max-w-3xl mx-auto h-full flex flex-col pt-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">EXECUTION BRIEF</h3>
                <button 
                    onClick={handleCopy}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border border-zinc-700 transition-colors"
                >
                    <Copy size={14} /> Copy Brief
                </button>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-900/50 border border-zinc-800 p-8 font-mono text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed selection:bg-white selection:text-black">
                {markdownContent}
            </div>
          </div>
        )}

        {/* DEBUG TAB */}
        {activeTab === 'DEBUG' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="p-6 bg-red-950/20 border border-red-900/50 text-red-400 flex items-start gap-4">
               <Bug size={20} className="flex-shrink-0" />
               <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Engine Diagnostic Panel</h4>
                 <p className="text-[11px] font-medium leading-relaxed opacity-80 uppercase">
                    Use this section to identify why images aren't appearing. 
                    Common issues: API Key invalid, Safety filters triggered, or Model mismatch.
                 </p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">API Status & Response</h3>
               <div className="bg-zinc-900 border border-zinc-800 p-6 font-mono text-[11px] overflow-auto max-h-[400px]">
                 {state.debugInfo ? (
                   <pre className="text-blue-400">{JSON.stringify(state.debugInfo, null, 2)}</pre>
                 ) : (
                   <p className="text-zinc-600 uppercase">No execution logs yet.</p>
                 )}
               </div>
            </div>

            {state.textResult && (
               <div className="space-y-4">
                 <h3 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Text Fallback / Error Message</h3>
                 <div className="bg-zinc-900 border border-zinc-800 p-6 font-mono text-[11px] text-zinc-300">
                   {state.textResult}
                 </div>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
