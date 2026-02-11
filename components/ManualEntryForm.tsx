
import React, { useState, FormEvent, useCallback } from 'react';
import { type ExtractedData } from '../types';
import { irrfRates } from '../config';

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
    valorINSS: string;
};

const InputField: React.FC<{ label: string; id: keyof FormData; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; type?: string; placeholder?: string, inputMode?: 'decimal' | 'text' }> = 
    ({ label, id, value, onChange, type = "text", placeholder, inputMode = 'text' }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inputMode={inputMode}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700"
            required={id === 'valorBruto'}
        />
    </div>
);

const RadioGroup: React.FC<{ label: string; id: 'optanteSimples' | 'isMei'; value: 'SIM' | 'NÃO'; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> =
    ({ label, id, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <label className={`flex-1 text-center text-sm p-1.5 rounded-md cursor-pointer transition-colors ${value === 'SIM' ? 'bg-white dark:bg-slate-700 shadow font-semibold' : ''}`}>
                <input type="radio" name={id} value="SIM" checked={value === 'SIM'} onChange={onChange} className="sr-only" />
                Sim
            </label>
            <label className={`flex-1 text-center text-sm p-1.5 rounded-md cursor-pointer transition-colors ${value === 'NÃO' ? 'bg-white dark:bg-slate-700 shadow font-semibold' : ''}`}>
                <input type="radio" name={id} value="NÃO" checked={value === 'NÃO'} onChange={onChange} className="sr-only" />
                Não
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
        valorINSS: '',
    });

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const extractedData: ExtractedData = {
            razaoSocial: 'Cálculo Manual',
            cnpj: 'N/A',
            numeroNF: 'N/A',
            valorBruto: parseFloat(formData.valorBruto.replace(',', '.')) || 0,
            optanteSimples: formData.optanteSimples,
            isMei: formData.isMei,
            aliquotaIR: formData.optanteSimples === 'SIM' || formData.isMei === 'SIM' ? 0 : parseFloat(formData.aliquotaIR.replace(',', '.')) || 0,
            aliquotaISS: parseFloat(formData.aliquotaISS.replace(',', '.')) || 0,
            localServico: 'N/A',
            municipioIncidencia: formData.municipioIncidencia,
            valorINSS: parseFloat(formData.valorINSS.replace(',', '.')) || 0,
        };
        onSubmit(extractedData);
    };

    const isSimplesOrMei = formData.optanteSimples === 'SIM' || formData.isMei === 'SIM';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField 
                label="Valor Bruto (R$)" 
                id="valorBruto" 
                value={formData.valorBruto} 
                onChange={handleChange}
                placeholder="Ex: 1500,00"
                inputMode="decimal"
                type="text"
            />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RadioGroup label="Optante pelo Simples?" id="optanteSimples" value={formData.optanteSimples} onChange={handleChange} />
                <RadioGroup label="É MEI?" id="isMei" value={formData.isMei} onChange={handleChange} />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label htmlFor="aliquotaIR" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Alíquota I.R. (%)
                    </label>
                    <select
                        id="aliquotaIR"
                        name="aliquotaIR"
                        value={formData.aliquotaIR}
                        onChange={handleChange}
                        disabled={isSimplesOrMei}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                    >
                         <option value="0">0,00% (Isento/Simples)</option>
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
                    placeholder="Ex: 5,00"
                />
            </div>

            <InputField 
                label="Valor INSS (R$)" 
                id="valorINSS" 
                value={formData.valorINSS} 
                onChange={handleChange}
                placeholder="Deixe em branco se não houver"
                inputMode="decimal"
            />

            <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
            >
                Calcular Retenções
            </button>
        </form>
    );
};

export default ManualEntryForm;