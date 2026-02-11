
import React from 'react';

type AppMode = 'analysis' | 'manual';

interface ModeToggleProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => {
  const selectedClasses = "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow";
  const unselectedClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50";

  return (
    <div className="flex w-full p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
      <button
        onClick={() => onModeChange('analysis')}
        className={`w-1/2 p-2 rounded-lg font-semibold transition-all text-sm ${mode === 'analysis' ? selectedClasses : unselectedClasses}`}
      >
        Analisar Documento
      </button>
      <button
        onClick={() => onModeChange('manual')}
        className={`w-1/2 p-2 rounded-lg font-semibold transition-all text-sm ${mode === 'manual' ? selectedClasses : unselectedClasses}`}
      >
        Cálculo Manual
      </button>
    </div>
  );
};

export default ModeToggle;
