import { useState } from 'react';

const initialState = {
  plateAppearances: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  runs: 0,
  rbi: 0,
  walks: 0,
  hitByPitch: 0,
  strikeouts: 0,
  stolenBases: 0,
  sacs: 0,
  caughtStealing: 0,
  isMVP: false,
};

export function BattingRecordForm({ onSubmit, playerNumber, playerName }) {
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
    onSubmit({ ...form, playerNumber: String(playerNumber ?? ''), playerName: String(playerName) });
    setForm(initialState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">등번호</label>
          <div className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white">
            {playerNumber ?? ''}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">선수명</label>
          <div className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white">
            {playerName ?? ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="PA" value={form.plateAppearances} onChange={handleNumberChange('plateAppearances')} />
        <Field label="1B" value={form.singles} onChange={handleNumberChange('singles')} />
        <Field label="2B" value={form.doubles} onChange={handleNumberChange('doubles')} />
        <Field label="3B" value={form.triples} onChange={handleNumberChange('triples')} />
        <Field label="HR" value={form.homeRuns} onChange={handleNumberChange('homeRuns')} />
        <Field label="R" value={form.runs} onChange={handleNumberChange('runs')} />
        <Field label="RBI" value={form.rbi} onChange={handleNumberChange('rbi')} />
        <Field label="BB" value={form.walks} onChange={handleNumberChange('walks')} />
        <Field label="HBP" value={form.hitByPitch} onChange={handleNumberChange('hitByPitch')} />
        <Field label="SO" value={form.strikeouts} onChange={handleNumberChange('strikeouts')} />
        <Field label="SAC" value={form.sacs} onChange={handleNumberChange('sacs')} />
        <Field label="SB" value={form.stolenBases} onChange={handleNumberChange('stolenBases')} />
        <Field label="CS" value={form.caughtStealing} onChange={handleNumberChange('caughtStealing')} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={form.isMVP}
          onChange={(event) => updateField('isMVP', event.target.checked)}
          className="accent-[#daaa00]"
        />
        MVP
      </label>

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
