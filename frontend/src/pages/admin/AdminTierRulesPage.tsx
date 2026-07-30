import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, FolderPlus, Trash2, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import { userApi } from '../../api/users';
import {
  tierRuleApi,
  type Group,
  type RuleNode,
  type Predicate,
  type Criterion,
  type Op,
  type TierName,
} from '../../api/tierRules';

const CRITERION_LABEL: Record<Criterion, string> = {
  totalScore: 'Total Score',
  feedback: 'Feedback (avg)',
  indexedCount: 'Indexed pubs (WOS+Scopus)',
  journalCount: 'Journal pubs',
  patentCount: 'Patents',
  projectCount: 'Projects',
  consultancyCount: 'Consultancy',
};
const CRITERIA = Object.keys(CRITERION_LABEL) as Criterion[];

const OP_LABEL: Record<Op, string> = { GTE: '≥', GT: '>', LTE: '≤', LT: '<', EQ: '=' };
const OPS = Object.keys(OP_LABEL) as Op[];

const TIERS: { tier: TierName; label: string; hint: string }[] = [
  { tier: 'T1', label: 'T1', hint: 'Highest tier' },
  { tier: 'T2', label: 'T2', hint: 'Middle tier' },
  { tier: 'T3', label: 'T3', hint: 'Base tier' },
];

const newPredicate = (): Predicate => ({ kind: 'predicate', criterion: 'totalScore', op: 'GTE', value: 0 });
const emptyTree = (): Group => ({ kind: 'group', op: 'AND', children: [] });

const hasEmptyGroup = (node: RuleNode): boolean => {
  if (node.kind === 'group') {
    if (node.children.length === 0) return true;
    return node.children.some(hasEmptyGroup);
  }
  return false;
};

const describe = (node: RuleNode): string => {
  if (node.kind === 'predicate') return `${CRITERION_LABEL[node.criterion]} ${OP_LABEL[node.op]} ${node.value}`;
  if (node.children.length === 0) return '(empty)';
  return `(${node.children.map(describe).join(` ${node.op} `)})`;
};

const inputCls =
  'border border-surface-border rounded px-2 py-1.5 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500';

