
import React, { useState, memo, useMemo } from 'react';
import { type CalculatedData, type LiquidationSplit } from '../types.ts';
import { reinfCodes } from '../reinfCodes.ts';
import { formatCurrency } from '../config/utilis/formatters.ts';
import { CheckIcon, ClipboardIcon, InfoIcon, ExternalLinkIcon, ChevronDownIcon, SplitIcon, PlusCircleIcon, TrashIcon } from './icons.tsx';

type ManualChangeKey = 'codigoReinf' | 'aliquotaIR' | 'aliquotaISS' | 'baseCalculoINSS' | 'aliquotaINSS';

interface ResultsCardProps {
    data: CalculatedData;
    onTaxStatusChange: (key: 'optanteSimples' | 'isMei') => void;
    onValueChange: (key: ManualChangeKey, value: string | number) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = memo(({ label, value, mono }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 py-3 border-b border-slate-100 dark:border-slate-800/50 items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">{label}</span>
        <div className={`text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right ${mono ? 'font-mono' : ''}`}>
            {value}
        </div>
    </div>
));


// Helper component for free-typing numbers (avoids "ATM style" masking while typing)
const DecimalInput: React.FC<{
    value: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    className?: string;
    isCurrency?: boolean;
}> = ({ value, onChange, disabled, className, isCurrency }) => {
    const [localStr, setLocalStr] = useState<string | null>(null);

    // Sync with external value changes when not editing
    // We use a key-based approach or just blur logic. 
    // Ideally, we only show localStr if it's not null.

    const formattedValue = isCurrency
        ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
        : value.toFixed(2).replace('.', ',');

    const displayValue = localStr !== null ? localStr : formattedValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalStr(e.target.value);
    };

    const handleBlur = () => {
        if (localStr === null) return;

        // Parse the local string to a number
        // Support 1.000,00 or 1000.00
        let normalized = localStr.replace(/\./g, '').replace(',', '.');
        // Handle case where user might type just "1000" (implied .00)
        let numVal = parseFloat(normalized);

        if (isNaN(numVal)) numVal = 0;

        onChange(numVal);
        setLocalStr(null); // Return to formatted display
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input
            type="text"
            value={displayValue}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
        />
    );
};

