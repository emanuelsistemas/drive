import React from 'react';
import { X } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  progress: number;
  fileName: string;
  onCancel: () => void;
  remainingTime?: string;
  speed?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  progress,
  fileName,
  onCancel,
  remainingTime,
  speed
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full max-w-md p-4 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Enviando arquivos</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300 truncate mb-2">{fileName}</p>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>{progress}% concluído</span>
          <div className="space-x-4">
            {speed && <span>{speed}/s</span>}
            {remainingTime && <span>Tempo restante: {remainingTime}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;