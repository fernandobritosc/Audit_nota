
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
import ModeToggle from './components/ModeToggle';
import { LogoIcon, AlertTriangleIcon, PrinterIcon, KeyIcon } from './components/icons';

// Componente movido para cá para resolver problema de importação
interface ApiKeyPromptProps {
  onKeySubmit: (key: string) => void;
  showError?: boolean;
}
const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onKeySubmit, showError }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onKeySubmit(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md">
        <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full mb-4">
                <KeyIcon className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Chave da API do Google Gemini</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
                Para usar esta aplicação em seu ambiente local (localhost), por favor, insira sua chave da API do Google Gemini.
            </p>
            {showError && (
              <div className="mt-4 text-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                <p className="text-red-700 dark:text-red-300 font-semibold text-sm">Chave de API Inválida</p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">A chave anterior falhou na autenticação. Por favor, verifique e insira uma nova chave.</p>
              </div>
            )}
        </div>
        <form onSubmit={handleSubmit} className="mt-6">
          <div>
            <label htmlFor="apiKey" className="sr-only">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave da API aqui..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
              required
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Sua chave será salva apenas no seu navegador para esta sessão.
          </p>
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400"
            disabled={!apiKey.trim()}
          >
            Salvar e Continuar
          </button>
        </form>
      </div>
    </div>
  );
};


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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isKeyChecked, setIsKeyChecked] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);

  useEffect(() => {
    try {
      // Check for API Key
      const keyFromEnv = process.env.API_KEY;
      if (keyFromEnv) {
        setApiKey(keyFromEnv);
      } else {
        const keyFromSession = sessionStorage.getItem('gemini-api-key');
        if (keyFromSession) {
          setApiKey(keyFromSession);
        }
      }
      setIsKeyChecked(true);

      // Load history
      const storedHistory = sessionStorage.getItem('analysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Falha ao inicializar a aplicação:", error);
      sessionStorage.clear(); // Clear potentially corrupted storage
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    sessionStorage.setItem('gemini-api-key', key);
    setApiKey(key);
    setApiKeyError(false);
  };

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
    if (!apiKey) {
      setError('A chave da API do Gemini é necessária para a análise.');
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
        console.error(`Erro ao analisar ${file.name}:`, err);
        const errorMessage = err instanceof Error ? err.message : `Ocorreu um erro desconhecido ao analisar ${file.name}.`;
        
        if (errorMessage.includes('Erro de autenticação')) {
          sessionStorage.removeItem('gemini-api-key');
          setApiKey(null);
          setApiKeyError(true);
        } else {
          setError(errorMessage);
        }
        break;
      }
    }
    
    if(lastSuccessfulResult){
        setResult(lastSuccessfulResult);
    }
    
    setIsLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setFiles([]);

  }, [files, apiKey]);

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
  };

  if (!isKeyChecked) {
    return null; // or a loading spinner
  }

  if (!apiKey) {
    return <ApiKeyPrompt onKeySubmit={handleApiKeySubmit} showError={apiKeyError} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 font-sans print:p-0 print:bg-white">
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full">
        <header className="text-center mb-6 no-print relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <div className="flex justify-center items-center gap-3 mb-1">
            <LogoIcon className="h-8 w-8 text-slate-700 dark:text-slate-300"/>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Cálculo de Retenções
            </h1>
          </div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
            Prefeitura Municipal de Senador Canedo - GO
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerência de Contabilidade - SEFAZ
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
