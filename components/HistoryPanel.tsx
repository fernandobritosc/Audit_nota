
import React, { memo } from 'react';
import { type CalculatedData } from '../types.ts';
import { formatCurrency } from '../config/utilis/formatters.ts';
import { HistoryIcon, TrashIcon, CheckIcon } from './icons.tsx';

interface HistoryPanelProps {
  history: CalculatedData[];
  onRestore: (id: number) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore, onClear }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 no-print">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg">
              <HistoryIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Registros de Auditoria Recentes</h2>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors"
              title="Limpar histórico da sessão"
            >
              <TrashIcon className="h-3 w-3" />
              Limpar Cache
            </button>
          )}
        </div>

        <div className="p-6">
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 italic">Nenhum registro encontrado nesta sessão.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onRestore(item.id!)}
                  className="group text-left p-4 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:shadow-md hover:border-[#003366] dark:hover:border-blue-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckIcon className="h-3 w-3 text-[#003366] dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col h-full justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight" title={item.razaoSocial}>
                        {item.razaoSocial}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        DOC: {item.numeroNF}
                      </p>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(item.id!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm font-bold text-[#003366] dark:text-blue-400 font-mono">
                        {formatCurrency(item.valorBruto)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(HistoryPanel);
