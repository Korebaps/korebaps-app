import { useState } from 'react';

const initialState = {
  outsRecorded: 0,
  pitchCount: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  strikeouts: 0,
  walks: 0,
  hitByPitch: 0,
  wins: 0,
  losses: 0,
  saveEarned: 0,
  isMVP: false,
};

export function PitchingRecordForm({ onSubmit, playerName }) {
  const [form, setForm] = useState(initialState);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field) => (event) => {
    const value = Number(event.target.value);
    updateField(field, Number.isNaN(value) ? 0 : value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!playerName || !String(playerName).trim()) return;
    onSubmit({ ...form, playerName: String(playerName) });
    setForm(initialState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">선수명</label>
        <div className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white">
          {playerName ?? ''}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Outs" value={form.outsRecorded} onChange={handleNumberChange('outsRecorded')} />
        <Field label="투구수" value={form.pitchCount} onChange={handleNumberChange('pitchCount')} />
        <Field label="H" value={form.hitsAllowed} onChange={handleNumberChange('hitsAllowed')} />
        <Field label="실점" value={form.runsAllowed} onChange={handleNumberChange('runsAllowed')} />
        <Field label="자책" value={form.earnedRuns} onChange={handleNumberChange('earnedRuns')} />
        <Field label="K" value={form.strikeouts} onChange={handleNumberChange('strikeouts')} />
        <Field label="BB" value={form.walks} onChange={handleNumberChange('walks')} />
        <Field label="HBP" value={form.hitByPitch} onChange={handleNumberChange('hitByPitch')} />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={form.wins}
            onChange={(event) => updateField('wins', event.target.checked ? 1 : 0)}
            className="accent-[#daaa00]"
          />
          W (Win)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={form.losses}
            onChange={(event) => updateField('losses', event.target.checked ? 1 : 0)}
            className="accent-[#daaa00]"
          />
          L (Loss)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={form.saveEarned}
            onChange={(event) => updateField('saveEarned', event.target.checked ? 1 : 0)}
            className="accent-[#daaa00]"
          />
          SV (Save)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={form.isMVP}
            onChange={(event) => updateField('isMVP', event.target.checked)}
            className="accent-[#daaa00]"
          />
          MVP
        </label>
      </div>

      <button
        type="submit"
        className="w-full py-2 rounded-lg bg-[#daaa00] text-black font-bold hover:bg-yellow-500 transition"
      >
        기록 추가
      </button>
    </form>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white"
      />
    </div>
  );
}
