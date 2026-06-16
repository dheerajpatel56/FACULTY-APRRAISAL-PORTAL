import { Plus, Trash2 } from 'lucide-react';

const ta = 'w-full border border-surface-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y min-h-[44px]';
const lbl = 'block text-xs font-medium text-ink-secondary mb-1';
const th = 'border border-surface-border bg-surface-muted px-2 py-1.5 text-xs font-semibold text-ink-secondary text-left';
const td = 'border border-surface-border px-2 py-1 align-top';

type SubsectionState = {
  sem1Text?: string | null;
  sem2Text?: string | null;
  extraText1?: string | null;
  extraText2?: string | null;
  extraText3?: string | null;
  rows?: any[] | null;
};

type CommonProps = {
  def: any;
  value: SubsectionState;
  onChange: (next: SubsectionState) => void;
  readOnly?: boolean;
};

function setRows(value: SubsectionState, onChange: any, rows: any[]) {
  onChange({ ...value, rows });
}

// ─── duoText (1.3, 3.1, 4.1) ───────────────────────────────────
export function DuoTextSubsection({ value, onChange, readOnly }: CommonProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Semester I</label>
        <textarea
          disabled={readOnly}
          value={value.sem1Text ?? ''}
          onChange={(e) => onChange({ ...value, sem1Text: e.target.value })}
          className={ta}
        />
      </div>
      <div>
        <label className={lbl}>Semester II</label>
        <textarea
          disabled={readOnly}
          value={value.sem2Text ?? ''}
          onChange={(e) => onChange({ ...value, sem2Text: e.target.value })}
          className={ta}
        />
      </div>
    </div>
  );
}

