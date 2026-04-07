import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import dayjs from 'dayjs';
import FileUpload from '../components/FileUpload';
import { addMessage, uploadFile, addEvent } from '../api/sheets';
import { EVENT_CATEGORIES } from '../types';
import type { NewEvent } from '../types';

interface FileItem {
  file: File;
  preview?: string;
}

interface EventDraft {
  title: string;
  eventDate: string;
  eventTime: string;
  category: string;
  location: string;
  description: string;
  selected: boolean;
}

const emptyEvent = (): EventDraft => ({
  title: '',
  eventDate: '',
  eventTime: '',
  category: '学校活动',
  location: '',
  description: '',
  selected: true,
});

export default function AddMessage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('ParentGate');
  const [receivedAt, setReceivedAt] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const addEventDraft = () => setEvents([...events, emptyEvent()]);

  const updateEventDraft = (index: number, field: keyof EventDraft, value: string) => {
    setEvents(events.map((e, i) => {
      if (i !== index) return e;
      if (field === 'selected') return { ...e, selected: value === 'true' };
      return { ...e, [field]: value };
    }));
  };

  const removeEventDraft = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入消息标题');
      return;
    }
    setSaving(true);
    try {
      const fileUrls: string[] = [];
      const fileNames: string[] = [];
      for (const item of files) {
        const base64 = await fileToBase64(item.file);
        const result = await uploadFile(base64, item.file.name, item.file.type);
        fileUrls.push(result.fileUrl);
        fileNames.push(item.file.name);
      }

      const msgResult = await addMessage({
        title: title.trim(),
        source,
        receivedAt,
        notes,
        fileUrls: fileUrls.join(','),
        fileNames: fileNames.join(','),
      });

      for (const draft of events) {
        if (draft.selected && draft.title.trim() && draft.eventDate) {
          const newEvent: NewEvent = {
            messageId: msgResult.id,
            title: draft.title.trim(),
            description: draft.description,
            eventDate: draft.eventDate,
            eventTime: draft.eventTime,
            endDate: '',
            endTime: '',
            location: draft.location,
            category: draft.category,
          };
          await addEvent(newEvent);
        }
      }

      toast.success('保存成功');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-800 mb-4">添加消息</h1>

      {/* 附件上传 */}
      <section className="mb-5">
        <label className="block text-sm font-medium text-gray-600 mb-2">附件</label>
        <FileUpload files={files} onChange={setFiles} />
      </section>

      {/* 消息信息 */}
      <section className="space-y-3 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">标题 *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="如：Term 2 Newsletter"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">来源</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="ParentGate"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">收到日期</label>
            <input
              type="date"
              value={receivedAt}
              onChange={e => setReceivedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">备注</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="可选备注..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </section>

      {/* 活动 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-600">
            关联活动
            {events.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-primary bg-indigo-50 px-1.5 py-0.5 rounded-full">
                {events.filter(e => e.selected).length}/{events.length}
              </span>
            )}
          </label>
          <button
            onClick={addEventDraft}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark"
          >
            <Plus className="w-3.5 h-3.5" />
            添加活动
          </button>
        </div>

        {events.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            点击「添加活动」手动填写，或把文件发给 Claude 让 Claude 帮你提取
          </p>
        )}

        <div className="space-y-3">
          {events.map((draft, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 space-y-2 border-2 transition-colors ${
                draft.selected
                  ? 'bg-white border-primary/30'
                  : 'bg-gray-50 border-transparent opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateEventDraft(i, 'selected', String(!draft.selected))}
                  className="shrink-0"
                >
                  {draft.selected
                    ? <CheckCircle2 className="w-5 h-5 text-primary" />
                    : <Circle className="w-5 h-5 text-gray-300" />
                  }
                </button>
                <span className="flex-1 text-xs font-medium text-gray-400">活动 {i + 1}</span>
                <button onClick={() => removeEventDraft(i)} className="text-gray-300 hover:text-danger">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={draft.title}
                onChange={e => updateEventDraft(i, 'title', e.target.value)}
                placeholder="活动名称 *"
                disabled={!draft.selected}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={draft.eventDate}
                  onChange={e => updateEventDraft(i, 'eventDate', e.target.value)}
                  disabled={!draft.selected}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                />
                <input
                  type="time"
                  value={draft.eventTime}
                  onChange={e => updateEventDraft(i, 'eventTime', e.target.value)}
                  disabled={!draft.selected}
                  className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.location}
                  onChange={e => updateEventDraft(i, 'location', e.target.value)}
                  placeholder="地点（可选）"
                  disabled={!draft.selected}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                />
                <select
                  value={draft.category}
                  onChange={e => updateEventDraft(i, 'category', e.target.value)}
                  disabled={!draft.selected}
                  className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {EVENT_CATEGORIES.map(c => (
                    <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={draft.description}
                onChange={e => updateEventDraft(i, 'description', e.target.value)}
                placeholder="描述（可选）"
                disabled={!draft.selected}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存消息'}
      </button>
    </div>
  );
}
