
import React, { useState, useCallback } from 'react';
import { type ExtractedData, type CalculatedData } from './types.ts';
import { extractInvoiceData } from './services/geminiService.ts';
import { processTaxCalculations } from './rules/taxRules.ts';
import FileUploader from './components/FileUploader.tsx';
import ResultsCard from './components/ResultsCard.tsx';
import ResultsCardSkeleton from './components/ResultsCardSkeleton.tsx';
import { LogoIcon, AlertTriangleIcon, PrinterIcon } from './components/icons.tsx';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculatedData | null>(null);

  const handleFileChange = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo primeiro.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
       const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(new Error('Falha ao ler o arquivo.'));
      });

      const extractedData: ExtractedData = await extractInvoiceData(base64data);

      if (extractedData.valorBruto === null || extractedData.valorBruto === undefined || isNaN(Number(extractedData.valorBruto))) {
        throw new Error('Não foi possível extrair um "Valor Bruto" válido do documento. Verifique a qualidade da imagem ou insira o valor manualmente.');
      }

      const processedData = processTaxCalculations(extractedData);

      setResult({
          razaoSocial: extractedData.razaoSocial,
          cnpj: extractedData.cnpj,
          numeroNF: extractedData.numeroNF,
          optanteSimples: extractedData.optanteSimples,
          isMei: extractedData.isMei,
          localServico: extractedData.localServico,
          documentoTipo: extractedData.documentoTipo,
          codigoReinf: extractedData.codigoReinf || '17099',
          ...processedData,
      });

    } catch (err) {
      console.error("Erro durante a análise:", err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido durante a análise.');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const handleTaxStatusChange = useCallback((key: 'optanteSimples' | 'isMei') => {
    if (!result) return;

    const newValue = result[key] === 'SIM' ? 'NÃO' : 'SIM';

    const dataForRecalc: ExtractedData = {
      razaoSocial: result.razaoSocial,
      cnpj: result.cnpj,
      numeroNF: result.numeroNF,
      valorBruto: result.valorBruto,
      optanteSimples: result.optanteSimples,
      isMei: result.isMei,
      localServico: result.localServico,
      municipioIncidencia: result.municipioIncidencia,
      documentoTipo: result.documentoTipo,
      codigoReinf: result.codigoReinf,
      aliquotaIR: result.irrf.rate,
      aliquotaISS: result.iss.rate,
      valorINSS: result.inss.value,
      baseCalculoINSS: result.inss.base,
      aliquotaINSS: result.inss.rate,
      [key]: newValue,
    };
    
    const processedData = processTaxCalculations(dataForRecalc);

    setResult({
      ...result,
      ...processedData,
      [key]: newValue,
    });
  }, [result]);

  const handleValueChange = useCallback((key: 'codigoReinf' | 'aliquotaIR' | 'aliquotaISS', value: string | number) => {
    if (!result) return;

    const dataForRecalc: ExtractedData = {
        razaoSocial: result.razaoSocial,
        cnpj: result.cnpj,
        numeroNF: result.numeroNF,
        valorBruto: result.valorBruto,
        optanteSimples: result.optanteSimples,
        isMei: result.isMei,
        localServico: result.localServico,
        municipioIncidencia: result.municipioIncidencia,
        documentoTipo: result.documentoTipo,
        codigoReinf: result.codigoReinf,
        aliquotaIR: result.irrf.rate,
        aliquotaISS: result.iss.rate,
        valorINSS: result.inss.value,
        baseCalculoINSS: result.inss.base,
        aliquotaINSS: result.inss.rate,
    };

    if (key === 'aliquotaIR') {
        dataForRecalc.aliquotaIR = value as number;
    } else if (key === 'aliquotaISS') {
        dataForRecalc.aliquotaISS = value as number;
    } else if (key === 'codigoReinf') {
        dataForRecalc.codigoReinf = value as string;
    }

    const processedData = processTaxCalculations(dataForRecalc);
    
    setResult({
        ...result,
        ...processedData,
        codigoReinf: dataForRecalc.codigoReinf,
    });
  }, [result]);
  
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 font-sans print:p-0 print:bg-white">
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full print:p-8">
        {/* --- Print-only Header --- */}
        <div className="hidden print:flex items-center justify-center pb-4 mb-4 border-b-2 border-black">
            <div className="text-center">
                <h1 className="text-lg font-bold">Prefeitura Municipal de Senador Canedo</h1>
                <p className="text-sm">Gerencia de Contabilidade - Sefaz</p>
            </div>
        </div>

        <header className="text-center mb-8 no-print">
          <div className="flex justify-center items-center gap-3 mb-2">
            <LogoIcon className="h-10 w-10 text-slate-700"/>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
              Cálculo de Retenções na Fonte
            </h1>
          </div>
          <p className="text-slate-500 max-w-lg mx-auto">
            Faça o upload do documento fiscal para automatizar sua planilha de retenções.
          </p>
        </header>

        <main className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/80 w-full print:p-0 print:shadow-none print:border-none">
          <>
            {!result && !isLoading && (
              <div className="space-y-6 no-print">
                <FileUploader onFileChange={handleFileChange} />
                
                {file && (
                    <button
                      onClick={handleAnalysis}
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                      Analisar Documento
                    </button>
                )}
              </div>
            )}

            {isLoading && (
              <div className="no-print">
                <ResultsCardSkeleton />
              </div>
            )}
            
            {error && (
               <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg no-print">
                  <AlertTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-semibold">Ocorreu um erro</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
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
                      className="w-full sm:w-auto flex-1 bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      Imprimir PDF
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="w-full sm:w-auto flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Analisar Outro Documento
                  </button>
                </div>
              </div>
            )}
          </>
        </main>
        <footer className="text-center mt-8 text-sm text-slate-400 no-print">
            <p>Powered by Google Gemini API. © {new Date().getFullYear()} Fiscal Audit Assistant.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
