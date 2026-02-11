
import React, { useState, memo } from 'react';
import { type CalculatedData } from '../types';
import { reinfCodes } from '../reinfCodes';
import { irrfRates } from '../config';
import { useClickOutside } from '../hooks/useClickOutside';
import { CheckIcon, ClipboardIcon, InfoIcon, ExternalLinkIcon, ChevronDownIcon } from './icons';

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
    
    const reinfDropdownRef = useClickOutside<HTMLDivElement>(() => setIsReinfOpen(false));
    const irDropdownRef = useClickOutside<HTMLDivElement>(() => setIsIrOpen(false));


    const selectedReinf = reinfCodes.find(c => c.code === data.codigoReinf) || reinfCodes[reinfCodes.length - 1];
    const filteredReinfCodes = reinfCodes.filter(
        item =>
          item.code.toLowerCase().includes(reinfSearch.toLowerCase()) ||
          item.description.toLowerCase().includes(reinfSearch.toLowerCase())
    );

    const handleVerifyCnpj = () => {
        const cnpjToCopy = data.cnpj.replace(/[^\d]/g, ''); // Remove formatting for easier use
        navigator.clipboard.writeText(cnpjToCopy);
        setVerifyCnpjText('CNPJ Copiado!');
        window.open('https://consopt.www8.receita.fazenda.gov.br/consultaoptantes', '_blank');
        setTimeout(() => setVerifyCnpjText('Verificar na Receita'), 2500);
    }

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
            retencoes: {
                irrf: {
                    aliquota: data.irrf.rate,
                    valor: data.irrf.value,
                    observacao: data.irrf.observacao,
                },
                csrf: {
                    aliquota: data.csrf.rate,
                    valor: data.csrf.value,
                    observacao: data.csrf.observacao,
                },
                iss: {
                    aliquota: data.iss.rate,
                    valor: data.iss.value,
                    observacao: data.issObservacao || "ISS retido normalmente em Senador Canedo.",
                },
                inss: {
                    aliquota: data.inss.rate,
                    base: data.inss.base,
                    valor: data.inss.value,
                }
            },
            valorLiquido: data.valorLiquido,
        },
        null,
        2
    );

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const calculoItems = [
        { label: 'Valor Bruto', value: formatCurrency(data.valorBruto), className: 'text-slate-800 dark:text-slate-100 font-medium' },
        { label: `(-) Retenção I.R. (${data.irrf.rate.toString().replace('.',',')}%)`, value: formatCurrency(data.irrf.value), className: data.irrf.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400', observation: data.irrf.observacao },
        { label: `(-) Retenção CSRF (4,65%)`, value: formatCurrency(data.csrf.value), className: data.csrf.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400', observation: data.csrf.observacao },
    ];

    if (data.inss.base > 0 || data.inss.value > 0) {
        const inssLabel = data.inss.base > 0
            ? `(-) Retenção INSS (${data.inss.rate.toFixed(2).replace('.', ',')}% de ${formatCurrency(data.inss.base)})`
            : `(-) Retenção INSS`;
        
        calculoItems.push({ 
            label: inssLabel, 
            value: formatCurrency(data.inss.value), 
            className: data.inss.value > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
        });
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
        <div className="px-6 pt-4 pb-6 print:p-0">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 text-center print:text-lg print:mb-4">Demonstrativo de Cálculo</h2>
            
            <div className="space-y-4 print:space-y-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 print:mb-1.5 print:text-xs">DADOS DO FORNECEDOR</h3>
                    <div className="space-y-1 print:space-y-0">
                        <DetailRow label="Fornecedor" value={<span className="truncate" title={data.razaoSocial}>{data.razaoSocial}</span>} />
                        <DetailRow 
                            label="CNPJ" 
                            value={
                                <div className="flex items-center gap-2 justify-end">
                                    <span>{data.cnpj}</span>
                                    <button onClick={handleVerifyCnpj} className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 font-semibold py-1 px-2 rounded-md transition-colors no-print">
                                        <ExternalLinkIcon className="h-3 w-3" />
                                        {verifyCnpjText}
                                    </button>
                                </div>
                            } 
                        />
                        <DetailRow label="Nº da NF" value={data.numeroNF} />
                        <DetailRow label="Tipo de Documento" value={data.documentoTipo || 'Não Identificado'} />
                        <DetailRow label="Local da Empresa" value={<span className="truncate" title={data.localServico}>{data.localServico}</span>} />
                        <DetailRow label="Município Incidência" value={<span className="truncate" title={data.municipioIncidencia}>{data.municipioIncidencia}</span>} />
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 print:mb-1.5 print:text-xs">REGIME TRIBUTÁRIO (Editável)</h3>
                     <div className="space-y-1 print:space-y-0">
                        <DetailRow label="Optante pelo Simples?" value={<StatusToggle status={data.optanteSimples} onToggle={() => onTaxStatusChange('optanteSimples')} />} />
                        <DetailRow label="É MEI?" value={<StatusToggle status={data.isMei} onToggle={() => onTaxStatusChange('isMei')} />} />
                    </div>
                     <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1 italic print:text-[10px]">
                        *Clique em SIM/NÃO para recalcular após verificar.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 print:mb-1.5 print:text-xs">AJUSTES MANUAIS</h3>
                    <div className="space-y-1 print:space-y-0">
                        <DetailRow 
                            label="Código REINF" 
                            value={
                                <div ref={reinfDropdownRef} className="relative w-full max-w-[280px] ml-auto print:max-w-none">
                                    <button
                                        onClick={() => setIsReinfOpen(!isReinfOpen)}
                                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm flex justify-between items-center print:py-1 print:text-xs print:shadow-none"
                                    >
                                        <span className="truncate">{selectedReinf.code} - {selectedReinf.description}</span>
                                        <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform no-print ${isReinfOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isReinfOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-600 rounded-md max-h-60 flex flex-col no-print">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar código ou descrição..."
                                                    value={reinfSearch}
                                                    onChange={(e) => setReinfSearch(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <ul className="overflow-y-auto flex-1">
                                                {filteredReinfCodes.map(item => (
                                                    <li
                                                        key={item.code}
                                                        onClick={() => {
                                                            onValueChange('codigoReinf', item.code);
                                                            setIsReinfOpen(false);
                                                            setReinfSearch('');
                                                        }}
                                                        className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer truncate"
                                                        title={`${item.code} - ${item.description}`}
                                                    >
                                                        <strong>{item.code}</strong> - {item.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            } 
                        />
                        
                        {data.optanteSimples.toUpperCase() === 'NÃO' && data.isMei.toUpperCase() === 'NÃO' && (
                             <DetailRow 
                                label="Alíquota I.R." 
                                value={
                                     isEditingIr ? (
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            defaultValue={data.irrf.rate.toString().replace('.', ',')}
                                            onBlur={(e) => {
                                                const newValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                                onValueChange('aliquotaIR', newValue);
                                                setIsEditingIr(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            autoFocus
                                            className="w-full max-w-[280px] ml-auto bg-white dark:bg-slate-700 border border-blue-500 rounded-md shadow-sm px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                        />
                                    ) : (
                                        <div ref={irDropdownRef} className="relative w-full max-w-[280px] ml-auto print:max-w-none">
                                            <button
                                                onClick={() => setIsIrOpen(!isIrOpen)}
                                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm flex justify-between items-center print:py-1 print:text-xs print:shadow-none"
                                            >
                                                <span className="truncate">{selectedIrLabel}</span>
                                                <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform no-print ${isIrOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isIrOpen && (
                                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-600 rounded-md no-print">
                                                    <ul className="overflow-y-auto max-h-60">
                                                        {allIrrfRates.map(rate => (
                                                            <li
                                                                key={rate.value === -1 ? 'custom-ir' : rate.value}
                                                                onClick={() => {
                                                                    if (rate.value === -1) {
                                                                        setIsEditingIr(true);
                                                                    } else {
                                                                        onValueChange('aliquotaIR', rate.value);
                                                                    }
                                                                    setIsIrOpen(false);
                                                                }}
                                                                className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                                            >
                                                                {rate.label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )
                                } 
                            />
                        )}

                        {data.documentoTipo?.toUpperCase() !== 'PRODUTO' && (
                            <>
                                <DetailRow 
                                    label="Alíquota ISS (%)" 
                                    value={
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            key={`iss-rate-${data.iss.rate}`}
                                            defaultValue={data.iss.rate.toString().replace('.', ',')}
                                            onBlur={(e) => {
                                                const newValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                                onValueChange('aliquotaISS', newValue);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className="w-full max-w-[120px] ml-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                            placeholder="Ex: 5,00"
                                        />
                                    } 
                                />
                                <DetailRow 
                                    label="Base de Cálculo INSS (R$)" 
                                    value={
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            key={`inss-base-${data.inss.base}`}
                                            defaultValue={data.inss.base > 0 ? data.inss.base.toString().replace('.', ',') : ''}
                                            onBlur={(e) => {
                                                const newValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                                onValueChange('baseCalculoINSS', newValue);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className="w-full max-w-[120px] ml-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                            placeholder="Ex: 1000,00"
                                        />
                                    } 
                                />
                                <DetailRow 
                                    label="Alíquota INSS (%)" 
                                    value={
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            key={`inss-rate-${data.inss.rate}`}
                                            defaultValue={data.inss.rate > 0 ? data.inss.rate.toString().replace('.', ',') : ''}
                                            onBlur={(e) => {
                                                const newValue = parseFloat(e.target.value.replace(',', '.')) || 0;
                                                onValueChange('aliquotaINSS', newValue);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className="w-full max-w-[120px] ml-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                            placeholder="Ex: 11,00"
                                        />
                                    } 
                                />
                            </>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 print:mb-1.5 print:text-xs">CÁLCULO DE RETENÇÕES</h3>
                     <div className="space-y-2 pt-2 print:space-y-1 print:pt-1">
                        {calculoItems.map((item, index) => (
                             <div key={index}>
                                <div className={`flex justify-between items-center py-1.5 ${index === calculoItems.length - 2 ? 'border-b-2 border-slate-200 dark:border-slate-600' : ''} print:py-1`}>
                                    <span className={`text-sm ${item.className} print:text-xs`}>{item.label}</span>
                                    <span className={`text-sm text-right ${item.className} print:text-xs`}>{item.value}</span>
                                </div>
                                {item.observation && (
                                    <div className="flex justify-end items-center text-right text-xs text-blue-600 dark:text-blue-400 -mt-1 pb-1 pr-1 gap-1 print:text-[10px] print:text-slate-600">
                                        <InfoIcon className="h-3 w-3 print:h-2.5 print:w-2.5" />
                                        <span>{item.observation}</span>
                                    </div>
                                )}
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-b-xl border-t border-slate-200 dark:border-slate-700 results-json-section">
             <button
                onClick={() => setIsJsonVisible(!isJsonVisible)}
                className="w-full flex justify-between items-center text-left focus:outline-none group"
                aria-expanded={isJsonVisible}
                aria-controls="json-content"
            >
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">JSON para Integração</h3>
                <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${isJsonVisible ? 'rotate-180' : ''}`} />
            </button>
            <div 
                id="json-content"
                className={`transition-[max-height,margin] duration-500 ease-in-out overflow-hidden ${isJsonVisible ? 'max-h-96 mt-2' : 'max-h-0'}`}
            >
                <div className="relative bg-slate-900 dark:bg-black/50 rounded-lg">
                    <pre className="p-4 text-sm text-slate-100 overflow-x-auto">
                        <code>{jsonData}</code>
                    </pre>
                     <button 
                        onClick={handleCopyJson}
                        className="absolute top-2 right-2 p-2 bg-slate-700/80 rounded-md hover:bg-slate-600 transition-colors"
                        aria-label="Copiar JSON"
                        >
                        {copied ? (
                            <CheckIcon className="h-5 w-5 text-green-400" />
                        ) : (
                            <ClipboardIcon className="h-5 w-5 text-slate-300" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default memo(ResultsCard);
