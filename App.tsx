
import React, { useState, useCallback, useEffect } from 'react';
import { type ExtractedData, type CalculatedData } from './types';
import { extractInvoiceData } from './services/geminiService';
import { processTaxCalculations } from './rules/taxRules';
import FileUploader from './components/FileUploader';
import ResultsCard from './components/ResultsCard';
import ResultsCardSkeleton from './components/ResultsCardSkeleton';
import HistoryPanel from './components/HistoryPanel';
import ManualEntryForm from './components/ManualEntryForm';
import ThemeToggle from './components/ThemeToggle';
// FIX: Removed ApiKeyEntryScreen as API key is now handled by environment variables.
// import ApiKeyEntryScreen from './components/ApiKeyEntryScreen';
// FIX: Removed LogOutIcon as the concept of changing/logging out of a key is removed.
import { LogoIcon, AlertTriangleIcon, PrinterIcon } from './components/icons';

type AppMode = 'analysis' | 'manual';
type ManualChangeKey = 'codigoReinf' | 'aliquotaIR' | 'aliquotaISS' | 'baseCalculoINSS' | 'aliquotaINSS';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculatedData | null>(null);
  const [history, setHistory] = useState<CalculatedData[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [mode, setMode] = useState<AppMode>('analysis');

  // FIX: Removed all local state management for API keys to follow guidelines.
  // The API key is now sourced directly from process.env in the service layer.

  useEffect(() => {
    try {
      const storedHistory = sessionStorage.getItem('analysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Falha ao inicializar o histórico da sessão:", error);
      sessionStorage.clear();
    }
  }, []);

  // FIX: Removed handleKeySubmit and handleChangeKey as UI-based key management is not allowed.

  const handleFileChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResult(null);
    setError(null);
  }, []);

  const handleBatchAnalysis = useCallback(async () => {
    // FIX: Removed API key check from the component. This is handled by the environment.
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

        // FIX: The API key is no longer passed as an argument.
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
        const errorMessage = err instanceof Error ? err.message : `Ocorreu um erro desconhecido ao analisar ${file.name}.`;
        // FIX: Simplified error handling. The user cannot change the API key, so we just display the error.
        setError(errorMessage);
        console.error(`Erro ao analisar ${file.name}:`, err);
        break; // Stop batch on any error
      }
    }
    
    if(lastSuccessfulResult){
        setResult(lastSuccessfulResult);
    }
    
    setIsLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setFiles([]);

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
        const errorMessage = err instanceof Error ? err.message : 'Erro ao processar cálculo manual.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleTaxStatusChange = useCallback((key: 'optanteSimples' | 'isMei') => {
    if (!result) return;
    const newValue = result[key] === 'SIM' ? 'NÃO' : 'SIM';
    const dataForRecalc: ExtractedData = {
      ...result,
      [key]: newValue,
      aliquotaIR: result.irrf.rate,
      aliquotaISS: result.iss.rate,
      baseCalculoINSS: result.inss.base,
      aliquotaINSS: result.inss.rate,
    };
    const processedData = processTaxCalculations(dataForRecalc);
    setResult({ ...result, ...processedData, [key]: newValue });
  }, [result]);

  const handleValueChange = useCallback((key: ManualChangeKey, value: string | number) => {
    setResult(prevResult => {
        if (!prevResult) return null;
        const updatedResult = { ...prevResult };
        if (key === 'codigoReinf') updatedResult.codigoReinf = value as string;
        else if (key === 'aliquotaIR') updatedResult.irrf.rate = value as number;
        else if (key === 'aliquotaISS') updatedResult.iss.rate = value as number;
        else if (key === 'baseCalculoINSS') updatedResult.inss.base = value as number;
        else if (key === 'aliquotaINSS') updatedResult.inss.rate = value as number;
        const dataForRecalc: ExtractedData = {
            ...updatedResult,
            aliquotaIR: updatedResult.irrf.rate,
            aliquotaISS: updatedResult.iss.rate,
            baseCalculoINSS: updatedResult.inss.base,
            aliquotaINSS: updatedResult.inss.rate,
        };
        const processedData = processTaxCalculations(dataForRecalc);
        return { ...updatedResult, ...processedData };
    });
  }, []);
  
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
    setMode('analysis');
  };

  // FIX: Removed conditional rendering of ApiKeyEntryScreen. The app now renders directly.
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 font-sans print:p-0 print:bg-white">
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full">
        <header className="text-center mb-6 relative print:mb-4">
          <div className="absolute top-0 right-0 flex items-center gap-2 no-print">
            {/* FIX: Removed button to change API key. */}
            <ThemeToggle />
          </div>
          <div className="flex justify-center items-center gap-3 mb-1">
            <LogoIcon className="h-8 w-8 text-slate-700 dark:text-slate-300 print:h-7 print:w-7"/>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 print:text-2xl">
              Cálculo de Retenções
            </h1>
          </div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 print:text-base">
            Prefeitura Municipal de Senador Canedo - GO
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 print:text-sm">
            Gerência de Contabilidade - SEFAZ
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 w-full print:p-0 print:shadow-none print:border-none">
          <>
            {!result && !isLoading && (
              <div className="no-print">
                <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setMode('analysis')}
                            className={`${
                                mode === 'analysis'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
                        >
                            Analisar Documento
                        </button>
                        <button
                            onClick={() => setMode('manual')}
                            className={`${
                                mode === 'manual'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
                        >
                            Cálculo Manual
                        </button>
                    </nav>
                </div>

                {mode === 'analysis' ? (
                    <>
                        <FileUploader onFileChange={handleFileChange} />
                        {files.length > 0 && (
                            <button
                                onClick={handleBatchAnalysis}
                                disabled={isLoading}
                                className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
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
                    Novo Cálculo
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
          <p>
            © {new Date().getFullYear()} Prefeitura Municipal de Senador Canedo - GO | Gerência de Contabilidade - SEFAZ
          </p>
          <p className="text-xs mt-1">
            Powered by Google Gemini API.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