// Recursive editor for one node in the boolean tree.
function RuleNodeEditor({
  node,
  onChange,
  onDelete,
  isRoot,
}: {
  node: RuleNode;
  onChange: (n: RuleNode) => void;
  onDelete?: () => void;
  isRoot?: boolean;
}) {
  if (node.kind === 'predicate') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={node.criterion}
          onChange={(e) => onChange({ ...node, criterion: e.target.value as Criterion })}
          className={inputCls}
        >
          {CRITERIA.map((c) => (
            <option key={c} value={c}>
              {CRITERION_LABEL[c]}
            </option>
          ))}
        </select>
        <select value={node.op} onChange={(e) => onChange({ ...node, op: e.target.value as Op })} className={inputCls}>
          {OPS.map((o) => (
            <option key={o} value={o}>
              {OP_LABEL[o]}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          value={node.value}
          onChange={(e) => onChange({ ...node, value: e.target.value === '' ? 0 : Number(e.target.value) })}
          className={`${inputCls} w-24`}
        />
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Remove condition" type="button">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  }

  // group
  const update = (i: number, child: RuleNode) =>
    onChange({ ...node, children: node.children.map((c, idx) => (idx === i ? child : c)) });
  const remove = (i: number) => onChange({ ...node, children: node.children.filter((_, idx) => idx !== i) });
  const addCond = () => onChange({ ...node, children: [...node.children, newPredicate()] });
  const addGroup = () => onChange({ ...node, children: [...node.children, emptyTree()] });

  return (
    <div className={`rounded border ${isRoot ? 'border-surface-border' : 'border-primary-200 bg-primary-50/30'} p-3`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="inline-flex rounded overflow-hidden border border-surface-border text-xs font-semibold">
          {(['AND', 'OR'] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ ...node, op })}
              className={`px-3 py-1 ${node.op === op ? 'bg-primary-600 text-white' : 'bg-surface-base text-ink-secondary hover:bg-surface-muted'}`}
            >
              {op}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-muted">
          match {node.op === 'AND' ? 'all' : 'any'} of the following
        </span>
        <div className="flex-1" />
        <button type="button" onClick={addCond} className="flex items-center gap-1 text-xs text-primary-700 hover:underline">
          <Plus size={13} /> Condition
        </button>
        <button type="button" onClick={addGroup} className="flex items-center gap-1 text-xs text-primary-700 hover:underline">
          <FolderPlus size={13} /> Group
        </button>
        {onDelete && (
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-600" title="Remove group" type="button">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {node.children.length === 0 ? (
        <div className="text-xs text-ink-muted italic pl-1">No conditions — add one.</div>
      ) : (
        <div className="space-y-2 pl-1">
          {node.children.map((child, i) => (
            <RuleNodeEditor key={i} node={child} onChange={(c) => update(i, c)} onDelete={() => remove(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTierRulesPage() {
  const [years, setYears] = useState<any[]>([]);
  const [yearId, setYearId] = useState('');
  const [activeTier, setActiveTier] = useState<TierName>('T1');
  const [trees, setTrees] = useState<Record<TierName, Group>>({ T1: emptyTree(), T2: emptyTree(), T3: emptyTree() });
  const [ruleIds, setRuleIds] = useState<Record<TierName, string | null>>({ T1: null, T2: null, T3: null });

  useEffect(() => {
    userApi
      .listAdminAcademicYears()
      .then((ys: any[]) => {
        setYears(ys);
        if (ys.length) setYearId((prev) => prev || ys[0].id);
      })
      .catch(() => toast.error('Failed to load academic years'));
  }, []);

  useEffect(() => {
    if (!yearId) return;
    tierRuleApi
      .list(yearId)
      .then((rules) => {
        const t: Record<TierName, Group> = { T1: emptyTree(), T2: emptyTree(), T3: emptyTree() };
        const ids: Record<TierName, string | null> = { T1: null, T2: null, T3: null };
        for (const r of rules) {
          t[r.tier] = r.expression;
          ids[r.tier] = r.id;
        }
        setTrees(t);
        setRuleIds(ids);
      })
      .catch(() => toast.error('Failed to load tier rules'));
  }, [yearId]);

  const setTree = (tier: TierName, g: Group) => setTrees((prev) => ({ ...prev, [tier]: g }));

  const save = async () => {
    const tree = trees[activeTier];
    if (hasEmptyGroup(tree)) {
      toast.error('Every group needs at least one condition');
      return;
    }
    try {
      const rule = await tierRuleApi.upsert(yearId, activeTier, tree);
      setRuleIds((prev) => ({ ...prev, [activeTier]: rule.id }));
      toast.success(`${activeTier} rule saved`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Save failed');
    }
  };

  const clear = async () => {
    const id = ruleIds[activeTier];
    if (id && !confirm(`Delete the saved ${activeTier} rule?`)) return;
    try {
      if (id) await tierRuleApi.remove(id);
      setTree(activeTier, emptyTree());
      setRuleIds((prev) => ({ ...prev, [activeTier]: null }));
      if (id) toast.success(`${activeTier} rule cleared`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Clear failed');
    }
  };

  const tree = trees[activeTier];

  return (
    <div>
      <PageHeader
        title="Tier Rules"
        breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Tier Rules' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={clear}
              disabled={!yearId}
              className="flex items-center gap-2 border border-surface-border text-ink-secondary px-3 py-2 rounded text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
            >
              <Trash2 size={16} /> Clear {activeTier}
            </button>
            <button
              onClick={save}
              disabled={!yearId}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              <Save size={16} /> Save {activeTier}
            </button>
          </div>
        }
      />

      <p className="text-xs text-ink-muted mb-4">
        Define each tier as an AND/OR combination of criteria. A faculty is graded into the highest tier whose rule they satisfy
        (T1 &gt; T2 &gt; T3). Rules are saved per tier.
      </p>

      <div className="mb-4 max-w-xs">
        <label className="block text-xs font-medium text-ink-secondary mb-1">Academic Year</label>
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={`${inputCls} w-full`}>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 mb-4 border-b border-surface-border">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            onClick={() => setActiveTier(t.tier)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTier === t.tier
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {t.label}
            {ruleIds[t.tier] && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />}
          </button>
        ))}
      </div>

      <Card>
        <RuleNodeEditor node={tree} onChange={(n) => setTree(activeTier, n as Group)} isRoot />
        <div className="mt-4 pt-3 border-t border-surface-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">Preview</div>
          <code className="text-sm text-ink-secondary break-words">
            {activeTier} if {describe(tree)}
          </code>
        </div>
      </Card>
    </div>
  );
}
