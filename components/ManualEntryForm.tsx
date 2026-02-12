
import React, { useState, FormEvent, useCallback } from 'react';
import { type ExtractedData } from '../types.ts';
import { irrfRates } from '../config/taxConfig.ts';
import { InfoIcon, CalculatorIcon } from './icons.tsx';

interface ManualEntryFormProps {
    onSubmit: (data: ExtractedData) => void;
}

type FormData = {
    valorBruto: string;
    optanteSimples: 'SIM' | 'NÃO';
    isMei: 'SIM' | 'NÃO';
    aliquotaIR: string;
    aliquotaISS: string;
    municipioIncidencia: string;
    baseCalculoINSS: string;
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
        <div className="h-3 w-1 bg-[#003366] dark:bg-blue-500 rounded-full"></div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</h4>
    </div>
);

const InputField: React.FC<{ label: string; id: keyof FormData; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; type?: string; placeholder?: string, inputMode?: 'decimal' | 'text', helpText?: string }> =
    ({ label, id, value, onChange, type = "text", placeholder, inputMode = 'text', helpText }) => (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                {label}
            </label>
            <div className="relative group">
                <input
                    type={type}
                    id={id}
                    name={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    inputMode={inputMode}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#003366] dark:focus:border-blue-500 outline-none transition-all"
                    required={id === 'valorBruto'}
                />
            </div>
            {helpText && (
                <div className="flex items-center gap-1.5 ml-1 mt-0.5">
                    <InfoIcon className="h-3 w-3 text-slate-400" />
                    <p className="text-[10px] text-slate-400 italic">{helpText}</p>
                </div>
            )}
        </div>
    );

const RadioGroup: React.FC<{ label: string; id: 'optanteSimples' | 'isMei'; value: 'SIM' | 'NÃO'; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> =
    ({ label, id, value, onChange }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">{label}</label>
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <label className={`flex-1 text-center text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all ${value === 'SIM' ? 'bg-white dark:bg-slate-700 text-[#003366] dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <input type="radio" name={id} value="SIM" checked={value === 'SIM'} onChange={onChange} className="sr-only" />
                    SIM
                </label>
                <label className={`flex-1 text-center text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all ${value === 'NÃO' ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <input type="radio" name={id} value="NÃO" checked={value === 'NÃO'} onChange={onChange} className="sr-only" />
                    NÃO
                </label>
            </div>
        </div>
    );

const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<FormData>({
        valorBruto: '',
        optanteSimples: 'NÃO',
        isMei: 'NÃO',
        aliquotaIR: '0',
        aliquotaISS: '5',
        municipioIncidencia: 'Senador Canedo',
        baseCalculoINSS: '',
    });

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const baseINSS = parseFloat(formData.baseCalculoINSS.replace(',', '.')) || 0;
        const aliquotaINSSValue = baseINSS > 0 ? 11 : 0;
        const valorINSSValue = baseINSS * (aliquotaINSSValue / 100);

        const extractedData: ExtractedData = {
            razaoSocial: 'Lançamento Manual',
            cnpj: '00.000.000/0000-00',
            numeroNF: 'MANUAL-' + Date.now().toString().slice(-6),
            valorBruto: parseFloat(formData.valorBruto.replace(',', '.')) || 0,
            optanteSimples: formData.optanteSimples,
            isMei: formData.isMei,
            aliquotaIR: formData.optanteSimples === 'SIM' || formData.isMei === 'SIM' ? 0 : parseFloat(formData.aliquotaIR.replace(',', '.')) || 0,
            aliquotaISS: parseFloat(formData.aliquotaISS.replace(',', '.')) || 0,
            localServico: 'N/A',
            municipioIncidencia: formData.municipioIncidencia,
            valorINSS: valorINSSValue,
            baseCalculoINSS: baseINSS,
            aliquotaINSS: aliquotaINSSValue,
        };
        onSubmit(extractedData);
    };

    const isSimplesOrMei = formData.optanteSimples === 'SIM' || formData.isMei === 'SIM';

    return (
        <form onSubmit={handleSubmit} className="animate-in fade-in duration-500">
            <SectionTitle title="Valores e Enquadramento" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12">
                    <InputField
                        label="Valor Bruto do Documento (R$)"
                        id="valorBruto"
                        value={formData.valorBruto}
                        onChange={handleChange}
                        placeholder="0,00"
                        inputMode="decimal"
                        type="text"
                    />
                </div>
                <div className="md:col-span-6">
                    <RadioGroup label="Simples Nacional" id="optanteSimples" value={formData.optanteSimples} onChange={handleChange} />
                </div>
                <div className="md:col-span-6">
                    <RadioGroup label="MEI - Microempreendedor" id="isMei" value={formData.isMei} onChange={handleChange} />
                </div>
            </div>

            <SectionTitle title="Alíquotas e Incidência" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="aliquotaIR" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                        Alíquota I.R. (%)
                    </label>
                    <select
                        id="aliquotaIR"
                        name="aliquotaIR"
                        value={formData.aliquotaIR}
                        onChange={handleChange}
                        disabled={isSimplesOrMei}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#003366] dark:focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 cursor-pointer"
                    >
                        <option value="0">DISPENSADO / SIMPLES</option>
                        {irrfRates.map(rate => (
                            <option key={rate.value} value={rate.value}>{rate.label}</option>
                        ))}
                    </select>
                </div>
                <InputField
                    label="Alíquota ISS (%)"
                    id="aliquotaISS"
                    value={formData.aliquotaISS}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="5,00"
                />
                <div className="md:col-span-2">
                    <InputField
                        label="Município de Incidência"
                        id="municipioIncidencia"
                        value={formData.municipioIncidencia}
                        onChange={handleChange}
                        placeholder="Ex: Senador Canedo"
                    />
                </div>
            </div>

            <SectionTitle title="Previdência Social" />
            <InputField
                label="Base de Cálculo INSS (R$)"
                id="baseCalculoINSS"
                value={formData.baseCalculoINSS}
                onChange={handleChange}
                placeholder="Opcional"
                inputMode="decimal"
                helpText="Será aplicado retenção de 11% sobre o valor informado."
            />

            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                    type="submit"
                    className="w-full bg-[#003366] dark:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10 active:scale-[0.98]"
                >
                    <CalculatorIcon className="h-5 w-5" />
                    EXECUTAR CÁLCULO DE AUDITORIA
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-[0.15em] font-medium">As alíquotas seguem a legislação tributária vigente</p>
            </div>
        </form>
    );
};

export default ManualEntryForm;
