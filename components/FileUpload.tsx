
import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileLoaded: (fileContent: string, fileName: string) => void;
  acceptedFileTypes?: string; // e.g., ".csv,text/csv"
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, acceptedFileTypes = '.csv', label }) => {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileLoaded(content, file.name);
    };
    reader.onerror = () => {
      console.error('Error reading file.');
      setFileName(null);
    };
    reader.readAsText(file);
  }, [onFileLoaded]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept={acceptedFileTypes}
        className="hidden"
        onChange={handleInputChange}
      />
      <p className="text-gray-600 mb-2">
        {fileName ? `File selected: ${fileName}` : `Drag & drop your ${label} file here, or`}
      </p>
      <button
        onClick={triggerFileInput}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
      >
        Browse Files
      </button>
      {fileName && (
        <button
          onClick={() => {
            setFileName(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = ''; // Clear file input
            }
          }}
          className="ml-2 text-gray-500 hover:text-red-500 font-semibold py-2 px-4 rounded-md transition-colors duration-200"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default FileUpload;
    