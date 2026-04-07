import { useNavigate } from 'react-router-dom';
import { FileText, Image, ChevronRight } from 'lucide-react';
import type { Message } from '../types';
import { formatDateCN } from '../utils/date';

interface Props {
  message: Message;
}

export default function MessageCard({ message }: Props) {
  const navigate = useNavigate();
  const fileNames = message.fileNames ? message.fileNames.split(',') : [];
  const hasFiles = fileNames.length > 0;

  const imageCount = fileNames.filter(f => /\.(png|jpg|jpeg|heic|webp)$/i.test(f.trim())).length;
  const pdfCount = fileNames.filter(f => /\.pdf$/i.test(f.trim())).length;

  return (
    <button
      onClick={() => navigate(`/messages/${message.id}`)}
      className="w-full bg-white rounded-xl shadow-sm p-3 text-left flex items-center gap-3 active:bg-gray-50 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        {pdfCount > 0 ? (
          <FileText className="w-5 h-5 text-primary" />
        ) : imageCount > 0 ? (
          <Image className="w-5 h-5 text-primary" />
        ) : (
          <FileText className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-gray-800 truncate">{message.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          <span>{formatDateCN(message.receivedAt)}</span>
          {message.source && <span>· {message.source}</span>}
          {hasFiles && <span>· {fileNames.length} 个附件</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  );
}
