
import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface ApiKeyModalProps {
  onKeySubmit: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySubmit }) => {
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

export default ApiKeyModal;
