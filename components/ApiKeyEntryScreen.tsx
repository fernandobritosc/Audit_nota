
import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface ApiKeyEntryScreenProps {
    onKeySubmit: (key: string) => void;
    initialError?: string | null;
}

const ApiKeyEntryScreen: React.FC<ApiKeyEntryScreenProps> = ({ onKeySubmit, initialError }) => {
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(initialError || null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) {
            setError('Por favor, insira uma chave de API.');
            return;
        }
        setError(null);
        onKeySubmit(key.trim());
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-md mx-auto text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700">
                <form onSubmit={handleSubmit}>
                    <KeyIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Chave da API do Gemini</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        Para continuar, insira sua chave da API do Google Gemini. Sua chave será salva localmente no seu navegador.
                    </p>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-center bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Cole sua chave de API aqui"
                        aria-label="API Key Input"
                    />
                    {error && (
                        <p className="text-red-500 text-sm mt-3">{error}</p>
                    )}
                    <button
                        type="submit"
                        className="w-full mt-4 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Salvar e Continuar
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                        Não tem uma chave? Obtenha uma no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">Google AI Studio</a>.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ApiKeyEntryScreen;