const ResultsCard: React.FC<ResultsCardProps> = ({ data, onTaxStatusChange, onValueChange }) => {
    const [copied, setCopied] = useState(false);
    const [verifyCnpjText, setVerifyCnpjText] = useState('Consultar Receita');
    const [isJsonVisible, setIsJsonVisible] = useState(false);
    const [isSplitting, setIsSplitting] = useState(false);
    const [splits, setSplits] = useState<Omit<LiquidationSplit, 'irrf' | 'iss' | 'inss' | 'valorLiquido'>[]>([]);

    const selectedReinf = reinfCodes.find(c => c.code === data.codigoReinf) || reinfCodes[reinfCodes.length - 1];

    const handleVerifyCnpj = () => {
        const cnpjToCopy = data.cnpj.replace(/[^\d]/g, '');
        navigator.clipboard.writeText(cnpjToCopy);
        setVerifyCnpjText('Copiado!');
        window.open('https://consopt.www8.receita.fazenda.gov.br/consultaoptantes', '_blank');
        setTimeout(() => setVerifyCnpjText('Consultar Receita'), 2500);
    }

    const processedSplits = useMemo((): LiquidationSplit[] => {
        if (!isSplitting || !data.valorBruto) return [];
        let runningTotals = { irrf: 0, iss: 0, inss: 0 };
        const totalSplits = splits.length;

        return splits.map((split, index) => {
            const isLastSplit = index === totalSplits - 1;
            let pIrrf, pIss, pInss;
            if (!isLastSplit) {
                const prop = split.valorBruto > 0 && data.valorBruto > 0 ? split.valorBruto / data.valorBruto : 0;
                pIrrf = parseFloat((data.irrf.value * prop).toFixed(2));
                pIss = parseFloat((data.iss.value * prop).toFixed(2));
                pInss = parseFloat((data.inss.value * prop).toFixed(2));
                runningTotals.irrf += pIrrf;
                runningTotals.iss += pIss;
                runningTotals.inss += pInss;
            } else {
                pIrrf = parseFloat((data.irrf.value - runningTotals.irrf).toFixed(2));
                pIss = parseFloat((data.iss.value - runningTotals.iss).toFixed(2));
                pInss = parseFloat((data.inss.value - runningTotals.inss).toFixed(2));
            }
            return { ...split, irrf: pIrrf, iss: pIss, inss: pInss, valorLiquido: split.valorBruto - pIrrf - pIss - pInss };
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

    const handleAddSplit = () => setSplits(prev => [...prev, { id: Date.now(), empenho: '', valorBruto: 0 }]);
    const handleRemoveSplit = (id: number) => setSplits(prev => prev.filter(s => s.id !== id));
    const handleUpdateSplit = (id: number, field: 'empenho' | 'valorBruto', value: string) => {
        setSplits(prev => prev.map(s => {
            if (s.id === id) {
                if (field === 'valorBruto') {
                    const digits = value.replace(/\D/g, '');
                    return { ...s, valorBruto: Number(digits) / 100 };
                }
                return { ...s, [field]: value };
            }
            return s;
        }));
    };

    const jsonData = JSON.stringify(data, null, 2);

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-slate-800 overflow-hidden">
            {/* Report Header Identification */}
            <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-[#003366] dark:text-blue-400 uppercase tracking-widest">Relatório de Auditoria Fiscal</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">DOCUMENTO GERADO EM {new Date().toLocaleDateString('pt-BR')} ÀS {new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-wider">Análise Concluída</span>
                </div>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Section: Identificação */}
                    <div className="lg:col-span-12">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-[#003366] dark:bg-blue-500 rounded-full"></div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Identificação do Objeto</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <DetailRow label="Razão Social" value={data.razaoSocial} />
                            <DetailRow label="CNPJ / CPF" value={
                                <div className="flex items-center justify-end gap-3 font-mono">
                                    <span>{data.cnpj}</span>
                                    <button onClick={handleVerifyCnpj} className="text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 transition-colors no-print">
                                        {verifyCnpjText}
                                    </button>
                                </div>
                            } />
                            <DetailRow label="Número do Documento" value={<span className="font-mono">{data.numeroNF}</span>} />
                            <DetailRow label="Tipo de Documento" value={
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${data.documentoTipo === 'SERVICO' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                    {data.documentoTipo}
                                </span>
                            } />
                            <DetailRow label="Local de Incidência" value={data.municipioIncidencia} />
                            <DetailRow label="Código REINF" value={
                                <div className="w-full">
                                    <select
                                        value={data.codigoReinf}
                                        onChange={(e) => onValueChange('codigoReinf', e.target.value)}
                                        className="w-full text-xs font-mono bg-transparent dark:bg-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 text-left text-slate-900 dark:text-slate-100"
                                    >
                                        {reinfCodes.map(code => (
                                            <option key={code.code} value={code.code} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                                {code.code} — {code.description.substring(0, 40)}{code.description.length > 40 ? '...' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            } />
                        </div>
                    </div>

                    {/* Section: Cálculos (The Table) */}
                    <div className="lg:col-span-12 mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-[#003366] dark:bg-blue-500 rounded-full"></div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Demonstrativo de Cálculos Fiscais</h4>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 institutional-shadow">
                            <table className="w-full text-sm leading-normal">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descrição dos Eventos</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base / Alíquota</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valores (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800">
                                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Valor Bruto do Documento</td>
                                        <td className="px-6 py-4 text-center text-slate-400 italic">—</td>
                                        <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrency(data.valorBruto)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 dark:text-slate-400">Retenção de IRRF</span>
                                                {data.irrf.value === 0 && <span className="text-[10px] text-orange-600 dark:text-orange-400 italic">Dispensado conforme norma</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <DecimalInput
                                                    value={data.irrf.rate}
                                                    onChange={(val) => onValueChange('aliquotaIR', val)}
                                                    disabled={data.isMei === 'SIM' || data.optanteSimples === 'SIM'}
                                                    className="w-12 text-center font-mono text-xs bg-transparent border-b border-slate-300 dark:border-slate-600 hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                                                />
                                                <span className="font-mono text-xs text-slate-500">%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">-{formatCurrency(data.irrf.value)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Retenção de ISSQN</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <DecimalInput
                                                    value={data.iss.rate}
                                                    onChange={(val) => onValueChange('aliquotaISS', val)}
                                                    className="w-12 text-center font-mono text-xs bg-transparent border-b border-slate-300 dark:border-slate-600 hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                />
                                                <span className="font-mono text-xs text-slate-500">%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">-{formatCurrency(data.iss.value)}</td>
                                    </tr>
                                    {data.inss.value > 0 && (
                                        <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Retenção de INSS</td>
                                            <td className="px-6 py-4 text-center font-mono text-xs">{data.inss.rate.toFixed(2).replace('.', ',')}%</td>
                                            <td className="px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">-{formatCurrency(data.inss.value)}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-[#f8fafc] dark:bg-slate-900/30">
                                        <td className="px-6 py-5 text-[#003366] dark:text-blue-400 font-bold uppercase tracking-wider">Valor Líquido a Pagar</td>
                                        <td className="px-6 py-5 text-center text-slate-400 italic">—</td>
                                        <td className="px-6 py-5 text-right font-mono text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(data.valorLiquido)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section: Parecer Técnico (Observations) */}
                    <div className="lg:col-span-12 mt-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-1 bg-[#003366] dark:bg-blue-500 rounded-full"></div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Parecer Técnico e Observações</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-xl bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3 text-blue-800 dark:text-blue-400">
                                    <InfoIcon className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Orientação sobre ISS</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-blue-200 dark:border-blue-800/50 pl-4">
                                    {data.issObservacao}
                                </p>
                            </div>
                            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-400 font-bold">
                                    <CheckIcon className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Enquadramento Tributário</span>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400 uppercase">Simples Nacional</span>
                                        <button onClick={() => onTaxStatusChange('optanteSimples')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${data.optanteSimples === 'SIM' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                            {data.optanteSimples === 'SIM' ? 'OPTANTE' : 'NÃO OPTANTE'}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400 uppercase">Microempreendedor</span>
                                        <button onClick={() => onTaxStatusChange('isMei')} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${data.isMei === 'SIM' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                            {data.isMei === 'SIM' ? 'MEI' : 'NÃO MEI'}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                        <span className="text-[10px] text-slate-400 uppercase">Base Cálc. INSS (R$)</span>
                                        <DecimalInput
                                            value={data.inss.base || 0}
                                            isCurrency
                                            onChange={(val) => onValueChange('baseCalculoINSS', val)}
                                            disabled={data.isMei === 'SIM'}
                                            className="px-3 py-1 text-[10px] font-bold font-mono rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none w-full shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-20">
                                        <span className="text-[10px] text-slate-400 uppercase">INSS (%)</span>
                                        <DecimalInput
                                            value={data.inss.rate}
                                            onChange={(val) => onValueChange('aliquotaINSS', val)}
                                            disabled={data.isMei === 'SIM'}
                                            className="px-3 py-1 text-[10px] font-bold font-mono rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none w-full shadow-sm text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Rateio (If active) */}
                    {isSplitting && (
                        <div className="lg:col-span-12 mt-4 print:block print-landscape">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-4 w-1 bg-[#003366] dark:bg-blue-500 rounded-full"></div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Rateio de Liquidação por Centro de Custo/Empenho</h4>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                                <table className="w-full text-[13px] text-left">
                                    <thead className="bg-[#f8fafc] dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500">
                                        <tr>
                                            <th className="px-5 py-4">Nº Empenho</th>
                                            <th className="px-5 py-4 text-right">Bruto (R$)</th>
                                            <th className="px-5 py-4 text-right">IRRF</th>
                                            <th className="px-5 py-4 text-right">ISS</th>
                                            <th className="px-5 py-4 text-right">INSS</th>
                                            <th className="px-5 py-4 text-right">Líquido (R$)</th>
                                            <th className="px-5 py-4 no-print text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {processedSplits.map(s => (
                                            <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="px-5 py-3"><input type="text" value={s.empenho} onChange={e => handleUpdateSplit(s.id, 'empenho', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none transition-colors" placeholder="000000/00" /></td>
                                                <td className="px-5 py-3">
                                                    <input type="text" value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(s.valorBruto)} onChange={e => handleUpdateSplit(s.id, 'valorBruto', e.target.value)} className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none transition-colors font-mono" />
                                                </td>
                                                <td className="px-5 py-3 text-right text-red-500 font-mono text-xs">-{formatCurrency(s.irrf)}</td>
                                                <td className="px-5 py-3 text-right text-red-500 font-mono text-xs">-{formatCurrency(s.iss)}</td>
                                                <td className="px-5 py-3 text-right text-red-500 font-mono text-xs">-{formatCurrency(s.inss)}</td>
                                                <td className="px-5 py-3 text-right font-bold font-mono">{formatCurrency(s.valorLiquido)}</td>
                                                <td className="px-5 py-3 text-center no-print">
                                                    <button onClick={() => handleRemoveSplit(s.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-900/30 border-t-2 border-slate-200 dark:border-slate-700">
                                        <tr className="font-bold text-slate-900 dark:text-white">
                                            <td className="px-5 py-4 uppercase">Total Consolidado</td>
                                            <td className="px-5 py-4 text-right">{formatCurrency(splitTotals.valorBruto)}</td>
                                            <td className="px-5 py-4 text-right">-{formatCurrency(splitTotals.irrf)}</td>
                                            <td className="px-5 py-4 text-right">-{formatCurrency(splitTotals.iss)}</td>
                                            <td className="px-5 py-4 text-right">-{formatCurrency(splitTotals.inss)}</td>
                                            <td className="px-5 py-4 text-right">{formatCurrency(splitTotals.valorLiquido)}</td>
                                            <td className="no-print"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 no-print">
                                <button onClick={handleAddSplit} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                                    <PlusCircleIcon className="h-4 w-4 text-[#003366] dark:text-blue-400" />
                                    Adicionar Novo Item de Rateio
                                </button>
                                <div className="text-right mt-4 sm:mt-0 px-2 transition-all">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Diferença Residual</span>
                                    <span className={`text-xl font-mono font-bold ${Math.abs(remainingAmountToSplit) > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {formatCurrency(remainingAmountToSplit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Integration / Actions Bottom Bar */}
            <div className="bg-[#f8fafc] dark:bg-slate-900/60 px-8 py-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6 no-print">
                <button onClick={handleToggleSplitting} className="group flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-[#003366] dark:hover:text-blue-400 transition-all">
                    <div className={`p-2 rounded-lg transition-colors ${isSplitting ? 'bg-[#003366] text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 group-hover:text-[#003366]'}`}>
                        <SplitIcon className="h-5 w-5" />
                    </div>
                    <span>{isSplitting ? 'RECOLHER RATEIO' : 'DIVIDIR LIQUIDAÇÃO (EMPENHOS)'}</span>
                </button>

                <div className="relative group w-full sm:w-auto">
                    <button onClick={() => setIsJsonVisible(!isJsonVisible)} className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all uppercase tracking-widest">
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isJsonVisible ? 'rotate-180' : ''}`} />
                        Painel de Integração JSON
                    </button>

                    <div className={`absolute bottom-full right-0 mb-4 w-96 max-w-[90vw] transition-all duration-300 ${isJsonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                        <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-800">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata do Cálculo</span>
                                <button onClick={handleCopyJson} className="p-2 text-slate-400 hover:text-white transition-colors">
                                    {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <pre className="text-[11px] font-mono text-blue-300"><code>{jsonData}</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ResultsCard);
