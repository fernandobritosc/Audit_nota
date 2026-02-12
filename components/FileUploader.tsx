
import React, { useState, useCallback, memo } from 'react';
import { UploadCloudIcon, XIcon, InfoIcon } from './icons.tsx';

interface FileUploaderProps {
  onFileChange: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileChange }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileCount, setFileCount] = useState<number>(0);
  const [fileNames, setFileNames] = useState<string>('');

  const handleFiles = useCallback((files: FileList) => {
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        validFiles.push(file);
      } else {
        alert(`Arquivo inválido ignorado: ${file.name}. Por favor, selecione apenas imagens ou PDFs.`);
      }
    }

    if (validFiles.length > 0) {
      setFileCount(validFiles.length);
      setFileNames(validFiles.map(f => f.name).join(', '));
      onFileChange(validFiles);
    }
  }, [onFileChange]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemoveFiles = () => {
    setFileCount(0);
    setFileNames('');
    onFileChange([]);
  };

  if (fileCount > 0) {
    return (
      <div className="relative p-6 border border-blue-200 dark:border-blue-900/40 rounded-xl bg-blue-50/30 dark:bg-slate-900/30 institutional-shadow animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#003366] text-white flex items-center justify-center rounded-xl shadow-lg flex-col shrink-0">
            <span className="text-xl font-bold">{fileCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{fileCount > 1 ? 'Docs' : 'Doc'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-8">
              {fileCount > 1 ? `${fileCount} documentos selecionados` : fileNames}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              <p className="text-[11px] font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider">Aguardando Processamento</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRemoveFiles}
          className="absolute top-4 right-4 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:text-red-500 transition-all shadow-sm group"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className="group relative"
    >
      <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" multiple />
      <label htmlFor="file-upload" className={`
        flex flex-col items-center justify-center py-12 px-6
        border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
        ${isDragging
          ? 'border-[#003366] bg-blue-50/50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-[#003366] dark:hover:border-blue-500 bg-white dark:bg-slate-800/50'}
      `}>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
          <UploadCloudIcon className="h-10 w-10 text-[#003366] dark:text-blue-400" />
        </div>
        <span className="text-base font-bold text-slate-900 dark:text-white">Carregar Documentos para Auditoria</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs text-center leading-relaxed">
          Arraste os arquivos aqui ou clique para buscar.<br />
          Suportamos Notas Fiscais em <strong className="text-slate-700 dark:text-slate-300">PDF, JPG ou PNG</strong>.
        </span>

        <div className="mt-8 flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-full">
          <InfoIcon className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Processamento via Inteligência Artificial</span>
        </div>
      </label>
    </div>
  );
};

export default memo(FileUploader);
