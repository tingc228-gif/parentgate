import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Image, ExternalLink, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { getMessage, deleteMessage, uploadFile, updateMessage } from '../api/sheets';
import { formatDateCN } from '../utils/date';
import EventCard from '../components/EventCard';
import type { Message, SchoolEvent } from '../types';

export default function MessageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMessage(Number(id))
      .then(data => {
        setMessage(data.message);
        setEvents(data.events);
      })
      .catch(() => toast.error('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!message || !e.target.files?.length) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      const newNames: string[] = [];
      for (const file of Array.from(e.target.files)) {
        const base64 = await fileToBase64(file);
        const result = await uploadFile(base64, file.name, file.type);
        newUrls.push(result.fileUrl);
        newNames.push(file.name);
      }

      const existingUrls = message.fileUrls ? message.fileUrls.split(',').filter(Boolean) : [];
      const existingNames = message.fileNames ? message.fileNames.split(',').filter(Boolean) : [];
      const mergedUrls = [...existingUrls, ...newUrls].join(',');
      const mergedNames = [...existingNames, ...newNames].join(',');

      const updated: Message = { ...message, fileUrls: mergedUrls, fileNames: mergedNames };
      await updateMessage(updated);
      setMessage(updated);
      toast.success(`已添加 ${newUrls.length} 个附件`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!message || !confirm('确定删除这条消息？附件也会被删除。')) return;
    try {
      await deleteMessage(message.id);
      toast.success('已删除');
      navigate('/messages');
    } catch {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-400 py-12">加载中...</div>;
  }

  if (!message) {
    return <div className="p-4 text-center text-sm text-gray-400 py-12">消息不存在</div>;
  }

  const fileUrls = message.fileUrls ? message.fileUrls.split(',') : [];
  const fileNames = message.fileNames ? message.fileNames.split(',') : [];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 truncate">{message.title}</h1>
        <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-danger">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
        <span>{formatDateCN(message.receivedAt)}</span>
        {message.source && <span>· {message.source}</span>}
      </div>

      {/* Notes */}
      {message.notes && (
        <div className="bg-amber-50 rounded-xl p-3 mb-4">
          <p className="text-sm text-gray-600">{message.notes}</p>
        </div>
      )}

      {/* Attachments */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-600">附件</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Paperclip className="w-3.5 h-3.5" />
            }
            {uploading ? '上传中...' : '添加附件'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleUploadMore}
          />
        </div>
        {fileUrls.length > 0 ? (
          <div className="space-y-2">
            {fileUrls.map((url, i) => {
              const name = fileNames[i]?.trim() ?? `文件 ${i + 1}`;
              const isPdf = /\.pdf$/i.test(name);
              return (
                <a
                  key={i}
                  href={url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  {isPdf ? (
                    <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  ) : (
                    <Image className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-gray-600 truncate">{name}</span>
                  <ExternalLink className="w-4 h-4 text-gray-300 shrink-0" />
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">暂无附件，点击「添加附件」上传</p>
        )}
      </section>

      {/* Linked Events */}
      {events.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-600 mb-2">关联活动</h2>
          <div className="space-y-2">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
