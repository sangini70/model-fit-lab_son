import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Cpu, Globe, Key, AlertCircle, CheckCircle2, RotateCw, Terminal, RefreshCw } from 'lucide-react';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
import { AppState, DEFAULT_ENVIRONMENT, DEFAULT_STYLE_KEYWORDS, DEFAULT_MODEL, LOADING_MESSAGES } from './types';
import { generatePromptData, createCollage, generateSingleShotPrompt } from './utils';
import { generateImageRaw, extractImagesFromGemini, testConnection, fetchAvailableModels } from './services/imageService';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedOutfit = localStorage.getItem('mf_hand_outfit') || '';
    const savedEnv = localStorage.getItem('mf_hand_env') || DEFAULT_ENVIRONMENT;
    const savedStyle = localStorage.getItem('mf_hand_style') || DEFAULT_STYLE_KEYWORDS;
    const savedKey = localStorage.getItem('mf_hand_apikey') || process.env.API_KEY || '';

    return {
      referenceImage: null,
      outfitAndTransform: savedOutfit,
      environment: savedEnv,
      styleKeywords: savedStyle,
      shot1Select: 'LEFT',
      shot2Select: 'FLOOR',
      shot7Select: 'EYES',
      generatedImage: null,
      numberedCollage: null,
      isGenerating: false,
      loadingMessage: '',
      extractedImages: [],
      hasApiKey: !!savedKey,
      apiKey: savedKey,
      isLocalEngineMode: false,
      generationMode: 'GRID_3X3',
      generatedPromptText: null,
      connectionStatus: 'idle',
      testStatusCode: null,
      debugInfo: null,
      textResult: null,
      selectedModel: DEFAULT_MODEL,
      availableModels: []
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const loadingIntervalRef = useRef<number | null>(null);

  // Auto-fetch models when Settings opens if API Key exists
  // Developer Directive: Remove auto-fetch to prevent "Failed to call" toast on open
  /*
  useEffect(() => {
    if (isSettingsOpen && state.apiKey && state.availableModels.length === 0) {
      handleFetchModels();
    }
  }, [isSettingsOpen]);
  */

  const startLoadingSequence = () => {
    let i = 0;
    setState(prev => ({ ...prev, loadingMessage: LOADING_MESSAGES[0] }));
    loadingIntervalRef.current = window.setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setState(prev => ({ ...prev, loadingMessage: LOADING_MESSAGES[i] }));
    }, 3000);
  };

  const stopLoadingSequence = () => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  };

  const handleFetchModels = async () => {
    // Developer Directive: Strict Guard
    if (!state.apiKey || state.apiKey.trim().length < 10) return;
    
    const models = await fetchAvailableModels(state.apiKey);
    setState(prev => ({ ...prev, availableModels: models }));
  };

  const handleTestConnection = async () => {
    const selectedModelLabel = state.availableModels.find(m => m.name === state.selectedModel)?.displayName || "gemini-2.5-flash-image (Nano Banana 2.5)";
    console.log("[CLICK] Test Image Gen");
    console.log("selectedModelLabel =", selectedModelLabel);
    console.log("selectedModelValue =", state.selectedModel);
    console.log("apiKey length =", state.apiKey?.length);

    // Developer Directive: Strict Guard
    if (!state.apiKey || state.apiKey.trim().length < 10) return;

    setState(s => ({ ...s, connectionStatus: 'testing', testStatusCode: null, debugInfo: null }));
    const result = await testConnection(state.apiKey, state.selectedModel);
    
    // Show detailed result in Debug Info if failed
    if (!result.ok) {
        setState(s => ({ 
            ...s, 
            debugInfo: { error: result.message, status: result.status } 
        }));
        
        // If status is 0, it's a network/fetch error. Alert the user immediately.
        if (result.status === 0) {
            alert(`Connection Error (ERR 0):\n${result.message}\n\nPlease check your network, adblocker, or ensure the server is running.`);
        }
    }

    setState(s => ({ 
      ...s, 
      connectionStatus: result.ok ? 'ok' : 'error', 
      testStatusCode: result.status 
    }));
  };

  const handleGenerate = async () => {
    if (state.isLocalEngineMode) {
      alert("Local Engine Mode ON → Cloud 결과 미표시. Settings에서 OFF로 전환하십시오.");
      return;
    }

    if (!state.hasApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    if (!state.referenceImage || !state.outfitAndTransform) {
      alert("Required: Reference Image + Outfit Description");
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      generatedImage: null, 
      numberedCollage: null,
      extractedImages: [], 
      generatedPromptText: null,
      debugInfo: null,
      textResult: null
    }));
    startLoadingSequence();

    try {
      const { prompts, markdown } = generatePromptData(state);
      setState(prev => ({ ...prev, generatedPromptText: markdown }));

      // Process 9 shots
      const results: string[] = [];

      for (let i = 0; i < prompts.length; i++) {
        setState(prev => ({ ...prev, loadingMessage: `CAPTURING SHOT ${(i+1).toString().padStart(2, '0')}...` }));
        
        const selectedModelLabel = state.availableModels.find(m => m.name === state.selectedModel)?.displayName || "gemini-2.5-flash-image (Nano Banana 2.5)";
        console.log(`[CLICK] Execute Image Gen (Shot ${i+1})`);
        console.log("selectedModelLabel =", selectedModelLabel);
        console.log("selectedModelValue =", state.selectedModel);
        
        const { data, status } = await generateImageRaw(prompts[i], state.referenceImage, { apiKey: state.apiKey, model: state.selectedModel });
        
        if (status !== 200) {
          const errorMsg = data?.error || `HTTP ${status}`;
          const statusText = data?.statusText || "";
          const body = data?.body || JSON.stringify(data);
          throw new Error(`Gemini Error ${status} ${statusText}: ${errorMsg}\nBody: ${body}`);
        }

        const imgs = extractImagesFromGemini(data);
        if (imgs.length > 0) {
          results.push(imgs[0]);
        } else {
          const txt = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "No Image/Text";
          setState(prev => ({ ...prev, debugInfo: data, textResult: txt }));
          throw new Error(`Shot ${i+1} no image. Check Debug tab.`);
        }
      }

      const collage = await createCollage(results);

      setState(prev => ({
        ...prev,
        extractedImages: results,
        numberedCollage: collage,
        isGenerating: false,
        debugInfo: { success: true, count: results.length }
      }));

    } catch (error: any) {
      console.error("Execution failed:", error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        debugInfo: state.debugInfo || { error: error.message }
      }));
      alert(`Execution Error: ${error.message}`);
    } finally {
      stopLoadingSequence();
    }
  };

  const handleRegenerateShot = async (index: number) => {
    if (state.isLocalEngineMode || !state.hasApiKey) return;
    
    setState(prev => ({ ...prev, isGenerating: true, loadingMessage: `RE-CAPTURING SHOT ${(index + 1).toString().padStart(2, '0')}...` }));

    try {
      const selectedModelLabel = state.availableModels.find(m => m.name === state.selectedModel)?.displayName || "gemini-2.5-flash-image (Nano Banana 2.5)";
      console.log(`[CLICK] Regenerate Shot ${index+1}`);
      console.log("selectedModelLabel =", selectedModelLabel);
      console.log("selectedModelValue =", state.selectedModel);

      const prompt = generateSingleShotPrompt(state, index);
      const { data, status } = await generateImageRaw(prompt, state.referenceImage, { apiKey: state.apiKey, model: state.selectedModel });
      
      if (status !== 200) {
        const errorMsg = data?.error || `HTTP ${status}`;
        const statusText = data?.statusText || "";
        const body = data?.body || JSON.stringify(data);
        throw new Error(`Gemini Error ${status} ${statusText}: ${errorMsg}\nBody: ${body}`);
      }

      const imgs = extractImagesFromGemini(data);
      if (imgs.length === 0) throw new Error("No image in response");

      const newShotBase64 = imgs[0];
      const newExtracted = [...state.extractedImages];
      newExtracted[index] = newShotBase64;
      const newCollage = await createCollage(newExtracted);
      
      setState(prev => ({
        ...prev,
        extractedImages: newExtracted,
        numberedCollage: newCollage,
        isGenerating: false
      }));
    } catch (error: any) {
      console.error("Single shot regeneration failed:", error);
      alert(`Shot regeneration failed: ${error.message}`);
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const updateApiKey = (val: string) => {
    localStorage.setItem('mf_hand_apikey', val);
    setState(s => ({ ...s, apiKey: val, hasApiKey: !!val, connectionStatus: 'idle' }));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white font-sans overflow-hidden selection:bg-white selection:text-black">
        
        <header className="h-16 flex-shrink-0 bg-black border-b border-zinc-800 flex items-center justify-between px-6 z-40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                 <div className="w-4 h-4 bg-black rotate-45"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter uppercase leading-none">Model Fit Lab</span>
                <span className="text-[9px] font-bold text-blue-400 tracking-widest uppercase mt-0.5">Execution Mode</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Settings size={20} />
            </button>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            <div className="w-full lg:w-[420px] xl:w-[460px] h-auto lg:h-full flex-shrink-0 z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
                <InputSection 
                  state={state} 
                  setState={setState} 
                  onGenerate={handleGenerate} 
                  onSetApiKey={() => setIsSettingsOpen(true)}
                />
            </div>

            <div className="flex-1 h-full overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#18181b_0%,_#000000_100%)] pointer-events-none opacity-40"></div>
                
                {state.isGenerating && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-center p-6">
                        <div className="w-48 h-[1px] bg-zinc-800 mb-8 overflow-hidden relative">
                            <div className="absolute inset-0 bg-white w-1/2 animate-[loading-bar_1.5s_infinite_ease-in-out]"></div>
                        </div>
                        <span className="text-[10px] font-black tracking-[0.5em] text-white uppercase animate-pulse mb-2">
                            {state.loadingMessage}
                        </span>
                        <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Calling {state.selectedModel}...</div>
                        <style>{`
                            @keyframes loading-bar {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(200%); }
                            }
                        `}</style>
                    </div>
                )}
                
                <OutputSection state={state} onRegenerateShot={handleRegenerateShot} />
            </div>
        </div>

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setIsSettingsOpen(false)}
            />
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                 <div className="flex items-center gap-2">
                    <Settings size={16} className="text-zinc-500" />
                    <h2 className="text-xs font-black tracking-widest uppercase">Engine & API Settings</h2>
                 </div>
                 <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-black border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Cpu size={18} className={state.isLocalEngineMode ? "text-blue-400" : "text-zinc-600"} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Local Engine Mode</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Use browser-local inference (Beta)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setState(s => ({ ...s, isLocalEngineMode: !s.isLocalEngineMode }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${state.isLocalEngineMode ? 'bg-blue-600' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${state.isLocalEngineMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-zinc-600" />
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cloud API Configuration</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase">Provider:</span>
                      <span className="text-[9px] font-bold text-white uppercase px-1.5 py-0.5 bg-zinc-800 rounded">Gemini</span>
                    </div>
                  </div>
                  
                  {state.isLocalEngineMode ? (
                    <div className="p-4 bg-zinc-800/50 border border-zinc-800 flex items-start gap-3">
                       <AlertCircle size={14} className="text-blue-400 mt-0.5" />
                       <p className="text-[10px] text-zinc-300 font-medium uppercase leading-relaxed">
                         Local Engine Mode ON → Cloud API 비활성. 
                         <br/><span className="text-[9px] text-zinc-500">Cloud API is bypassed for local inference.</span>
                       </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      
                      {/* Model Selection */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] text-zinc-500 uppercase font-black">Generation Model</label>
                            <button 
                                onClick={handleFetchModels} 
                                className="text-[9px] text-blue-400 uppercase font-bold flex items-center gap-1 hover:text-white"
                                title="Refresh Model List"
                            >
                                <RefreshCw size={10} /> Refresh List
                            </button>
                        </div>
                        <select 
                          value={state.selectedModel}
                          onChange={(e) => setState(s => ({ ...s, selectedModel: e.target.value }))}
                          className="w-full bg-black border border-zinc-800 p-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-white"
                        >
                          <option value="gemini-2.5-flash-image">gemini-2.5-flash-image (Nano Banana 2.5)</option>
                          {state.availableModels.map(m => (
                              <option key={m.name} value={m.name}>
                                  {m.displayName} ({m.name})
                              </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative">
                        <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="password"
                          placeholder="GEMINI_API_KEY"
                          value={state.apiKey}
                          onChange={(e) => updateApiKey(e.target.value)}
                          className="w-full bg-black border border-zinc-800 pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-white transition-colors placeholder:text-zinc-700"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={handleTestConnection}
                          disabled={!state.apiKey || state.connectionStatus === 'testing'}
                          className="flex items-center gap-2 text-[10px] font-bold text-white uppercase px-4 py-2 border border-zinc-700 hover:bg-zinc-800 transition-colors disabled:opacity-30"
                        >
                          {state.connectionStatus === 'testing' ? <RotateCw size={12} className="animate-spin" /> : null}
                          Test Image Gen
                        </button>
                        
                        {state.connectionStatus !== 'idle' && (
                          <div className={`flex items-center gap-2 px-3 py-1.5 border text-[9px] font-bold uppercase ${state.connectionStatus === 'ok' ? 'bg-green-950/30 border-green-800 text-green-400' : 'bg-red-950/30 border-red-800 text-red-400'}`}>
                            {state.connectionStatus === 'ok' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {state.connectionStatus === 'ok' ? `OK (200)` : `ERR ${state.testStatusCode || '0'}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={() => setIsSettingsOpen(false)} 
                fullWidth 
                variant="primary"
                className="mt-4"
              >
                Save & Close
              </Button>
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
