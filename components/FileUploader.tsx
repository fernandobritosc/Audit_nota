
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon, XIcon } from './icons.tsx';

interface FileUploaderProps {
  onFileChange: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileChange }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');

  const handleFile = useCallback((file: File) => {
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // For simplicity, we'll use a generic placeholder for PDF preview
        // A full PDF preview would require a library like pdf.js
        if (file.type === 'application/pdf') {
            setPreview('pdf');
        } else {
            setPreview(reader.result as string);
        }
        setFileName(file.name);
        onFileChange(file);
      };
      reader.readAsDataURL(file);
    } else {
      // Handle invalid file type
      alert('Por favor, selecione um arquivo de imagem (JPEG, PNG) ou PDF.');
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
    setFileName('');
    onFileChange(null);
  };

  if (preview) {
    return (
      <div className="relative p-4 border border-slate-300 rounded-lg">
        <div className="flex items-center space-x-4">
          {preview === 'pdf' ? (
             <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-lg font-bold text-lg">PDF</div>
          ) : (
            <img src={preview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{fileName}</p>
            <p className="text-xs text-slate-500">Pronto para análise</p>
          </div>
        </div>
        <button
          onClick={handleRemoveFile}
          className="absolute top-2 right-2 p-1 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"
        >
          <XIcon className="h-4 w-4 text-slate-600" />
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
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
      }`}
    >
      <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <UploadCloudIcon className="h-12 w-12 text-slate-400 mb-3" />
        <span className="font-semibold text-slate-700">Clique para fazer upload ou arraste e solte</span>
        <span className="text-sm text-slate-500 mt-1">PNG, JPG, ou PDF</span>
      </label>
    </div>
  );
};

export default FileUploader;