// ─── fixedRows (1.1, 2.1-2.7, 2.10) ────────────────────────────
export function FixedRowsSubsection({ def, value, onChange, readOnly }: CommonProps) {
  const rows: any[] = value.rows ?? [];
  const extraCols: string[] = def.extraCols ?? [];
  const goalLabel = def.goalLabel ?? 'Goal';

  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r);
    setRows(value, onChange, next);
  };

  return (
    <div className="space-y-3">
      {(def.extraText ?? []).map((et: any) => (
        <div key={et.key}>
          <label className={lbl}>{et.label}</label>
          <textarea
            disabled={readOnly}
            value={(value as any)[et.key] ?? ''}
            onChange={(e) => onChange({ ...value, [et.key]: e.target.value })}
            className={ta}
          />
        </div>
      ))}

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-10`}>#</th>
            <th className={`${th} w-1/4`}>Name</th>
            {extraCols.includes('details') && <th className={th}>Details of Expected Connects</th>}
            {extraCols.includes('outcome') && <th className={th}>Expected Outcome</th>}
            <th className={th}>{goalLabel}</th>
            <th className={th}>Sem-I</th>
            <th className={th}>Sem-II</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} text-center text-xs text-ink-muted`}>{i + 1}</td>
              <td className={`${td} text-xs font-medium text-ink-primary`}>{r.name}</td>
              {extraCols.includes('details') && (
                <td className={td}><textarea disabled={readOnly} value={r.details ?? ''} onChange={(e) => updateRow(i, 'details', e.target.value)} className={ta} /></td>
              )}
              {extraCols.includes('outcome') && (
                <td className={td}><textarea disabled={readOnly} value={r.outcome ?? ''} onChange={(e) => updateRow(i, 'outcome', e.target.value)} className={ta} /></td>
              )}
              <td className={td}><textarea disabled={readOnly} value={r.goal ?? ''} onChange={(e) => updateRow(i, 'goal', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem1 ?? ''} onChange={(e) => updateRow(i, 'sem1', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem2 ?? ''} onChange={(e) => updateRow(i, 'sem2', e.target.value)} className={ta} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── pgUgRows (1.2 only) ───────────────────────────────────────
export function PgUgRowsSubsection({ value, onChange, readOnly }: CommonProps) {
  const rows: any[] = value.rows ?? [];

  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r);
    setRows(value, onChange, next);
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={`${th} w-16`}>Course</th>
          <th className={`${th} w-1/5`}>Project Type</th>
          <th className={th}>Area of Project</th>
          <th className={th}>Expected Outcomes</th>
          <th className={th}>Sem-I</th>
          <th className={th}>Sem-II</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className={`${td} text-xs font-medium text-ink-primary`}>{r.group}</td>
            <td className={`${td} text-xs text-ink-secondary`}>{r.name}</td>
            <td className={td}><textarea disabled={readOnly} value={r.area ?? ''} onChange={(e) => updateRow(i, 'area', e.target.value)} className={ta} /></td>
            <td className={td}><textarea disabled={readOnly} value={r.outcome ?? ''} onChange={(e) => updateRow(i, 'outcome', e.target.value)} className={ta} /></td>
            <td className={td}><textarea disabled={readOnly} value={r.sem1 ?? ''} onChange={(e) => updateRow(i, 'sem1', e.target.value)} className={ta} /></td>
            <td className={td}><textarea disabled={readOnly} value={r.sem2 ?? ''} onChange={(e) => updateRow(i, 'sem2', e.target.value)} className={ta} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── dynamicRows (3.3, 3.4, 3.5, 3.6, 4.2) ─────────────────────
export function DynamicRowsSubsection({ def, value, onChange, readOnly }: CommonProps) {
  const rows: any[] = value.rows ?? [];
  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r);
    setRows(value, onChange, next);
  };
  const addRow = () => {
    const blank: any = { name: '', goal: '', sem1: '', sem2: '' };
    if (def.hasParticipation) blank.participation = '';
    setRows(value, onChange, [...rows, blank]);
  };
  const removeRow = (i: number) => setRows(value, onChange, rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-10`}>#</th>
            <th className={th}>Name of the Activity</th>
            {def.hasParticipation && <th className={th}>Participation / Organization</th>}
            <th className={th}>Goal</th>
            <th className={th}>Sem-I</th>
            <th className={th}>Sem-II</th>
            {!readOnly && <th className={`${th} w-10`}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} text-center text-xs text-ink-muted`}>{i + 1}</td>
              <td className={td}><textarea disabled={readOnly} value={r.name ?? ''} onChange={(e) => updateRow(i, 'name', e.target.value)} className={ta} /></td>
              {def.hasParticipation && (
                <td className={td}><textarea disabled={readOnly} value={r.participation ?? ''} onChange={(e) => updateRow(i, 'participation', e.target.value)} className={ta} /></td>
              )}
              <td className={td}><textarea disabled={readOnly} value={r.goal ?? ''} onChange={(e) => updateRow(i, 'goal', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem1 ?? ''} onChange={(e) => updateRow(i, 'sem1', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem2 ?? ''} onChange={(e) => updateRow(i, 'sem2', e.target.value)} className={ta} /></td>
              {!readOnly && (
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
          <Plus size={12} /> Add row
        </button>
      )}
    </div>
  );
}

// ─── rigGroup (2.9) ────────────────────────────────────────────
export function RigGroupSubsection({ value, onChange, readOnly }: CommonProps) {
  const rows: any[] = value.rows ?? [];
  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r);
    setRows(value, onChange, next);
  };
  const addRow = () => setRows(value, onChange, [...rows, { name: '', outcome: '', sem1: '', sem2: '' }]);
  const removeRow = (i: number) => setRows(value, onChange, rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Name of RIG / CIG</label>
        <textarea disabled={readOnly} value={value.extraText1 ?? ''} onChange={(e) => onChange({ ...value, extraText1: e.target.value })} className={ta} />
      </div>
      <div>
        <label className={lbl}>Interdisciplinary / Multidisciplinary Research Interest Area</label>
        <textarea disabled={readOnly} value={value.extraText2 ?? ''} onChange={(e) => onChange({ ...value, extraText2: e.target.value })} className={ta} />
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-10`}>#</th>
            <th className={th}>Activity planned under RIG/CIG</th>
            <th className={th}>Expected Outcome</th>
            <th className={th}>Sem-I</th>
            <th className={th}>Sem-II</th>
            {!readOnly && <th className={`${th} w-10`}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} text-center text-xs text-ink-muted`}>{i + 1}</td>
              <td className={td}><textarea disabled={readOnly} value={r.name ?? ''} onChange={(e) => updateRow(i, 'name', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.outcome ?? ''} onChange={(e) => updateRow(i, 'outcome', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem1 ?? ''} onChange={(e) => updateRow(i, 'sem1', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem2 ?? ''} onChange={(e) => updateRow(i, 'sem2', e.target.value)} className={ta} /></td>
              {!readOnly && (
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
          <Plus size={12} /> Add activity
        </button>
      )}
    </div>
  );
}

// ─── phdGuidance (2.8) ─────────────────────────────────────────
export function PhDGuidanceSubsection({ value, onChange, readOnly }: CommonProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Indicate area of interest to guide Ph.D. scholars</label>
        <textarea disabled={readOnly} value={value.extraText1 ?? ''} onChange={(e) => onChange({ ...value, extraText1: e.target.value })} className={ta} />
      </div>
      <div>
        <label className={lbl}>Plan to register for Ph.D. Guideship under other universities</label>
        <textarea disabled={readOnly} value={value.extraText2 ?? ''} onChange={(e) => onChange({ ...value, extraText2: e.target.value })} className={ta} />
      </div>
      <div>
        <label className={lbl}>No of Ph.D. scholars guiding</label>
        <textarea disabled={readOnly} value={value.extraText3 ?? ''} onChange={(e) => onChange({ ...value, extraText3: e.target.value })} className={ta} />
      </div>
    </div>
  );
}

