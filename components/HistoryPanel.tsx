
import React, { memo } from 'react';
import { type CalculatedData } from '../types.ts';
import { HistoryIcon, TrashIcon } from './icons.tsx';

interface HistoryPanelProps {
  history: CalculatedData[];
  onRestore: (id: number) => void;
  onClear: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore, onClear }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 no-print">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/80 w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <HistoryIcon className="h-6 w-6 text-slate-500" />
            <h2 className="text-xl font-semibold text-slate-800">Histórico da Sessão</h2>
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 font-semibold py-1 px-2 rounded-md transition-colors"
            title="Limpar histórico da sessão"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Limpar
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onRestore(item.id!)}
              className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 truncate" title={item.razaoSocial}>
                    {item.razaoSocial}
                  </p>
                  <p className="text-xs text-slate-500">
                    NF: {item.numeroNF}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                   <p className="font-bold text-slate-800">{formatCurrency(item.valorBruto)}</p>
                   <p className="text-xs text-slate-500">
                     {new Date(item.id!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(HistoryPanel);