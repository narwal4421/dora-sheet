import { useState } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { Save, Clock, Check, RefreshCw } from 'lucide-react';

export const VersionHistory = ({ workbookId, onClose }: { workbookId: string, onClose: () => void }) => {
  const { snapshots, saveSnapshot, restoreSnapshot } = useSheetStore();
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!newLabel.trim()) return;
    setIsSaving(true);
    setTimeout(() => {
      saveSnapshot(newLabel.trim());
      setNewLabel('');
      setIsSaving(false);
    }, 400); // Simulate network delay for UX
  };

  const handleRestore = (id: string, label: string) => {
    if (window.confirm(`Are you sure you want to restore to "${label}"?\n\nYou can always undo this action.`)) {
      restoreSnapshot(id);
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-surfaceHover/30">
        <div className="flex items-center gap-2 text-textMain">
          <Clock size={18} className="text-accent" />
          <h2 className="text-lg font-semibold tracking-wide">Version History</h2>
        </div>
        <button 
          onClick={onClose} 
          className="text-textMuted hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="p-6 border-b border-white/5 bg-background/50">
        <label className="block text-xs font-medium text-textMuted uppercase tracking-wider mb-2">Save Current State</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Before massive data import..."
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
          <button
            onClick={handleSave}
            disabled={!newLabel.trim() || isSaving}
            className="flex items-center gap-2 bg-accent hover:bg-accentHover text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-surface/50">
        <h3 className="text-xs font-medium text-textMuted uppercase tracking-wider mb-4">Saved Snapshots</h3>
        {snapshots.length === 0 ? (
          <p className="text-sm text-textMuted text-center py-8">No snapshots saved yet.</p>
        ) : (
          snapshots.map((s, idx) => (
            <div key={s.id} className="group border border-white/5 rounded-xl p-4 bg-background/80 hover:bg-surfaceHover/50 transition-colors flex flex-col gap-3 relative overflow-hidden">
              {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>}
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-textMain flex items-center gap-2">
                    {s.label}
                    {idx === 0 && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>}
                  </div>
                  <div className="text-xs text-textMuted mt-1 flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleRestore(s.id, s.label)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-accent hover:text-white text-textMain py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  <RefreshCw size={14} />
                  Restore this version
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