// ─── memberships (3.2) ─────────────────────────────────────────
export function MembershipsSubsection({ def, value, onChange, readOnly }: CommonProps) {
  const rows: any[] = value.rows ?? [];
  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: v } : r);
    setRows(value, onChange, next);
  };
  const addRow = () => setRows(value, onChange, [...rows, { name: '', goal: '', sem1: '', sem2: '' }]);
  const removeRow = (i: number) => {
    if (rows.length <= def.minRows) return;
    setRows(value, onChange, rows.filter((_, idx) => idx !== i));
  };

  const filled = rows.filter((r) => r.name?.trim()).length;
  const ok = filled >= def.minRows;

  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Professional memberships planned (Minimum {def.minRows})</label>
        <textarea disabled={readOnly} value={value.extraText1 ?? ''} onChange={(e) => onChange({ ...value, extraText1: e.target.value })} className={ta} />
      </div>

      <div className={`text-xs px-2 py-1 rounded inline-block ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {filled} of {def.minRows} required memberships listed
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-10`}>#</th>
            <th className={th}>Activity under Professional Society</th>
            <th className={th}>Goal</th>
            <th className={th}>Sem-I</th>
            <th className={th}>Sem-II</th>
            {!readOnly && <th className={`${th} w-10`}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} text-center text-xs text-ink-muted`}>{i + 1}</td>
              <td className={td}><textarea disabled={readOnly} value={r.name ?? ''} onChange={(e) => updateRow(i, 'name', e.target.value)} className={ta} placeholder="e.g. IEEE Membership" /></td>
              <td className={td}><textarea disabled={readOnly} value={r.goal ?? ''} onChange={(e) => updateRow(i, 'goal', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem1 ?? ''} onChange={(e) => updateRow(i, 'sem1', e.target.value)} className={ta} /></td>
              <td className={td}><textarea disabled={readOnly} value={r.sem2 ?? ''} onChange={(e) => updateRow(i, 'sem2', e.target.value)} className={ta} /></td>
              {!readOnly && (
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= def.minRows} className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={12} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
          <Plus size={12} /> Add membership
        </button>
      )}
    </div>
  );
}

// ─── dispatcher ────────────────────────────────────────────────
export function RenderSubsection(props: CommonProps) {
  const { def } = props;
  switch (def.type) {
    case 'duoText':      return <DuoTextSubsection {...props} />;
    case 'fixedRows':    return <FixedRowsSubsection {...props} />;
    case 'pgUgRows':     return <PgUgRowsSubsection {...props} />;
    case 'dynamicRows':  return <DynamicRowsSubsection {...props} />;
    case 'rigGroup':     return <RigGroupSubsection {...props} />;
    case 'phdGuidance':  return <PhDGuidanceSubsection {...props} />;
    case 'memberships':  return <MembershipsSubsection {...props} />;
    default: return <div className="text-sm text-red-500">Unknown subsection type: {(def as any).type}</div>;
  }
}
