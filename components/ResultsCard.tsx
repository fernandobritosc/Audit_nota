
import React, { useState, memo, useMemo, useEffect } from 'react';
import { type CalculatedData, type LiquidationSplit } from '../types';
import { reinfCodes } from '../reinfCodes';
import { irrfRates } from '../config';
import { useClickOutside } from '../hooks/useClickOutside';
import { CheckIcon, ClipboardIcon, InfoIcon, ExternalLinkIcon, ChevronDownIcon, SplitIcon, PlusCircleIcon, TrashIcon } from './icons';

type ManualChangeKey = 'codigoReinf' | 'aliquotaIR' | 'aliquotaISS' | 'baseCalculoINSS' | 'aliquotaINSS';

interface ResultsCardProps {
  data: CalculatedData;
  onTaxStatusChange: (key: 'optanteSimples' | 'isMei') => void;
  onValueChange: (key: ManualChangeKey, value: string | number) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const StatusToggle: React.FC<{ status: string, onToggle: () => void }> = memo(({ status, onToggle }) => {
    const isYes = status.toUpperCase() === 'SIM';
    return (
        <button 
            onClick={onToggle}
            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isYes ? 'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'}`}>
            {status.toUpperCase()}
        </button>
    );
});


const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = memo(({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 min-h-[40px] print:py-1.5 print:min-h-0 print:border-slate-200">
        <span className="text-sm text-slate-600 dark:text-slate-400 flex-shrink-0 mr-4 print:text-xs">{label}</span>
        <div className="text-sm text-right font-medium text-slate-800 dark:text-slate-200 print:text-xs">
             {value}
        </div>
    </div>
));

const ResultsCard: React.FC<ResultsCardProps> = ({ data, onTaxStatusChange, onValueChange }) => {
    const [copied, setCopied] = useState(false);
    const [verifyCnpjText, setVerifyCnpjText] = useState('Verificar na Receita');
    const [isReinfOpen, setIsReinfOpen] = useState(false);
    const [reinfSearch, setReinfSearch] = useState('');
    const [isIrOpen, setIsIrOpen] = useState(false);
    const [isJsonVisible, setIsJsonVisible] = useState(false);
    const [isEditingIr, setIsEditingIr] = useState(false);
    const [isSplitting, setIsSplitting] = useState(false);
    const [splits, setSplits] = useState<Omit<LiquidationSplit, 'irrf' | 'iss' | 'inss' | 'valorLiquido'>[]>([]);
    
    const reinfDropdownRef = useClickOutside<HTMLDivElement>(() => setIsReinfOpen(false));
    const irDropdownRef = useClickOutside<HTMLDivElement>(() => setIsIrOpen(false));

    const selectedReinf = reinfCodes.find(c => c.code === data.codigoReinf) || reinfCodes[reinfCodes.length - 1];
    const filteredReinfCodes = reinfCodes.filter(
        item =>
          item.code.toLowerCase().includes(reinfSearch.toLowerCase()) ||
          item.description.toLowerCase().includes(reinfSearch.toLowerCase())
    );

    const handleVerifyCnpj = () => {
        const cnpjToCopy = data.cnpj.replace(/[^\d]/g, '');
        navigator.clipboard.writeText(cnpjToCopy);
        setVerifyCnpjText('CNPJ Copiado!');
        window.open('https://consopt.www8.receita.fazenda.gov.br/consultaoptantes', '_blank');
        setTimeout(() => setVerifyCnpjText('Verificar na Receita'), 2500);
    }
    
    // --- Lógica de Rateio (Splitting) ---
    const processedSplits = useMemo((): LiquidationSplit[] => {
        if (!isSplitting || !data.valorBruto) return [];

        let runningTotals = { irrf: 0, iss: 0, inss: 0 };
        const totalSplits = splits.length;

        return splits.map((split, index) => {
            const isLastSplit = index === totalSplits - 1;
            let proportionalIrrf, proportionalIss, proportionalInss;

            if (!isLastSplit) {
                const proportion = split.valorBruto > 0 && data.valorBruto > 0 ? split.valorBruto / data.valorBruto : 0;
                proportionalIrrf = parseFloat((data.irrf.value * proportion).toFixed(2));
                proportionalIss = parseFloat((data.iss.value * proportion).toFixed(2));
                proportionalInss = parseFloat((data.inss.value * proportion).toFixed(2));

                runningTotals.irrf += proportionalIrrf;
                runningTotals.iss += proportionalIss;
                runningTotals.inss += proportionalInss;
            } else {
                proportionalIrrf = parseFloat((data.irrf.value - runningTotals.irrf).toFixed(2));
                proportionalIss = parseFloat((data.iss.value - runningTotals.iss).toFixed(2));
                proportionalInss = parseFloat((data.inss.value - runningTotals.inss).toFixed(2));
            }

            const valorLiquido = split.valorBruto - proportionalIrrf - proportionalIss - proportionalInss;
            return { ...split, irrf: proportionalIrrf, iss: proportionalIss, inss: proportionalInss, valorLiquido };
        });
    }, [splits, data, isSplitting]);

    const splitTotals = useMemo(() => {
        return processedSplits.reduce((acc, split) => {
            acc.valorBruto += split.valorBruto;
            acc.irrf += split.irrf;
            acc.iss += split.iss;
            acc.inss += split.inss;
            acc.valorLiquido += split.valorLiquido;
            return acc;
        }, { valorBruto: 0, irrf: 0, iss: 0, inss: 0, valorLiquido: 0 });
    }, [processedSplits]);

    const remainingAmountToSplit = data.valorBruto - splitTotals.valorBruto;

    const handleToggleSplitting = () => {
        const nextState = !isSplitting;
        setIsSplitting(nextState);
        if (nextState && splits.length === 0) {
            setSplits([{ id: Date.now(), empenho: '', valorBruto: data.valorBruto }]);
        }
    };

    const handleAddSplit = () => {
        setSplits(prev => [...prev, { id: Date.now(), empenho: '', valorBruto: 0 }]);
    };
    
    const handleRemoveSplit = (id: number) => {
        setSplits(prev => prev.filter(split => split.id !== id));
    };

    const handleUpdateSplit = (id: number, field: 'empenho' | 'valorBruto', value: string) => {
        setSplits(prev => prev.map(split => {
            if (split.id === id) {
                if (field === 'valorBruto') {
                    const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
                    return { ...split, valorBruto: numericValue };
                }
                return { ...split, [field]: value };
            }
            return split;
        }));
    };
    
    const jsonData = JSON.stringify(
        {
            razaoSocial: data.razaoSocial,
            cnpj: data.cnpj,
            numeroNF: data.numeroNF,
            documentoTipo: data.documentoTipo,
            codigoReinf: data.codigoReinf,
            optanteSimples: data.optanteSimples,
            isMei: data.isMei,
            localServico: data.localServico,
            municipioIncidencia: data.municipioIncidencia,
            valorBruto: data.valorBruto,
            retencoes: { irrf: data.irrf, iss: data.iss, inss: data.inss },
            valorLiquido: data.valorLiquido,
            rateioPorEmpenho: isSplitting && Math.abs(remainingAmountToSplit) < 0.01 ? processedSplits.map(s => ({
                empenho: s.empenho,
                valorBruto: s.valorBruto,
                irrf: s.irrf,
                iss: s.iss,
                inss: s.inss,
                valorLiquido: s.valorLiquido
            })) : undefined
        }, null, 2
    );

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const calculoItems = [
        { label: 'Valor Bruto', value: formatCurrency(data.valorBruto), className: 'text-slate-800 dark:text-slate-100 font-medium' },
        { label: `(-) Retenção I.R. (${data.irrf.rate.toString().replace('.',',')}%)`, value: formatCurrency(data.irrf.value), className: data.irrf.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400', observation: data.irrf.observacao },
    ];
    if (data.inss.base > 0 || data.inss.value > 0) {
        const inssLabel = data.inss.base > 0 ? `(-) Retenção INSS (${data.inss.rate.toFixed(2).replace('.', ',')}% de ${formatCurrency(data.inss.base)})` : `(-) Retenção INSS`;
        calculoItems.push({ label: inssLabel, value: formatCurrency(data.inss.value), className: data.inss.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400' });
    }
    calculoItems.push(
        { label: `(-) Retenção ISS (${data.iss.rate.toString().replace('.',',')}%)`, value: formatCurrency(data.iss.value), className: data.iss.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400', observation: data.issObservacao },
        { label: '(=) Valor Líquido a Pagar', value: formatCurrency(data.valorLiquido), className: 'text-slate-900 dark:text-slate-50 font-bold' }
    );
        
    const allIrrfRates = [...irrfRates];
    const currentIrRateExists = allIrrfRates.some(r => r.value === data.irrf.rate);
    if (!currentIrRateExists && data.irrf.rate > 0) {
        allIrrfRates.unshift({ value: data.irrf.rate, label: `${data.irrf.rate.toString().replace('.',',')}%` });
    }
    allIrrfRates.push({ value: 0, label: "0,00% (Isento/Outros)" });
    allIrrfRates.push({ value: -1, label: "Digitar valor..." });
    const selectedIrLabel = allIrrfRates.find(r => r.value === data.irrf.rate)?.label;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl ">
        <div className={`px-6 pt-4 pb-6 print:p-0 ${isSplitting ? 'print:hidden' : ''}`}>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 text-center print:text-lg print:mb-4">Demonstrativo de Cálculo</h2>
            <div className="space-y-4 print:space-y-3">
                <DetailRow label="Fornecedor" value={<span className="truncate" title={data.razaoSocial}>{data.razaoSocial}</span>} />
                <DetailRow label="CNPJ" value={<div className="flex items-center gap-2 justify-end"><span>{data.cnpj}</span><button onClick={handleVerifyCnpj} className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 font-semibold py-1 px-2 rounded-md transition-colors no-print"><ExternalLinkIcon className="h-3 w-3" />{verifyCnpjText}</button></div>} />
                <DetailRow label="Nº da NF" value={data.numeroNF} />
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 print:mb-1.5 print:text-xs">CÁLCULO DE RETENÇÕES</h3>
                     <div className="space-y-2 pt-2 print:space-y-1 print:pt-1">
                        {calculoItems.map((item, index) => (
                             <div key={index}>
                                <div className={`flex justify-between items-center py-1.5 ${index === calculoItems.length - 2 ? 'border-b-2 border-slate-200 dark:border-slate-600' : ''} print:py-1`}><span className={`text-sm ${item.className} print:text-xs`}>{item.label}</span><span className={`text-sm text-right ${item.className} print:text-xs`}>{item.value}</span></div>
                                {item.observation && (<div className="flex justify-end items-center text-right text-xs text-blue-600 dark:text-blue-400 -mt-1 pb-1 pr-1 gap-1 print:text-[10px] print:text-slate-600"><InfoIcon className="h-3 w-3 print:h-2.5 print:w-2.5" /><span>{item.observation}</span></div>)}
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        
        {/* --- Seção de Rateio --- */}
        <div className={`px-6 pt-4 pb-6 ${!isSplitting ? 'hidden print:hidden' : 'print:block'}`}>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 text-center print:text-lg print:mb-4">Rateio da Liquidação por Empenho</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Nº do Empenho</th>
                            <th className="px-4 py-3 text-right">Valor Bruto</th>
                            <th className="px-4 py-3 text-right">(-) IRRF</th>
                            <th className="px-4 py-3 text-right">(-) ISS</th>
                            <th className="px-4 py-3 text-right">(-) INSS</th>
                            <th className="px-4 py-3 text-right font-bold">(=) Valor Líquido</th>
                            <th className="px-4 py-3 no-print"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedSplits.map(split => (
                            <tr key={split.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-2"><input type="text" value={split.empenho} onChange={e => handleUpdateSplit(split.id, 'empenho', e.target.value)} className="w-full bg-transparent p-1 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-slate-800" placeholder="Digite o nº" /></td>
                                <td className="px-4 py-2"><input type="text" value={new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 2}).format(split.valorBruto)} onChange={e => handleUpdateSplit(split.id, 'valorBruto', e.target.value)} className="w-28 text-right bg-transparent p-1 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-slate-800" /></td>
                                <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(split.irrf)}</td>
                                <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(split.iss)}</td>
                                <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(split.inss)}</td>
                                <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(split.valorLiquido)}</td>
                                <td className="px-4 py-2 text-center no-print"><button onClick={() => handleRemoveSplit(split.id)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100">
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(splitTotals.valorBruto)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(splitTotals.irrf)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(splitTotals.iss)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(splitTotals.inss)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(splitTotals.valorLiquido)}</td>
                            <td className="no-print"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="flex justify-between items-center mt-4 no-print">
                <button onClick={handleAddSplit} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"><PlusCircleIcon className="h-5 w-5" /> Adicionar Empenho</button>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Valor Restante a Liquidar:</p>
                    <p className={`text-lg font-bold ${Math.abs(remainingAmountToSplit) > 0.01 ? 'text-orange-500' : 'text-green-600'}`}>{formatCurrency(remainingAmountToSplit)}</p>
                </div>
            </div>
        </div>

        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
            <div className={`flex justify-between items-center ${isJsonVisible ? 'mb-2' : ''}`}>
                 <button onClick={handleToggleSplitting} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 no-print">
                    <SplitIcon className="h-5 w-5" />
                    {isSplitting ? 'Ver Cálculo Total' : 'Dividir Liquidação'}
                 </button>
                 <button onClick={() => setIsJsonVisible(!isJsonVisible)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" aria-expanded={isJsonVisible} aria-controls="json-content">
                    JSON para Integração
                    <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${isJsonVisible ? 'rotate-180' : ''}`} />
                 </button>
            </div>
            <div id="json-content" className={`transition-[max-height,margin] duration-500 ease-in-out overflow-hidden ${isJsonVisible ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                <div className="relative bg-slate-900 dark:bg-black/50 rounded-lg">
                    <pre className="p-4 text-sm text-slate-100 overflow-x-auto"><code>{jsonData}</code></pre>
                     <button onClick={handleCopyJson} className="absolute top-2 right-2 p-2 bg-slate-700/80 rounded-md hover:bg-slate-600 transition-colors" aria-label="Copiar JSON">
                        {copied ? (<CheckIcon className="h-5 w-5 text-green-400" />) : (<ClipboardIcon className="h-5 w-5 text-slate-300" />)}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default memo(ResultsCard);