'use client';

import { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

const defaultSettings: Setting[] = [
  { key: 'site_name', value: 'YoursTruly', description: 'Site display name', type: 'string' },
  { key: 'support_email', value: 'support@yourstruly.love', description: 'Support email address', type: 'string' },
  { key: 'max_upload_size_mb', value: '50', description: 'Maximum file upload size in MB', type: 'number' },
  { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', type: 'boolean' },
  { key: 'ai_enabled', value: 'true', description: 'Enable AI features', type: 'boolean' },
];

export default function SystemSettings() {
  const [settings, setSettings] = useState<Setting[]>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#2a1f1a]">System Settings</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#2D5A3D]/90 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="p-4 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#2a1f1a]">
                  {setting.key}
                </label>
                <p className="text-xs text-[#2a1f1a]/60 mt-1">{setting.description}</p>
              </div>
              <div className="w-64">
                {setting.type === 'boolean' ? (
                  <select
                    value={setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#B8562E]/10 rounded-lg text-sm"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <input
                    type={setting.type === 'number' ? 'number' : 'text'}
                    value={setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#B8562E]/10 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
