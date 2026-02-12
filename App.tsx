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
import ApiKeyEntryScreen from './components/ApiKeyEntryScreen.tsx';
import { LogoIcon, AlertTriangleIcon, PrinterIcon, LogOutIcon } from './components/icons.tsx';

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

  // More robust check for local development environment
  const isLocalDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [apiKey, setApiKey] = useState<string | null>(
    () => process.env.API_KEY || localStorage.getItem('geminiApiKey')
  );
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);


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

  const handleKeySubmit = (key: string) => {
    localStorage.setItem('geminiApiKey', key);
    setApiKey(key);
    setApiKeyError(null);
  };

  const handleChangeKey = () => {
    localStorage.removeItem('geminiApiKey');
    setApiKey(null);
  };

  const handleFileChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResult(null);
    setError(null);
  }, []);

  const handleBatchAnalysis = useCallback(async () => {
    if (!apiKey) {
      setError("A chave da API não está configurada.");
      if (isLocalDevelopment) handleChangeKey(); // Force re-entry only in local dev
      return;
    }

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

        // Pass the current apiKey to the service
        const extractedData: ExtractedData = await extractInvoiceData(base64data, apiKey);

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
        
        if (errorMessage.includes('autenticação') || errorMessage.includes('chave da API')) {
            setApiKeyError(errorMessage);
            if (isLocalDevelopment) {
                handleChangeKey(); 
            } else {
                setError(errorMessage); 
            }
        } else {
            setError(errorMessage);
        }
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

  }, [files, apiKey, isLocalDevelopment]);

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

  // Render ApiKeyEntryScreen if no key is available (only happens in local dev without env var)
  if (!apiKey) {
    return <ApiKeyEntryScreen onKeySubmit={handleKeySubmit} initialError={apiKeyError} />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans print:bg-white transition-colors duration-200">
      {/* Institutional Top Bar */}
      <div className="w-full bg-[#003366] text-white py-1.5 px-4 text-[11px] font-medium tracking-wide uppercase no-print">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <span className="opacity-90">Portal da Transparência - Senador Canedo</span>
            <div className="flex gap-4 opacity-80">
                <span>SEFAZ - Gerência de Contabilidade</span>
                <span className="hidden sm:inline">Apoio à Auditoria Fiscal</span>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 print:p-0">
        <header className="flex flex-col sm:flex-row items-center sm:items-end justify-between mb-10 gap-6 border-b border-slate-200 dark:border-slate-800 pb-8 relative">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl institutional-shadow border border-slate-200 dark:border-slate-700 print:p-0 print:border-none print:shadow-none">
                <LogoIcon className="h-10 w-10 text-[#003366] dark:text-blue-400 print:h-8 print:w-8"/>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Auditoria de Notas Fiscais
              </h1>
              <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-x-3 text-slate-500 dark:text-slate-400 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Prefeitura de Senador Canedo</span>
                <span className="hidden sm:inline opacity-30">|</span>
                <span>Secretaria de Finanças</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 no-print">
            {isLocalDevelopment && (
              <button
                onClick={handleChangeKey}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg institutional-shadow hover:border-red-200"
                title="Sair / Alterar Chave"
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="hidden md:inline">Alterar Chave</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="w-full">
          <div className="bg-white dark:bg-slate-800 rounded-xl institutional-shadow border border-slate-200 dark:border-slate-700 overflow-hidden print:border-none print:shadow-none">
            {!result && !isLoading && (
              <div className="no-print">
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={() => setMode('analysis')}
                        className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all ${
                            mode === 'analysis'
                            ? 'bg-white dark:bg-slate-800 text-[#003366] dark:text-blue-400 border-b-2 border-[#003366] dark:border-blue-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                    >
                        Análise Automatizada (IA)
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all ${
                            mode === 'manual'
                            ? 'bg-white dark:bg-slate-800 text-[#003366] dark:text-blue-400 border-b-2 border-[#003366] dark:border-blue-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                    >
                        Lançamento Manual
                    </button>
                </div>

                <div className="p-8">
                    {mode === 'analysis' ? (
                        <div className="max-w-2xl mx-auto">
                            <FileUploader onFileChange={handleFileChange} />
                            {files.length > 0 && (
                                <button
                                    onClick={handleBatchAnalysis}
                                    disabled={isLoading}
                                    className="w-full mt-8 bg-[#003366] hover:bg-[#004d99] text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    <span>Iniciar Auditoria de {files.length} {files.length > 1 ? 'Documentos' : 'Documento'}</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <ManualEntryForm onSubmit={handleManualCalculation} />
                    )}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="p-8 no-print">
                <ResultsCardSkeleton batchProgress={batchProgress} />
              </div>
            )}
            
            {error && (
               <div className="p-8 no-print">
                   <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-6 text-center">
                      <AlertTriangleIcon className="h-10 w-10 text-red-500 mx-auto mb-4" />
                      <h3 className="text-red-800 dark:text-red-300 font-bold text-lg">Falha no Processamento</h3>
                      <p className="text-red-600 dark:text-red-400 mt-2 text-sm leading-relaxed max-w-md mx-auto">{error}</p>
                       <button 
                          onClick={handleReset} 
                          className="mt-6 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-2.5 px-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm institutional-shadow">
                          Tentar Novamente
                      </button>
                   </div>
               </div>
            )}

            {result && (
              <div className="p-0">
                <ResultsCard 
                  data={result} 
                  onTaxStatusChange={handleTaxStatusChange}
                  onValueChange={handleValueChange}
                />
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 no-print">
                   <button
                      onClick={() => window.print()}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-700 dark:bg-slate-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 transition-all shadow-sm"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      Gerar Relatório PDF
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="flex-1 bg-[#003366] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#004d99] transition-all shadow-md">
                    Nova Consulta Analítica
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {history.length > 0 && !isLoading && (
            <div className="mt-12 no-print">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Consultas Recentes</h2>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                </div>
                <HistoryPanel 
                    history={history}
                    onRestore={handleRestoreFromHistory}
                    onClear={handleClearHistory}
                />
            </div>
        )}

        <footer className="mt-16 pb-8 text-center no-print">
          <div className="flex justify-center items-center gap-4 mb-4">
              <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 text-slate-800"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Desenvolvido por SEFAZ/GO</span>
              <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            © {new Date().getFullYear()} Gerência de Contabilidade - Secretaria de Finanças<br/>
            Prefeitura Municipal de Senador Canedo - GO
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;