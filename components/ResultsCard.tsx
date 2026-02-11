
import React, { useState, useRef, useEffect } from 'react';
import { type CalculatedData } from '../types.ts';
import { reinfCodes } from '../reinfCodes.ts';
import { CheckIcon, ClipboardIcon, InfoIcon, ExternalLinkIcon, ChevronDownIcon } from './icons.tsx';

interface ResultsCardProps {
  data: CalculatedData;
  onTaxStatusChange: (key: 'optanteSimples' | 'isMei') => void;
  onValueChange: (key: 'codigoReinf' | 'aliquotaIR', value: string | number) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const StatusToggle: React.FC<{ status: string, onToggle: () => void }> = ({ status, onToggle }) => {
    const isYes = status.toUpperCase() === 'SIM';
    return (
        <button 
            onClick={onToggle}
            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isYes ? 'bg-green-100 hover:bg-green-200 text-green-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            {status.toUpperCase()}
        </button>
    );
};


const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 min-h-[40px] print:py-1.5 print:min-h-0 print:border-slate-200">
        <span className="text-sm text-slate-600 flex-shrink-0 mr-4 print:text-xs">{label}</span>
        <div className="text-sm text-right font-medium text-slate-800 print:text-xs">
             {value}
        </div>
    </div>
);

const ResultsCard: React.FC<ResultsCardProps> = ({ data, onTaxStatusChange, onValueChange }) => {
    const [copied, setCopied] = useState(false);
    const [verifyCnpjText, setVerifyCnpjText] = useState('Verificar na Receita');
    const [isReinfOpen, setIsReinfOpen] = useState(false);
    const [reinfSearch, setReinfSearch] = useState('');
    const reinfDropdownRef = useRef<HTMLDivElement>(null);

    const [isIrOpen, setIsIrOpen] = useState(false);
    const irDropdownRef = useRef<HTMLDivElement>(null);


    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (reinfDropdownRef.current && !reinfDropdownRef.current.contains(event.target as Node)) {
                setIsReinfOpen(false);
            }
            if (irDropdownRef.current && !irDropdownRef.current.contains(event.target as Node)) {
                setIsIrOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        { label: 'Valor Bruto', value: formatCurrency(data.valorBruto), className: 'text-slate-800 font-medium' },
        { label: `(-) Retenção I.R. (${data.irrf.rate.toFixed(2).replace('.',',')}%)`, value: formatCurrency(data.irrf.value), className: data.irrf.value > 0 ? 'text-red-600' : 'text-slate-500', observation: data.irrf.observacao },
    ];

    if (data.inss.value > 0) {
        const inssLabel = data.inss.base > 0
            ? `(-) Retenção INSS (${data.inss.rate.toFixed(2).replace('.', ',')}% de ${formatCurrency(data.inss.base)})`
            : `(-) Retenção INSS`;
        
        calculoItems.push({ 
            label: inssLabel, 
            value: formatCurrency(data.inss.value), 
            className: 'text-red-600'
        });
    }

    calculoItems.push(
        { label: `(-) Retenção ISS (${data.iss.rate.toFixed(2).replace('.',',')}%)`, value: formatCurrency(data.iss.value), className: data.iss.value > 0 ? 'text-red-600' : 'text-slate-500', observation: data.issObservacao },
        { label: '(=) Valor Líquido a Pagar', value: formatCurrency(data.valorLiquido), className: 'text-slate-900 font-bold' }
    );
    
    const irrfRates = [
        { value: 0.24, label: "0,24%" },
        { value: 1.20, label: "1,20%" },
        { value: 2.40, label: "2,40%" },
        { value: 4.80, label: "4,80%" },
    ];
    
    const allIrrfRates = [...irrfRates];
    const currentRateExists = allIrrfRates.some(r => r.value === data.irrf.rate);
    if (!currentRateExists && data.irrf.rate > 0) {
        allIrrfRates.push({ value: data.irrf.rate, label: `${data.irrf.rate.toFixed(2).replace('.',',')}% (Extraído)` });
    }
    allIrrfRates.push({ value: 0, label: "0,00% (Isento/Outros)" });
    const selectedIrLabel = allIrrfRates.find(r => r.value === data.irrf.rate)?.label;


  return (
    <div className="bg-white rounded-xl ">
        <div className="px-6 pt-4 pb-6 print:p-0">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center print:text-lg print:mb-4">Demonstrativo de Cálculo</h2>
            
            <div className="space-y-4 print:space-y-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-2 border-b pb-1 print:mb-1.5 print:text-xs">DADOS DO FORNECEDOR</h3>
                    <div className="space-y-1 print:space-y-0">
                        <DetailRow label="Fornecedor" value={<span className="truncate" title={data.razaoSocial}>{data.razaoSocial}</span>} />
                        <DetailRow 
                            label="CNPJ" 
                            value={
                                <div className="flex items-center gap-2 justify-end">
                                    <span>{data.cnpj}</span>
                                    <button onClick={handleVerifyCnpj} className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2 rounded-md transition-colors no-print">
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
                    <h3 className="text-sm font-semibold text-slate-500 mb-2 border-b pb-1 print:mb-1.5 print:text-xs">REGIME TRIBUTÁRIO (Editável)</h3>
                     <div className="space-y-1 print:space-y-0">
                        <DetailRow label="Optante pelo Simples?" value={<StatusToggle status={data.optanteSimples} onToggle={() => onTaxStatusChange('optanteSimples')} />} />
                        <DetailRow label="É MEI?" value={<StatusToggle status={data.isMei} onToggle={() => onTaxStatusChange('isMei')} />} />
                    </div>
                     <p className="text-xs text-slate-400 text-right mt-1 italic print:text-[10px]">
                        *Clique em SIM/NÃO para recalcular após verificar.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-2 border-b pb-1 print:mb-1.5 print:text-xs">AJUSTES MANUAIS</h3>
                    <div className="space-y-1 print:space-y-0">
                        <DetailRow 
                            label="Código REINF" 
                            value={
                                <div ref={reinfDropdownRef} className="relative w-full max-w-[280px] ml-auto print:max-w-none">
                                    <button
                                        onClick={() => setIsReinfOpen(!isReinfOpen)}
                                        className="w-full bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm flex justify-between items-center print:py-1 print:text-xs print:shadow-none"
                                    >
                                        <span className="truncate">{selectedReinf.code} - {selectedReinf.description}</span>
                                        <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform no-print ${isReinfOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isReinfOpen && (
                                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-slate-200 rounded-md max-h-60 flex flex-col no-print">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar código ou descrição..."
                                                    value={reinfSearch}
                                                    onChange={(e) => setReinfSearch(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                        className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer truncate"
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
                                     <div ref={irDropdownRef} className="relative w-full max-w-[280px] ml-auto print:max-w-none">
                                        <button
                                            onClick={() => setIsIrOpen(!isIrOpen)}
                                            className="w-full bg-white border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm flex justify-between items-center print:py-1 print:text-xs print:shadow-none"
                                        >
                                            <span className="truncate">{selectedIrLabel}</span>
                                            <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform no-print ${isIrOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isIrOpen && (
                                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-slate-200 rounded-md no-print">
                                                <ul className="overflow-y-auto max-h-60">
                                                    {allIrrfRates.map(rate => (
                                                        <li
                                                            key={rate.value}
                                                            onClick={() => {
                                                                onValueChange('aliquotaIR', rate.value);
                                                                setIsIrOpen(false);
                                                            }}
                                                            className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                        >
                                                            {rate.label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                } 
                            />
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-2 border-b pb-1 print:mb-1.5 print:text-xs">CÁLCULO DE RETENÇÕES</h3>
                     <div className="space-y-2 pt-2 print:space-y-1 print:pt-1">
                        {calculoItems.map((item, index) => (
                             <div key={index}>
                                <div className={`flex justify-between items-center py-1.5 ${index === calculoItems.length - 2 ? 'border-b-2 border-slate-200' : ''} print:py-1`}>
                                    <span className={`text-sm ${item.className} print:text-xs`}>{item.label}</span>
                                    <span className={`text-sm text-right ${item.className} print:text-xs`}>{item.value}</span>
                                </div>
                                {item.observation && (
                                    <div className="flex justify-end items-center text-right text-xs text-blue-600 -mt-1 pb-1 pr-1 gap-1 print:text-[10px] print:text-slate-600">
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

        <div className="bg-slate-50/70 p-4 rounded-b-xl border-t border-slate-200 results-json-section">
             <h3 className="text-sm font-semibold text-slate-700 mb-2">JSON para Integração</h3>
            <div className="relative bg-slate-900 rounded-lg">
                <pre className="p-4 text-sm text-slate-100 overflow-x-auto">
                    <code>{jsonData}</code>
                </pre>
                 <button 
                    onClick={handleCopyJson}
                    className="absolute top-2 right-2 p-2 bg-slate-700/80 rounded-md hover:bg-slate-600 transition-colors"
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
  );
};

export default ResultsCard;
