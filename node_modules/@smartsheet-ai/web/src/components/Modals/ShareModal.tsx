import { useState, useEffect } from 'react';

export const ShareModal = ({ workspaceId, workbookId, onClose }: { workspaceId: string, workbookId: string, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'VIEWER'|'EDITOR'|'ADMIN'>('VIEWER');
  const [members, setMembers] = useState<{userId: string, user: {name: string, email: string}, role: string}[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
        const res = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const json = await res.json();
        if (json.success) setMembers(json.data);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async () => {
    if (!email) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ email, role })
      });
      setEmail('');
      
      // Refresh members
      const res = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch (e) {
      console.error(e);
      alert('Failed to invite member. Check if you are an ADMIN.');
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/workbook/${workbookId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-textMain tracking-wide">Share Workbook</h2>
          <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <input 
            type="email" 
            placeholder="Invite via email..." 
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value as 'VIEWER'|'EDITOR'|'ADMIN')}
            className="bg-surfaceHover border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none cursor-pointer focus:border-accent"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button onClick={handleInvite} className="bg-accent hover:bg-accentHover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-accent/20">
            Invite
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-textMuted mb-3 uppercase tracking-wider">Members</h3>
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.userId} className="flex justify-between items-center text-sm p-3 bg-background rounded-lg border border-border/50">
                <span className="font-medium text-textMain">{m.user.name} <span className="text-textMuted font-normal">({m.user.email})</span></span>
                <span className="text-xs bg-surfaceHover px-2 py-1 rounded text-textMuted border border-border">{m.role}</span>
              </li>
            ))}
            {members.length === 0 && (
              <div className="text-sm text-textMuted italic p-3 text-center border border-dashed border-border rounded-lg">No members found.</div>
            )}
          </ul>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-xs text-textMuted">Anyone with the link needs access.</span>
          <button onClick={copyLink} className="border border-border bg-surfaceHover hover:bg-border text-textMain px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};
