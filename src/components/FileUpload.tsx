import { useRef, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';

interface FileItem {
  file: File;
  preview?: string;
}

interface Props {
  files: FileItem[];
  onChange: (files: FileItem[]) => void;
}

export default function FileUpload({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (newFiles: FileList | File[]) => {
    const items = Array.from(newFiles).map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    onChange([...files, ...items]);
  };

  const removeFile = (index: number) => {
    const item = files[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-indigo-50' : 'border-gray-200 hover:border-primary-light'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">点击或拖拽上传 PDF / 截图</p>
        <p className="text-xs text-gray-400 mt-1">支持 PDF, PNG, JPG, HEIC</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              {item.preview ? (
                <img src={item.preview} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center">
                  {item.file.type === 'application/pdf' ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : (
                    <Image className="w-5 h-5 text-blue-400" />
                  )}
                </div>
              )}
              <span className="flex-1 text-sm text-gray-600 truncate">{item.file.name}</span>
              <button onClick={() => removeFile(i)} className="p-1 text-gray-400 hover:text-danger">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
