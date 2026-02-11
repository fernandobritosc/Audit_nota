
import React, { useState, useCallback, memo } from 'react';
import { UploadCloudIcon, XIcon } from './icons';

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
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
      <div className="relative p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/30">
        <div className="flex items-center space-x-4">
           <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center rounded-lg font-bold text-2xl flex-col">
                <span>{fileCount}</span>
                <span className="text-xs font-normal">{fileCount > 1 ? 'arquivos' : 'arquivo'}</span>
            </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={fileNames}>
                {fileCount > 1 ? `${fileCount} arquivos selecionados` : fileNames}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pronto para análise</p>
          </div>
        </div>
        <button
          onClick={handleRemoveFiles}
          className="absolute top-2 right-2 p-1 bg-slate-200 dark:bg-slate-600 rounded-full hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
        >
          <XIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
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
      className={`relative rounded-xl text-center cursor-pointer transition-colors ${
        isDragging ? 'bg-slate-700/30' : 'bg-transparent'
      }`}
    >
      <div className="border-2 border-dashed border-slate-300/80 dark:border-slate-600/50 rounded-lg py-10 px-6">
        <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" multiple />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
          <UploadCloudIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Clique para fazer upload ou arraste e solte</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">PNG, JPG, ou PDF (múltiplos arquivos são aceitos)</span>
        </label>
      </div>
    </div>
  );
};

export default memo(FileUploader);
