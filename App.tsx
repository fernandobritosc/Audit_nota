
import React, { useState, useCallback, useEffect } from 'react';
import { type ExtractedData, type CalculatedData } from './types.ts';
import { extractInvoiceData } from './services/geminiService.ts';
import { processTaxCalculations } from './rules/taxRules.ts';
import FileUploader from './components/FileUploader.tsx';
import ResultsCard from './components/ResultsCard.tsx';
import ResultsCardSkeleton from './components/ResultsCardSkeleton.tsx';
import HistoryPanel from './components/HistoryPanel.tsx';
import ManualEntryForm from './components/ManualEntryForm.tsx';
import ThemeToggle from './components/ThemeToggle.tsx';
import ModeToggle from './components/ModeToggle.tsx';
import { LogoIcon, AlertTriangleIcon, PrinterIcon } from './components/icons.tsx';

type AppMode = 'analysis' | 'manual';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculatedData | null>(null);
  const [history, setHistory] = useState<CalculatedData[]>([]);
  const [mode, setMode] = useState<AppMode>('analysis');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    try {
      const storedHistory = sessionStorage.getItem('analysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Falha ao carregar o histórico do sessionStorage", error);
      sessionStorage.removeItem('analysisHistory');
    }
  }, []);

  const handleFileChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResult(null);
    setError(null);
  }, []);

  const handleBatchAnalysis = useCallback(async () => {
    if (files.length === 0) {
      setError('Por favor, selecione um ou mais arquivos.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setBatchProgress({ current: 1, total: files.length });

    let lastSuccessfulResult: CalculatedData | null = null;

    for (const [index, file] of files.entries()) {
      setBatchProgress({ current: index + 1, total: files.length });
      try {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(new Error(`Falha ao ler o arquivo: ${file.name}`));
        });

        const extractedData: ExtractedData = await extractInvoiceData(base64data);

        if (extractedData.valorBruto === null || extractedData.valorBruto === undefined || isNaN(Number(extractedData.valorBruto))) {
          throw new Error(`Não foi possível extrair um "Valor Bruto" válido do documento: ${file.name}`);
        }

        const processedData = processTaxCalculations(extractedData);

        const resultWithId: CalculatedData = {
            id: Date.now(),
            razaoSocial: extractedData.razaoSocial,
            cnpj: extractedData.cnpj,
            numeroNF: extractedData.numeroNF,
            optanteSimples: extractedData.optanteSimples,
            isMei: extractedData.isMei,
            localServico: extractedData.localServico,
            documentoTipo: extractedData.documentoTipo,
            codigoReinf: extractedData.codigoReinf || '17099',
            ...processedData,
        };
        
        lastSuccessfulResult = resultWithId;

        setHistory(prevHistory => {
          const newHistory = [resultWithId, ...prevHistory].slice(0, 10);
          sessionStorage.setItem('analysisHistory', JSON.stringify(newHistory));
          return newHistory;
        });

      } catch (err) {
        console.error(`Erro ao analisar ${file.name}:`, err);
        setError(err instanceof Error ? err.message : `Ocorreu um erro desconhecido ao analisar ${file.name}.`);
        // Stop batch processing on first error to avoid confusion
        break;
      }
    }
    
    if(lastSuccessfulResult){
        setResult(lastSuccessfulResult);
    }
    
    setIsLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setFiles([]); // Clear files after processing

  }, [files]);

  const handleManualCalculation = useCallback((data: ExtractedData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
        const processedData = processTaxCalculations(data);
        const resultWithId: CalculatedData = {
            id: Date.now(),
            razaoSocial: data.razaoSocial || 'Cálculo Manual',
            cnpj: data.cnpj || 'N/A',
            numeroNF: data.numeroNF || new Date().getTime().toString().slice(-6),
            optanteSimples: data.optanteSimples,
            isMei: data.isMei,
            localServico: data.localServico,
            documentoTipo: 'SERVICO',
            codigoReinf: data.codigoReinf || '17099',
            ...processedData,
        };
        setResult(resultWithId);
        setHistory(prevHistory => {
            const newHistory = [resultWithId, ...prevHistory].slice(0, 10);
            sessionStorage.setItem('analysisHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar cálculo manual.');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleTaxStatusChange = useCallback((key: 'optanteSimples' | 'isMei') => {
    if (!result) return;
    const newValue = result[key] === 'SIM' ? 'NÃO' : 'SIM';
    const dataForRecalc: ExtractedData = {
      ...result,
      aliquotaIR: result.irrf.rate,
      aliquotaISS: result.iss.rate,
      valorINSS: result.inss.value,
      baseCalculoINSS: result.inss.base,
      aliquotaINSS: result.inss.rate,
      [key]: newValue,
    };
    const processedData = processTaxCalculations(dataForRecalc);
    setResult({ ...result, ...processedData, [key]: newValue });
  }, [result]);

  const handleValueChange = useCallback((key: 'codigoReinf' | 'aliquotaIR' | 'aliquotaISS', value: string | number) => {
    if (!result) return;
    const dataForRecalc: ExtractedData = {
        ...result,
        aliquotaIR: result.irrf.rate,
        aliquotaISS: result.iss.rate,
        valorINSS: result.inss.value,
        baseCalculoINSS: result.inss.base,
        aliquotaINSS: result.inss.rate,
    };
    if (key === 'aliquotaIR') dataForRecalc.aliquotaIR = value as number;
    else if (key === 'aliquotaISS') dataForRecalc.aliquotaISS = value as number;
    else if (key === 'codigoReinf') dataForRecalc.codigoReinf = value as string;
    
    const processedData = processTaxCalculations(dataForRecalc);
    setResult({ ...result, ...processedData, codigoReinf: dataForRecalc.codigoReinf });
  }, [result]);
  
  const handleRestoreFromHistory = useCallback((id: number) => {
    const itemToRestore = history.find(item => item.id === id);
    if (itemToRestore) {
        setResult(itemToRestore);
        setError(null);
        setIsLoading(false);
        setFiles([]);
        setMode('analysis');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [history]);

  const handleClearHistory = () => {
    setHistory([]);
    sessionStorage.removeItem('analysisHistory');
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 font-sans print:p-0 print:bg-white">
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full print:p-8">
        <header className="text-center mb-6 no-print relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <div className="flex justify-center items-center gap-3 mb-2">
            <LogoIcon className="h-10 w-10 text-slate-700 dark:text-slate-300"/>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Cálculo de Retenções
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Automatize sua planilha de retenções com IA ou calcule manualmente.
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 w-full print:p-0 print:shadow-none print:border-none">
          <>
            {!result && !isLoading && (
              <div className="space-y-6 no-print">
                <ModeToggle mode={mode} onModeChange={setMode} />
                {mode === 'analysis' ? (
                    <>
                        <FileUploader onFileChange={handleFileChange} />
                        {files.length > 0 && (
                            <button
                                onClick={handleBatchAnalysis}
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {`Analisar ${files.length} ${files.length > 1 ? 'Documentos' : 'Documento'}`}
                            </button>
                        )}
                    </>
                ) : (
                    <ManualEntryForm onSubmit={handleManualCalculation} />
                )}
              </div>
            )}

            {isLoading && (
              <div className="no-print">
                <ResultsCardSkeleton batchProgress={batchProgress} />
              </div>
            )}
            
            {error && (
               <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg no-print">
                  <AlertTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 dark:text-red-300 font-semibold">Ocorreu um erro</p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                   <button 
                      onClick={handleReset} 
                      className="mt-4 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm">
                      Tentar Novamente
                  </button>
               </div>
            )}

            {result && (
              <div>
                <ResultsCard 
                  data={result} 
                  onTaxStatusChange={handleTaxStatusChange}
                  onValueChange={handleValueChange}
                />
                <div className="mt-6 flex flex-col sm:flex-row gap-4 no-print">
                   <button
                      onClick={() => window.print()}
                      className="w-full sm:w-auto flex-1 bg-gray-600 dark:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 dark:hover:bg-slate-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      Imprimir PDF
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="w-full sm:w-auto flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    {mode === 'manual' ? 'Novo Cálculo Manual' : 'Analisar Outro Documento'}
                  </button>
                </div>
              </div>
            )}
          </>
        </main>

        {history.length > 0 && !isLoading && (
            <HistoryPanel 
                history={history}
                onRestore={handleRestoreFromHistory}
                onClear={handleClearHistory}
            />
        )}

        <footer className="text-center mt-8 text-sm text-slate-400 dark:text-slate-500 no-print">
            <p>Powered by Google Gemini API. © {new Date().getFullYear()} Fiscal Audit Assistant.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
