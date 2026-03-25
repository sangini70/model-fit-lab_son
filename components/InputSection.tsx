import React from 'react';
import { Upload, X, LayoutGrid, Smartphone } from 'lucide-react';
import { AppState, SideProfileOption, SittingOption, DetailOption } from '../types';
import { Button } from './Button';

interface InputSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onGenerate: () => void;
  onSetApiKey: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ state, setState, onGenerate, onSetApiKey }) => {

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setState(prev => ({ ...prev, referenceImage: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setState(prev => ({ ...prev, referenceImage: null }));
  };

  const updateState = (key: keyof AppState, value: any) => {
    setState(prev => {
      const newState = { ...prev, [key]: value };
      // LocalStorage persistence for specific HAND fields
      if (key === 'outfitAndTransform') localStorage.setItem('mf_hand_outfit', value);
      if (key === 'environment') localStorage.setItem('mf_hand_env', value);
      if (key === 'styleKeywords') localStorage.setItem('mf_hand_style', value);
      return newState;
    });
  };

  const isReady = !!state.referenceImage && !!state.outfitAndTransform;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10 space-y-10 border-r border-zinc-800 bg-black text-white scrollbar-hide">
      
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Execution</h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase">Visual Concept Matrix v2.5</p>
        </div>

        <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 gap-1">
            <button
                onClick={() => updateState('generationMode', 'CHAR_SHEET')}
                className={`py-3 text-[10px] font-bold tracking-widest uppercase flex flex-col items-center justify-center gap-2 transition-all ${state.generationMode === 'CHAR_SHEET' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <Smartphone size={14} /> Char Sheet
            </button>
            <button
                onClick={() => updateState('generationMode', 'GRID_3X3')}
                className={`py-3 text-[10px] font-bold tracking-widest uppercase flex flex-col items-center justify-center gap-2 transition-all ${state.generationMode === 'GRID_3X3' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <LayoutGrid size={14} /> 3x3 Grid
            </button>
        </div>
      </div>

      <div className="space-y-8">
        
        <div className="space-y-3">
          <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">1. Reference Identity</label>
          <div className="relative group w-full aspect-[3/4] bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-zinc-600">
            {state.referenceImage ? (
              <>
                <img src={state.referenceImage} alt="Reference" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <button 
                  onClick={clearImage}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors backdrop-blur-md"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-4 w-full h-full justify-center">
                <Upload size={32} className="text-zinc-700" />
                <span className="text-zinc-500 text-[10px] uppercase tracking-[0.15em]">Upload Model</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">A. OUTFIT & TRANSFORM</label>
            <textarea 
              value={state.outfitAndTransform}
              onChange={(e) => updateState('outfitAndTransform', e.target.value)}
              placeholder="Paste Outfit & Transform from BRAIN..."
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-sm focus:outline-none focus:border-white focus:ring-0 min-h-[100px] resize-none text-zinc-200 placeholder-zinc-700"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">B. ENVIRONMENT</label>
            <textarea 
              value={state.environment}
              onChange={(e) => updateState('environment', e.target.value)}
              placeholder="Paste Environment from BRAIN..."
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-sm focus:outline-none focus:border-white focus:ring-0 min-h-[80px] resize-none text-zinc-200 placeholder-zinc-700"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">C. STYLE KEYWORDS</label>
            <textarea 
              value={state.styleKeywords}
              onChange={(e) => updateState('styleKeywords', e.target.value)}
              placeholder="Paste Style Keywords from BRAIN..."
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-white focus:ring-0 min-h-[60px] resize-none text-zinc-200 placeholder-zinc-700"
            />
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-zinc-900">
            <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Shot 02: Side Profile</label>
                <div className="grid grid-cols-2 gap-2">
                {(['LEFT', 'RIGHT'] as SideProfileOption[]).map((opt) => (
                    <button
                    key={opt}
                    onClick={() => updateState('shot1Select', opt)}
                    className={`py-3 text-[10px] font-bold tracking-widest uppercase border ${state.shot1Select === opt ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600'}`}
                    >
                    {opt}
                    </button>
                ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Shot 04-06: Pose</label>
                <div className="grid grid-cols-2 gap-2">
                {(['FLOOR', 'CHAIR'] as SittingOption[]).map((opt) => (
                    <button
                    key={opt}
                    onClick={() => updateState('shot2Select', opt)}
                    className={`py-3 text-[10px] font-bold tracking-widest uppercase border ${state.shot2Select === opt ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600'}`}
                    >
                    {opt}
                    </button>
                ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Shot 08: Macro Focus</label>
                <div className="grid grid-cols-4 gap-1">
                {(['EYES', 'HANDS', 'LOGO', 'TEXTURE'] as DetailOption[]).map((opt) => (
                    <button
                    key={opt}
                    onClick={() => updateState('shot7Select', opt)}
                    className={`py-2 text-[9px] font-bold tracking-widest uppercase border ${state.shot7Select === opt ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600'}`}
                    >
                    {opt}
                    </button>
                ))}
                </div>
            </div>
        </div>
        
        <div className="sticky bottom-0 bg-black pt-6 pb-2 z-10 border-t border-zinc-900">
             <Button 
                onClick={onGenerate} 
                fullWidth 
                disabled={!isReady || state.isGenerating}
                variant="primary"
             >
                {state.isGenerating ? 'EXECUTING MATRIX...' : 'RUN ENGINE'}
             </Button>
        </div>
      </div>
    </div>
  );
};
