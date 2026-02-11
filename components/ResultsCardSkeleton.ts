
import React from 'react';

const SkeletonRow: React.FC<{ labelWidth?: string; valueWidth?: string }> = ({ labelWidth = 'w-24', valueWidth = 'w-36' }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 min-h-[40px]">
        <div className={`h-4 bg-slate-200 rounded ${labelWidth}`}></div>
        <div className={`h-4 bg-slate-200 rounded ${valueWidth}`}></div>
    </div>
);

const SkeletonBlock: React.FC<{ children: React.ReactNode; titleWidth?: string }> = ({ children, titleWidth = 'w-48' }) => (
    <div>
        <div className={`h-5 bg-slate-200 rounded-md mb-3 ${titleWidth}`}></div>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

const ResultsCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-xl">
        <div className="px-6 pt-4 pb-6">
            <div className="h-7 bg-slate-200 rounded-md w-3/5 mx-auto mb-4"></div>
            
            <div className="space-y-6 mt-8">
                <SkeletonBlock titleWidth="w-48">
                    <SkeletonRow labelWidth="w-20" valueWidth="w-4/5" />
                    <SkeletonRow labelWidth="w-16" valueWidth="w-2/5" />
                    <SkeletonRow labelWidth="w-24" valueWidth="w-16" />
                    <SkeletonRow labelWidth="w-32" valueWidth="w-24" />
                    <SkeletonRow labelWidth="w-28" valueWidth="w-32" />
                    <SkeletonRow labelWidth="w-40" valueWidth="w-32" />
                </SkeletonBlock>

                <SkeletonBlock titleWidth="w-64">
                    <SkeletonRow labelWidth="w-36" valueWidth="w-12" />
                    <SkeletonRow labelWidth="w-16" valueWidth="w-12" />
                </SkeletonBlock>
                
                <SkeletonBlock titleWidth="w-40">
                    <SkeletonRow labelWidth="w-28" valueWidth="w-56" />
                    <SkeletonRow labelWidth="w-24" valueWidth="w-56" />
                </SkeletonBlock>

                <SkeletonBlock titleWidth="w-56">
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center py-1.5">
                            <div className="h-5 bg-slate-200 rounded w-28"></div>
                            <div className="h-5 bg-slate-200 rounded w-36"></div>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                            <div className="h-5 bg-slate-200 rounded w-40"></div>
                            <div className="h-5 bg-slate-200 rounded w-28"></div>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                            <div className="h-5 bg-slate-200 rounded w-40"></div>
                            <div className="h-5 bg-slate-200 rounded w-28"></div>
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-200">
                            <div className="h-6 bg-slate-300 rounded w-48"></div>
                            <div className="h-6 bg-slate-300 rounded w-40"></div>
                        </div>
                    </div>
                </SkeletonBlock>
            </div>
        </div>
        <div className="bg-slate-50/70 p-4 rounded-b-xl border-t border-slate-200">
             <div className="h-5 w-40 bg-slate-200 rounded-md mb-3"></div>
            <div className="relative bg-slate-200/50 rounded-lg p-4 h-32">
            </div>
        </div>
      </div>
      <p className="text-center text-slate-500 mt-4 text-sm font-medium">
        Analisando documento... A IA está extraindo os dados e fazendo os cálculos.
      </p>
    </div>
  );
};

export default ResultsCardSkeleton;
