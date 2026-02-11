
import React from 'react';

interface ResultsCardSkeletonProps {
  batchProgress?: { current: number; total: number };
}

const SkeletonRow: React.FC<{ labelWidth?: string; valueWidth?: string }> = ({ labelWidth = 'w-24', valueWidth = 'w-36' }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 min-h-[40px]">
        <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded ${labelWidth}`}></div>
        <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded ${valueWidth}`}></div>
    </div>
);

const SkeletonBlock: React.FC<{ children: React.ReactNode; titleWidth?: string }> = ({ children, titleWidth = 'w-48' }) => (
    <div>
        <div className={`h-5 bg-slate-200 dark:bg-slate-700 rounded-md mb-3 ${titleWidth}`}></div>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

const ResultsCardSkeleton: React.FC<ResultsCardSkeletonProps> = ({ batchProgress }) => {
  const isBatch = batchProgress && batchProgress.total > 1;
  const progressPercentage = isBatch ? (batchProgress.current / batchProgress.total) * 100 : 0;

  return (
    <div className="animate-pulse">
      <div className="bg-white dark:bg-slate-800 rounded-xl">
        <div className="px-6 pt-4 pb-6">
            <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-md w-3/5 mx-auto mb-4"></div>
            
            <div className="space-y-6 mt-8">
                <SkeletonBlock titleWidth="w-48">
                    <SkeletonRow labelWidth="w-20" valueWidth="w-4/5" />
                    <SkeletonRow labelWidth="w-16" valueWidth="w-2/5" />
                </SkeletonBlock>

                <SkeletonBlock titleWidth="w-64">
                    <SkeletonRow labelWidth="w-36" valueWidth="w-12" />
                </SkeletonBlock>
                
                 <SkeletonBlock titleWidth="w-56">
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center py-1.5">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-200 dark:border-slate-700">
                            <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-48"></div>
                            <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-40"></div>
                        </div>
                    </div>
                </SkeletonBlock>
            </div>
        </div>
        <div className="bg-slate-50/70 dark:bg-slate-900/30 p-4 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
             <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      </div>
      
      <div className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm font-medium">
        {isBatch ? (
          <>
            <p>Analisando documento {batchProgress.current} de {batchProgress.total}...</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-2">
                <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{width: `${progressPercentage}%`}}>
                </div>
            </div>
          </>
        ) : (
          <p>Analisando documento... A IA está extraindo os dados e fazendo os cálculos.</p>
        )}
      </div>

    </div>
  );
};

export default ResultsCardSkeleton;
