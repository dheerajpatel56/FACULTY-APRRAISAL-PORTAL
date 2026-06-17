import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { appraisalApi } from '../../api/appraisals';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Plus, Send } from 'lucide-react';
import FileUpload from '../../components/FileUpload';

const STEPS = ['Leave & Info', 'Teaching (Cat 1)', 'Research (Cat 2)', 'Development (Cat 3)', 'Governance (Cat 4)', 'Supplementary (Cat 5)', 'Preview & Submit'];

export default function AppraisalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submission, setSubmission] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const { register, control, reset, getValues } = useForm({
    defaultValues: {
      clLeaves: 0, elLeaves: 0, hplLeaves: 0, odLeaves: 0, otherLeaves: '', higherQualAcquired: '',
      cat1Courses: [] as any[], cat1CourseResults: [] as any[], cat1Projects: [] as any[], cat1EContent: [] as any[], cat1ICT: [] as any[],
      cat2Journals: [] as any[], cat2Conferences: [] as any[], cat2BookChapters: [] as any[],
      cat2Books: [] as any[], cat2Citations: { scopusCount: 0, wosCount: 0, hIndex: 0, pubsWithCitations: 0, totalPubsTillDate: 0 },
      cat2Patents: [] as any[], cat2Projects: [] as any[], cat2Consultancy: [] as any[],
      cat2Guidance: [] as any[], cat2ResearchGroups: [] as any[], cat2Linkages: [] as any[], cat2Startups: [] as any[],
      cat3AdvQual: { pursuingPostDoc: false, phdStatus: '', pursuingPGDegree: false, pursuingPGDiploma: false },
      cat3Organised: [] as any[], cat3ResourcePerson: [] as any[], cat3Editorial: [] as any[],
      cat3Training: [] as any[], cat3IntlTravel: [] as any[],
      cat4AdminResp: [] as any[], cat4StudentAct: [] as any[],
      cat5Memberships: [] as any[], cat5Awards: [] as any[], cat5Differentiators: [] as any[], cat5Internships: [] as any[],
    },
  });

  const courses = useFieldArray({ control, name: 'cat1Courses' });
  const courseResults = useFieldArray({ control, name: 'cat1CourseResults' });
  const projects = useFieldArray({ control, name: 'cat1Projects' });
  const eContent = useFieldArray({ control, name: 'cat1EContent' });
  const ict = useFieldArray({ control, name: 'cat1ICT' });
  const journals = useFieldArray({ control, name: 'cat2Journals' });
  const conferences = useFieldArray({ control, name: 'cat2Conferences' });
  const bookChapters = useFieldArray({ control, name: 'cat2BookChapters' });
  const books = useFieldArray({ control, name: 'cat2Books' });
  const patents = useFieldArray({ control, name: 'cat2Patents' });
  const cat2Proj = useFieldArray({ control, name: 'cat2Projects' });
  const consultancy = useFieldArray({ control, name: 'cat2Consultancy' });
  const guidance = useFieldArray({ control, name: 'cat2Guidance' });
  const researchGroups = useFieldArray({ control, name: 'cat2ResearchGroups' });
  const linkages = useFieldArray({ control, name: 'cat2Linkages' });
  const startups = useFieldArray({ control, name: 'cat2Startups' });
  const organised = useFieldArray({ control, name: 'cat3Organised' });
  const resourcePerson = useFieldArray({ control, name: 'cat3ResourcePerson' });
  const editorial = useFieldArray({ control, name: 'cat3Editorial' });
  const training = useFieldArray({ control, name: 'cat3Training' });
  const intlTravel = useFieldArray({ control, name: 'cat3IntlTravel' });
  const adminResp = useFieldArray({ control, name: 'cat4AdminResp' });
  const studentAct = useFieldArray({ control, name: 'cat4StudentAct' });
  const memberships = useFieldArray({ control, name: 'cat5Memberships' });
  const awards = useFieldArray({ control, name: 'cat5Awards' });
  const differentiators = useFieldArray({ control, name: 'cat5Differentiators' });
  const internships = useFieldArray({ control, name: 'cat5Internships' });

  useEffect(() => {
    appraisalApi.get(id!).then((sub) => {
      setSubmission(sub);
      reset({
        clLeaves: sub.clLeaves ?? 0,
        elLeaves: sub.elLeaves ?? 0,
        hplLeaves: sub.hplLeaves ?? 0,
        odLeaves: sub.odLeaves ?? 0,
        otherLeaves: sub.otherLeaves ?? '',
        higherQualAcquired: sub.higherQualAcquired ?? '',
        cat1Courses: sub.cat1Courses ?? [],
        cat1CourseResults: sub.cat1CourseResults ?? [],
        cat1Projects: sub.cat1Projects ?? [],
        cat1EContent: sub.cat1EContent ?? [],
        cat1ICT: sub.cat1ICT ?? [],
        cat2Journals: sub.cat2Journals ?? [],
        cat2Conferences: sub.cat2Conferences ?? [],
        cat2BookChapters: sub.cat2BookChapters ?? [],
        cat2Books: sub.cat2Books ?? [],
        cat2Citations: sub.cat2Citations ?? { scopusCount: 0, wosCount: 0, hIndex: 0, pubsWithCitations: 0, totalPubsTillDate: 0 },
        cat2Patents: sub.cat2Patents ?? [],
        cat2Projects: sub.cat2Projects ?? [],
        cat2Consultancy: sub.cat2Consultancy ?? [],
        cat2Guidance: sub.cat2Guidance ?? [],
        cat2ResearchGroups: sub.cat2ResearchGroups ?? [],
        cat2Linkages: sub.cat2Linkages ?? [],
        cat2Startups: sub.cat2Startups ?? [],
        cat3AdvQual: sub.cat3AdvQual ?? { pursuingPostDoc: false, phdStatus: '', pursuingPGDegree: false, pursuingPGDiploma: false },
        cat3Organised: sub.cat3Organised ?? [],
        cat3ResourcePerson: sub.cat3ResourcePerson ?? [],
        cat3Editorial: sub.cat3Editorial ?? [],
        cat3Training: sub.cat3Training ?? [],
        cat3IntlTravel: sub.cat3IntlTravel ?? [],
        cat4AdminResp: sub.cat4AdminResp ?? [],
        cat4StudentAct: sub.cat4StudentAct ?? [],
        cat5Memberships: sub.cat5Memberships ?? [],
        cat5Awards: sub.cat5Awards ?? [],
        cat5Differentiators: sub.cat5Differentiators ?? [],
        cat5Internships: sub.cat5Internships ?? [],
      });
    }).catch(() => toast.error('Failed to load submission'));
  }, [id]);

  // Recursive NaN scrubber — number inputs left blank produce NaN. Replace with 0.
  const deNan = (v: any): any => {
    if (Array.isArray(v)) return v.map(deNan);
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const k of Object.keys(v)) out[k] = deNan(v[k]);
      return out;
    }
    if (typeof v === 'number' && Number.isNaN(v)) return 0;
    return v;
  };

  // Serialize saves — prevent overlapping requests racing.
  const saveLock = useRef<Promise<void>>(Promise.resolve());

  const saveData = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    // Wait for previous save to finish before starting next.
    const prev = saveLock.current;
    let release: () => void = () => {};
    saveLock.current = new Promise<void>((res) => { release = res; });
    try {
      await prev;
      if (!silent) setSaving(true);
      const values = deNan(getValues());
      const { clLeaves, elLeaves, hplLeaves, odLeaves, otherLeaves, higherQualAcquired, ...categories } = values;
      await appraisalApi.update(id!, {
        leaveData: { clLeaves, elLeaves, hplLeaves, odLeaves, otherLeaves, higherQualAcquired },
        categories,
      });
      if (!silent) toast.success('Saved');
    } catch (e: any) {
      // Only show toast for manual saves; silent autosave errors logged to console.
      if (!silent) toast.error(e?.response?.data?.error ?? 'Save failed');
      else console.warn('Autosave failed', e);
      throw e;
    } finally {
      if (!silent) setSaving(false);
      release();
    }
  };

  // goToStep: autosave then switch. Awaits previous save via saveLock.
  // Skip autosave when submission is read-only (backend will reject anyway).
  const goToStep = async (next: number) => {
    if (next === step) return;
    if (!readOnly) {
      try {
        await saveData({ silent: true });
      } catch {
        return; // Stay on current step; user can fix.
      }
    }
    setStep(next);
  };

  const submitAppraisal = async () => {
    await saveData();
    try {
      await appraisalApi.submit(id!);
      toast.success('Submitted successfully!');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Submit failed');
    }
  };

  const loadScore = async () => {
    setScoreLoading(true);
    try {
      if (!readOnly) await saveData({ silent: true });
      const s = await appraisalApi.getScore(id!);
      setScore(s);
    } catch {
      toast.error('Failed to compute score');
    } finally {
      setScoreLoading(false);
    }
  };

  useEffect(() => {
    if (step === 6 && id) loadScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, id]);

  const readOnly = !!submission && submission.status !== 'DRAFT';

  const inputCls = "w-full border border-surface-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelCls = "block text-xs font-medium text-ink-secondary mb-1";

  // Proof-file upload cell bound to a react-hook-form field path
  const proofField = (name: string, label = 'Proof') => (
    <div>
      <label className={labelCls}>{label}</label>
      <Controller
        control={control}
        name={name as any}
        render={({ field }) => (
          <FileUpload value={field.value} onChange={field.onChange} readOnly={readOnly} />
        )}
      />
    </div>
  );

  const addRowBtn = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2">
      <Plus size={14} /> {label}
    </button>
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="text-ink-subtle hover:text-ink-secondary">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-ink-primary">
          {readOnly ? 'View' : 'Edit'} Submission #{submission?.submissionNumber}
        </h1>
        {submission && (
          <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${
            submission.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
            submission.status === 'SUBMITTED' ? 'bg-primary-100 text-primary-800' :
            submission.status === 'UNDER_REVIEW' ? 'bg-purple-100 text-purple-800' :
            submission.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
            submission.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
            'bg-surface-muted text-ink-primary'
          }`}>
            {submission.status}
          </span>
        )}
      </div>

      {readOnly && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
          This submission is <strong>{submission.status}</strong> and read-only.
          {submission.status === 'REJECTED' && ' Reviewer rejected — create a new draft to resubmit corrections.'}
          {submission.status === 'SUBMITTED' && ' Awaiting reviewer pickup. You may withdraw from the dashboard.'}
          {submission.status === 'UNDER_REVIEW' && ' Reviewer is evaluating. Comments will unlock once approved/rejected.'}
        </div>
      )}

      {/* Step indicators */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
              i === step ? 'bg-primary-600 text-white' : 'bg-surface-muted text-ink-secondary hover:bg-surface-border'
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <form className="bg-white border border-surface-border rounded-md p-6">
        <fieldset disabled={readOnly} className={readOnly ? 'opacity-90' : ''}>
        {/* Step 0: Leave & Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink-primary mb-3">Part I — Leave Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {(['clLeaves', 'elLeaves', 'hplLeaves', 'odLeaves'] as const).map((f) => (
                <div key={f}>
                  <label className={labelCls}>{f.replace('Leaves', '').toUpperCase()} Leaves</label>
                  <input type="number" {...register(f, { valueAsNumber: true })} className={inputCls} />
                </div>
              ))}
            </div>
            <div>
              <label className={labelCls}>Other Leaves</label>
              <input {...register('otherLeaves')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Higher Qualification Acquired</label>
              <input {...register('higherQualAcquired')} className={inputCls} />
            </div>
          </div>
        )}

        {/* Step 1: Teaching */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-ink-primary mb-3">1.1 Courses Taught — Lectures</h2>
              <p className="text-xs text-ink-muted mb-3">Lecture delivery score from periods conducted vs planned (+ novel pedagogy).</p>
              {courses.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Course Name</label>
                      <input {...register(`cat1Courses.${i}.courseName`)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Level</label>
                      <select {...register(`cat1Courses.${i}.level`)} className={inputCls}>
                        <option value="BTECH">BTech</option>
                        <option value="MTECH">MTech</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Year/Sem</label>
                      <input {...register(`cat1Courses.${i}.yearSem`)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Periods Planned</label>
                      <input type="number" {...register(`cat1Courses.${i}.periodPlanned`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Periods Conducted</label>
                      <input type="number" {...register(`cat1Courses.${i}.periodsConducted`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input type="checkbox" {...register(`cat1Courses.${i}.novelPedagogyUsed`)} />
                        Novel Pedagogy
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={() => courses.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Course', () => courses.append({ courseName: '', level: 'BTECH', yearSem: '', periodPlanned: 0, periodsConducted: 0, novelPedagogyUsed: false }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">1.2 Courses Taught — Attendance, Feedback &amp; Results</h2>
              <p className="text-xs text-ink-muted mb-3">
                Per course (max 20): Attendance A = (n1·5 + n2·3)/Y (max 5), Feedback B (max 5),
                Results C = (n3·10 + n4·8 + n5·5)/Y (max 10). Section max 80. Scores computed automatically.
              </p>
              {courseResults.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Name of the Course</label>
                      <input {...register(`cat1CourseResults.${i}.courseName`)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Class Size (Y)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.classSize`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Feedback Received (0-5)</label>
                      <input type="number" step="0.01" {...register(`cat1CourseResults.${i}.feedbackReceived`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Attendance ≥75% (n1)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.attnGte75`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Attendance &lt;75 &amp; ≥65% (n2)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.attnLt75Gte65`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Grade O, A+ (n3)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.gradeOAPlus`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Grade A, B (n4)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.gradeAB`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Grade C, D (n5)</label>
                      <input type="number" {...register(`cat1CourseResults.${i}.gradeCD`, { valueAsNumber: true })} className={inputCls} />
                    </div>
                  </div>
                  <button type="button" onClick={() => courseResults.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Course Result', () => courseResults.append({ courseName: '', classSize: 0, attnGte75: 0, attnLt75Gte65: 0, feedbackReceived: 0, gradeOAPlus: 0, gradeAB: 0, gradeCD: 0 }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">1.3 Projects Guided</h2>
              {projects.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div>
                    <label className={labelCls}>Course Level</label>
                    <select {...register(`cat1Projects.${i}.course`)} className={inputCls}>
                      <option value="BTECH">BTech</option>
                      <option value="MTECH">MTech</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Project Type</label>
                    <select {...register(`cat1Projects.${i}.projectType`)} className={inputCls}>
                      <option value="MINI">Mini</option>
                      <option value="MAJOR">Major</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Count</label>
                    <input type="number" {...register(`cat1Projects.${i}.count`, { valueAsNumber: true })} className={inputCls} />
                  </div>
                  <button type="button" onClick={() => projects.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Project Row', () => projects.append({ course: 'BTECH', projectType: 'MINI', count: 1 }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">1.4 e-Content Developed</h2>
              {eContent.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Course Name</label><input {...register(`cat1EContent.${i}.courseName`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Content Name</label><input {...register(`cat1EContent.${i}.contentName`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Nature</label>
                      <select {...register(`cat1EContent.${i}.nature`)} className={inputCls}>
                        <option value="Video">Video</option>
                        <option value="Audio">Audio</option>
                        <option value="PPT">PPT</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {proofField(`cat1EContent.${i}.evidenceFile`, 'Evidence File')}
                  </div>
                  <button type="button" onClick={() => eContent.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add e-Content', () => eContent.append({ courseName: '', contentName: '', nature: 'Video', evidenceFile: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">1.5 ICT Usage</h2>
              {ict.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Course Name</label><input {...register(`cat1ICT.${i}.courseName`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Platform</label>
                      <select {...register(`cat1ICT.${i}.platform`)} className={inputCls}>
                        <option value="Google Classroom">Google Classroom</option>
                        <option value="Moodle">Moodle</option>
                        <option value="MS Teams">MS Teams</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Nature of Use</label>
                      <select {...register(`cat1ICT.${i}.natureOfUse`)} className={inputCls}>
                        <option value="Assignments">Assignments</option>
                        <option value="Quizzes">Quizzes</option>
                        <option value="Recorded Lectures">Recorded Lectures</option>
                        <option value="Discussion Forums">Discussion Forums</option>
                      </select>
                    </div>
                    {proofField(`cat1ICT.${i}.evidenceFile`, 'Evidence File')}
                  </div>
                  <button type="button" onClick={() => ict.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add ICT Usage', () => ict.append({ courseName: '', platform: 'Google Classroom', natureOfUse: 'Assignments', evidenceFile: '' }))}
            </div>
          </div>
        )}

        {/* Step 2: Research */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.1 Journal Publications</h2>
              {journals.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2Journals.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Journal Name</label><input {...register(`cat2Journals.${i}.journalName`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Authors</label><input {...register(`cat2Journals.${i}.authors`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Author Position</label>
                      <select {...register(`cat2Journals.${i}.authorPosition`)} className={inputCls}>
                        <option>First</option><option>Second</option><option>Corresponding</option><option>Supervisor</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Indexed</label>
                      <select {...register(`cat2Journals.${i}.indexed`)} className={inputCls}>
                        <option value="SCI">SCI</option><option value="WOS">WOS</option><option value="SCOPUS">SCOPUS</option><option value="NONE">None</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Impact Factor</label><input type="number" step="0.01" {...register(`cat2Journals.${i}.impactFactor`, { valueAsNumber: true })} className={inputCls} /></div>
                    <div><label className={labelCls}>DOI</label><input {...register(`cat2Journals.${i}.doi`)} className={inputCls} /></div>
                    <div><label className={labelCls}>ISSN</label><input {...register(`cat2Journals.${i}.issn`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Volume</label><input {...register(`cat2Journals.${i}.volume`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Issue No</label><input {...register(`cat2Journals.${i}.issueNo`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Page Nos</label><input {...register(`cat2Journals.${i}.pageNos`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Date of Publication</label><input type="date" {...register(`cat2Journals.${i}.dateOfPub`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Quartile</label>
                      <select {...register(`cat2Journals.${i}.quartile`)} className={inputCls}>
                        <option value="">N/A</option>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                      </select>
                    </div>
                    {proofField(`cat2Journals.${i}.proofFile`)}
                  </div>
                  <button type="button" onClick={() => journals.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Journal', () => journals.append({ title: '', journalName: '', authors: '', authorPosition: 'First', indexed: 'NONE', impactFactor: 0, volume: '', issueNo: '', pageNos: '', dateOfPub: '', quartile: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.1 Conference Papers</h2>
              {conferences.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2Conferences.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Conference Name</label><input {...register(`cat2Conferences.${i}.conferenceName`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Authors</label><input {...register(`cat2Conferences.${i}.authors`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Author Position</label>
                      <select {...register(`cat2Conferences.${i}.authorPosition`)} className={inputCls}>
                        <option>First</option><option>Second</option><option>Corresponding</option><option>Supervisor</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Date of Publication</label><input type="date" {...register(`cat2Conferences.${i}.dateOfPub`)} className={inputCls} /></div>
                    <div><label className={labelCls}>ISSN</label><input {...register(`cat2Conferences.${i}.issn`)} className={inputCls} /></div>
                    <div><label className={labelCls}>DOI</label><input {...register(`cat2Conferences.${i}.doi`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Indexed</label>
                      <select {...register(`cat2Conferences.${i}.indexed`)} className={inputCls}>
                        <option value="SCI">SCI</option><option value="WOS">WOS</option><option value="SCOPUS">SCOPUS</option><option value="NONE">None</option>
                      </select>
                    </div>
                    {proofField(`cat2Conferences.${i}.proofFile`)}
                  </div>
                  <button type="button" onClick={() => conferences.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Conference', () => conferences.append({ title: '', conferenceName: '', authors: '', authorPosition: 'First', dateOfPub: '', issn: '', doi: '', indexed: 'NONE' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.1 Book Chapters</h2>
              {bookChapters.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2BookChapters.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Authors</label><input {...register(`cat2BookChapters.${i}.authors`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Author Position</label>
                      <select {...register(`cat2BookChapters.${i}.authorPosition`)} className={inputCls}>
                        <option>First</option><option>Second</option><option>Corresponding</option><option>Supervisor</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Publisher</label><input {...register(`cat2BookChapters.${i}.publisher`)} className={inputCls} /></div>
                    <div><label className={labelCls}>ISBN</label><input {...register(`cat2BookChapters.${i}.isbn`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Chapter No</label><input {...register(`cat2BookChapters.${i}.chapterNo`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Scope</label>
                      <select {...register(`cat2BookChapters.${i}.scope`)} className={inputCls}>
                        <option value="INTERNATIONAL">International</option><option value="NATIONAL">National</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input type="checkbox" {...register(`cat2BookChapters.${i}.isEdited`)} /> Edited Book
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={() => bookChapters.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Book Chapter', () => bookChapters.append({ title: '', authors: '', authorPosition: 'First', publisher: '', isbn: '', chapterNo: '', isEdited: false, scope: 'INTERNATIONAL' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.2 Citations</h2>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={labelCls}>Scopus Count</label><input type="number" {...register('cat2Citations.scopusCount', { valueAsNumber: true })} className={inputCls} /></div>
                <div><label className={labelCls}>WOS Count</label><input type="number" {...register('cat2Citations.wosCount', { valueAsNumber: true })} className={inputCls} /></div>
                <div><label className={labelCls}>h-Index</label><input type="number" {...register('cat2Citations.hIndex', { valueAsNumber: true })} className={inputCls} /></div>
                <div><label className={labelCls}>Publications with Citations</label><input type="number" {...register('cat2Citations.pubsWithCitations', { valueAsNumber: true })} className={inputCls} /></div>
                <div><label className={labelCls}>Total Publications (till date)</label><input type="number" {...register('cat2Citations.totalPubsTillDate', { valueAsNumber: true })} className={inputCls} /></div>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.3 Books</h2>
              {books.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2Books.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Authors</label><input {...register(`cat2Books.${i}.authors`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Publisher</label><input {...register(`cat2Books.${i}.publisher`)} className={inputCls} /></div>
                    <div><label className={labelCls}>ISBN</label><input {...register(`cat2Books.${i}.isbn`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Scope</label>
                      <select {...register(`cat2Books.${i}.scope`)} className={inputCls}>
                        <option value="INTERNATIONAL">International</option><option value="NATIONAL">National</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-ink-secondary">
                        <input type="checkbox" {...register(`cat2Books.${i}.isEdited`)} /> Edited
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={() => books.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Book', () => books.append({ title: '', authors: '', publisher: '', isbn: '', isEdited: false, scope: 'INTERNATIONAL' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.4 Patents</h2>
              {patents.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2Patents.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Country</label><input {...register(`cat2Patents.${i}.country`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Inventors</label><input {...register(`cat2Patents.${i}.inventors`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select {...register(`cat2Patents.${i}.status`)} className={inputCls}>
                        <option value="FILED">Filed</option><option value="PUBLISHED">Published</option><option value="GRANTED">Granted</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Application Number</label><input {...register(`cat2Patents.${i}.appNumber`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Date of Publication</label><input type="date" {...register(`cat2Patents.${i}.dateOfPub`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Date of Grant</label><input type="date" {...register(`cat2Patents.${i}.dateOfGrant`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Valid Duration</label><input {...register(`cat2Patents.${i}.validDuration`)} className={inputCls} /></div>
                    {proofField(`cat2Patents.${i}.proofFile`)}
                  </div>
                  <button type="button" onClick={() => patents.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Patent', () => patents.append({ title: '', country: 'India', inventors: '', status: 'FILED', appNumber: '', dateOfPub: '', dateOfGrant: '', validDuration: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.5 Sponsored Projects</h2>
              {cat2Proj.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Title</label><input {...register(`cat2Projects.${i}.title`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Funding Agency</label><input {...register(`cat2Projects.${i}.fundingAgency`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Amount (Lakhs)</label><input type="number" step="0.1" {...register(`cat2Projects.${i}.amountLakhs`, { valueAsNumber: true })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select {...register(`cat2Projects.${i}.status`)} className={inputCls}>
                        <option value="APPLIED">Applied</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Role</label>
                      <select {...register(`cat2Projects.${i}.role`)} className={inputCls}>
                        <option>PI</option><option>Co-PI</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Duration Period</label><input {...register(`cat2Projects.${i}.durationPeriod`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Date of Application</label><input type="date" {...register(`cat2Projects.${i}.dateOfApplication`)} className={inputCls} /></div>
                    {proofField(`cat2Projects.${i}.proofFile`)}
                  </div>
                  <button type="button" onClick={() => cat2Proj.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Project', () => cat2Proj.append({ title: '', fundingAgency: '', amountLakhs: 0, role: 'PI', status: 'APPLIED', durationPeriod: '', dateOfApplication: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.6 Consultancy</h2>
              {consultancy.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Name</label><input {...register(`cat2Consultancy.${i}.name`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Agency</label><input {...register(`cat2Consultancy.${i}.agency`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Amount (Lakhs)</label><input type="number" step="0.1" {...register(`cat2Consultancy.${i}.amountLakhs`, { valueAsNumber: true })} className={inputCls} /></div>
                  <button type="button" onClick={() => consultancy.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Consultancy', () => consultancy.append({ name: '', agency: '', amountLakhs: 0 }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.7 Research Guidance (PhD)</h2>
              {guidance.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className={labelCls}>Student Name</label><input {...register(`cat2Guidance.${i}.studentName`)} className={inputCls} /></div>
                  <div><label className={labelCls}>University</label><input {...register(`cat2Guidance.${i}.university`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Thesis Title</label><input {...register(`cat2Guidance.${i}.thesisTitle`)} className={inputCls} /></div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm text-ink-secondary">
                      <input type="checkbox" {...register(`cat2Guidance.${i}.isGuide`)} />
                      Guide (unchecked = Co-Guide)
                    </label>
                  </div>
                  <button type="button" onClick={() => guidance.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Guidance', () => guidance.append({ studentName: '', university: '', thesisTitle: '', isGuide: true }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.8 Research Interest Groups</h2>
              {researchGroups.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Group Name</label><input {...register(`cat2ResearchGroups.${i}.groupName`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Size</label><input type="number" {...register(`cat2ResearchGroups.${i}.size`, { valueAsNumber: true })} className={inputCls} /></div>
                  <div><label className={labelCls}>Outcome</label><input {...register(`cat2ResearchGroups.${i}.outcome`)} className={inputCls} /></div>
                  <button type="button" onClick={() => researchGroups.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Research Group', () => researchGroups.append({ groupName: '', size: 1, outcome: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.9 Institute Linkages</h2>
              {linkages.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Institute Name</label><input {...register(`cat2Linkages.${i}.instituteName`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Contact Person</label><input {...register(`cat2Linkages.${i}.contactPerson`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Outcome</label><input {...register(`cat2Linkages.${i}.outcome`)} className={inputCls} /></div>
                  <button type="button" onClick={() => linkages.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Linkage', () => linkages.append({ instituteName: '', contactPerson: '', outcome: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">2.10 Startups / Innovation</h2>
              {startups.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Group Name</label><input {...register(`cat2Startups.${i}.groupName`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Activity</label><input {...register(`cat2Startups.${i}.activity`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Outcome</label><input {...register(`cat2Startups.${i}.outcome`)} className={inputCls} /></div>
                  <button type="button" onClick={() => startups.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Startup', () => startups.append({ groupName: '', activity: '', outcome: '' }))}
            </div>
          </div>
        )}

        {/* Step 3: Faculty Development */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.1 Advanced Qualification</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('cat3AdvQual.pursuingPostDoc')} /> Pursuing Post-Doc</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('cat3AdvQual.pursuingPGDegree')} /> Pursuing PG Degree</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('cat3AdvQual.pursuingPGDiploma')} /> Pursuing PG Diploma</label>
                <div>
                  <label className={labelCls}>PhD Status</label>
                  <select {...register('cat3AdvQual.phdStatus')} className={inputCls}>
                    <option value="">None</option>
                    <option value="coursework_completed">Coursework Completed</option>
                    <option value="pre_phd_completed">Pre-PhD Completed</option>
                    <option value="thesis_submitted">Thesis Submitted</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.2 Programs Organised</h2>
              {organised.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className={labelCls}>Title</label><input {...register(`cat3Organised.${i}.title`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Period</label><input {...register(`cat3Organised.${i}.period`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Sponsor</label><input {...register(`cat3Organised.${i}.sponsor`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Scope</label>
                    <select {...register(`cat3Organised.${i}.scope`)} className={inputCls}>
                      <option value="NATIONAL">National</option><option value="INTERNATIONAL">International</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Status</label>
                    <select {...register(`cat3Organised.${i}.status`)} className={inputCls}>
                      <option value="Completed">Completed</option><option value="Ongoing">Ongoing</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => organised.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Program', () => organised.append({ title: '', period: '', sponsor: '', scope: 'NATIONAL', status: 'Completed' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.3 Resource Person</h2>
              {resourcePerson.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Program Type</label>
                      <select {...register(`cat3ResourcePerson.${i}.programType`)} className={inputCls}>
                        <option>FDP</option><option>Conference</option><option>Workshop</option>
                        <option>Guest Lecture</option><option>Webinar</option><option>Other</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Program Name</label><input {...register(`cat3ResourcePerson.${i}.programName`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Topic</label><input {...register(`cat3ResourcePerson.${i}.topic`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Duration</label><input {...register(`cat3ResourcePerson.${i}.duration`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Venue</label><input {...register(`cat3ResourcePerson.${i}.venue`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Organised By</label><input {...register(`cat3ResourcePerson.${i}.organisedBy`)} className={inputCls} /></div>
                  </div>
                  <button type="button" onClick={() => resourcePerson.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Resource Person Role', () => resourcePerson.append({ programType: 'FDP', programName: '', topic: '', duration: '', venue: '', organisedBy: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.4 Editorial / Review Roles</h2>
              {editorial.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nature of Contribution</label>
                      <select {...register(`cat3Editorial.${i}.natureOfContrib`)} className={inputCls}>
                        <option>Editorial Board</option><option>Review Committee</option>
                        <option>Org Committee</option><option>Reviewer</option><option>Other</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Organization / Journal</label><input {...register(`cat3Editorial.${i}.orgOrJournal`)} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Scope</label>
                      <select {...register(`cat3Editorial.${i}.scope`)} className={inputCls}>
                        <option value="NATIONAL">National</option><option value="INTERNATIONAL">International</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Date / Duration</label><input {...register(`cat3Editorial.${i}.dateDuration`)} className={inputCls} /></div>
                  </div>
                  <button type="button" onClick={() => editorial.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Editorial Role', () => editorial.append({ natureOfContrib: 'Editorial Board', orgOrJournal: '', scope: 'NATIONAL', dateDuration: '' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.5 Training Attended</h2>
              {training.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Name</label><input {...register(`cat3Training.${i}.name`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Period</label><input {...register(`cat3Training.${i}.period`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Duration (Days)</label><input type="number" {...register(`cat3Training.${i}.durationDays`, { valueAsNumber: true })} className={inputCls} /></div>
                  {proofField(`cat3Training.${i}.proofFile`, 'Certificate')}
                  <button type="button" onClick={() => training.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Training', () => training.append({ name: '', period: '', durationDays: 5 }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">3.6 International Travel</h2>
              {intlTravel.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Purpose</label><input {...register(`cat3IntlTravel.${i}.purpose`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Place / University</label><input {...register(`cat3IntlTravel.${i}.placeOrUniv`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Outcome</label><input {...register(`cat3IntlTravel.${i}.outcome`)} className={inputCls} /></div>
                  <button type="button" onClick={() => intlTravel.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Travel', () => intlTravel.append({ purpose: '', placeOrUniv: '', outcome: '' }))}
            </div>
          </div>
        )}

        {/* Step 4: Governance */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-ink-primary mb-3">4.1 Admin Responsibilities</h2>
              {adminResp.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className={labelCls}>Responsibility</label><input {...register(`cat4AdminResp.${i}.responsibility`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Level</label>
                    <select {...register(`cat4AdminResp.${i}.level`)} className={inputCls}>
                      <option>Institute</option><option>Department</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Work Involved</label><input {...register(`cat4AdminResp.${i}.workInvolved`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Period</label><input {...register(`cat4AdminResp.${i}.period`)} className={inputCls} /></div>
                  <button type="button" onClick={() => adminResp.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Responsibility', () => adminResp.append({ responsibility: '', level: 'Department', workInvolved: '', period: '1 Semester' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">4.2 Student Activities</h2>
              {studentAct.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className={labelCls}>Activity</label><input {...register(`cat4StudentAct.${i}.activityName`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Period</label><input {...register(`cat4StudentAct.${i}.period`)} className={inputCls} /></div>
                  <button type="button" onClick={() => studentAct.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Activity', () => studentAct.append({ activityName: '', period: '' }))}
            </div>
          </div>
        )}

        {/* Step 5: Supplementary */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-ink-primary mb-3">5.1 Memberships</h2>
              {memberships.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className={labelCls}>Association</label><input {...register(`cat5Memberships.${i}.association`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Status</label>
                    <select {...register(`cat5Memberships.${i}.status`)} className={inputCls}>
                      <option value="national_member">National Member</option>
                      <option value="international_member">International Member</option>
                      <option value="national_executive">National Executive</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => memberships.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Membership', () => memberships.append({ association: '', status: 'national_member' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">5.2 Awards</h2>
              {awards.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Award Type</label><input {...register(`cat5Awards.${i}.awardType`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Organization</label><input {...register(`cat5Awards.${i}.organization`)} className={inputCls} /></div>
                  <div><label className={labelCls}>Level</label>
                    <select {...register(`cat5Awards.${i}.level`)} className={inputCls}>
                      <option value="international">International</option>
                      <option value="national">National</option>
                      <option value="state">State</option>
                    </select>
                  </div>
                  {proofField(`cat5Awards.${i}.proofFile`, 'Certificate')}
                  <button type="button" onClick={() => awards.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Award', () => awards.append({ awardType: '', organization: '', level: 'national' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">5.3 Differentiators</h2>
              {differentiators.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-3 gap-3 mb-2">
                  <div><label className={labelCls}>Name</label><input {...register(`cat5Differentiators.${i}.name`)} className={inputCls} /></div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <select {...register(`cat5Differentiators.${i}.role`)} className={inputCls}>
                      <option value="participating">Participating</option>
                      <option value="leading">Leading</option>
                      <option value="initiating">Initiating</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => differentiators.remove(i)} className="text-red-400 text-xs">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Differentiator', () => differentiators.append({ name: '', role: 'participating' }))}
            </div>

            <div>
              <h2 className="font-semibold text-ink-primary mb-3">5.4 Internships</h2>
              {internships.fields.map((field, i) => (
                <div key={field.id} className="border border-surface-border rounded p-3 mb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Industry / Institute</label><input {...register(`cat5Internships.${i}.industryOrInst`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Student Batch</label><input {...register(`cat5Internships.${i}.studentBatch`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Internship Details</label><input {...register(`cat5Internships.${i}.internshipDetails`)} className={inputCls} /></div>
                    <div><label className={labelCls}>Period</label><input {...register(`cat5Internships.${i}.period`)} className={inputCls} /></div>
                  </div>
                  <button type="button" onClick={() => internships.remove(i)} className="text-red-400 text-xs mt-2">Remove</button>
                </div>
              ))}
              {addRowBtn('Add Internship', () => internships.append({ industryOrInst: '', studentBatch: '', internshipDetails: '', period: '' }))}
            </div>
          </div>
        )}

        {/* Step 6: Preview */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-ink-primary mb-1">Preview & Submit</h2>
              <p className="text-sm text-ink-secondary">Auto-saved + scored. Review breakdown below before submitting.</p>
            </div>

            {/* Row counts */}
            <div>
              <h3 className="text-sm font-semibold text-ink-secondary mb-2">Entry Counts</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([
                  ['Cat 1 Courses', courses.fields.length],
                  ['Cat 1 Projects', projects.fields.length],
                  ['Cat 1 e-Content', eContent.fields.length],
                  ['Cat 1 ICT', ict.fields.length],
                  ['Cat 2 Journals', journals.fields.length],
                  ['Cat 2 Conferences', conferences.fields.length],
                  ['Cat 2 Book Chapters', bookChapters.fields.length],
                  ['Cat 2 Books', books.fields.length],
                  ['Cat 2 Patents', patents.fields.length],
                  ['Cat 2 Sponsored Projects', cat2Proj.fields.length],
                  ['Cat 2 Consultancy', consultancy.fields.length],
                  ['Cat 2 PhD Guidance', guidance.fields.length],
                  ['Cat 2 Research Groups', researchGroups.fields.length],
                  ['Cat 2 Linkages', linkages.fields.length],
                  ['Cat 2 Startups', startups.fields.length],
                  ['Cat 3 Programs Organised', organised.fields.length],
                  ['Cat 3 Resource Person', resourcePerson.fields.length],
                  ['Cat 3 Editorial', editorial.fields.length],
                  ['Cat 3 Training', training.fields.length],
                  ['Cat 3 Intl Travel', intlTravel.fields.length],
                  ['Cat 4 Admin Resp', adminResp.fields.length],
                  ['Cat 4 Student Activities', studentAct.fields.length],
                  ['Cat 5 Memberships', memberships.fields.length],
                  ['Cat 5 Awards', awards.fields.length],
                  ['Cat 5 Differentiators', differentiators.fields.length],
                  ['Cat 5 Internships', internships.fields.length],
                ] as [string, number][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between border border-surface-border rounded px-2 py-1.5">
                    <span className="text-ink-secondary">{k}</span>
                    <span className="font-semibold text-ink-primary">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink-secondary">Self-Appraisal Score Breakdown</h3>
                <button type="button" onClick={loadScore} disabled={scoreLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50">
                  {scoreLoading ? 'Computing...' : 'Recompute'}
                </button>
              </div>

              {scoreLoading && !score && <p className="text-sm text-ink-muted">Computing score...</p>}

              {score && (
                <div className="space-y-3">
                  {([
                    ['Category 1 — Teaching', score.cat1, 150, [
                      ['1.1 Lectures', score.cat1.lectures, 40],
                      ['1.2 Attendance/Feedback/Results', score.cat1.attendanceFeedback, 80],
                      ['1.3 Projects', score.cat1.projects, 20],
                      ['1.4 e-Content', score.cat1.eContent, 5],
                      ['1.5 ICT', score.cat1.ict, 5],
                    ]],
                    ['Category 2 — Research', score.cat2, 150, [
                      ['2.1 Publications', score.cat2.publications, 60],
                      ['2.2 Citations', score.cat2.citations, 5],
                      ['2.3 Books', score.cat2.books, 10],
                      ['2.4 Patents', score.cat2.patents, 20],
                      ['2.5 Sponsored Projects', score.cat2.sponsoredProjects, 20],
                      ['2.6 Consultancy', score.cat2.consultancy, 10],
                      ['2.7 Guidance', score.cat2.guidance, 5],
                      ['2.8 Research Groups', score.cat2.researchGroups, 5],
                      ['2.9 Linkages', score.cat2.linkages, 10],
                      ['2.10 Startups', score.cat2.startups, 5],
                    ]],
                    ['Category 3 — Faculty Development', score.cat3, 100, [
                      ['3.1 Advanced Qualification', score.cat3.advQual, 10],
                      ['3.2 Programs Organised', score.cat3.organisedPrograms, 20],
                      ['3.3 Resource Person', score.cat3.resourcePerson, 20],
                      ['3.4 Editorial', score.cat3.editorial, 20],
                      ['3.5 Training', score.cat3.training, 25],
                      ['3.6 International Travel', score.cat3.intlTravel, 5],
                    ]],
                    ['Category 4 — Governance', score.cat4, 50, [
                      ['4.1 Admin Responsibilities', score.cat4.adminResp, 40],
                      ['4.2 Student Activities', score.cat4.studentActivities, 10],
                    ]],
                    ['Category 5 — Supplementary', score.cat5, 50, [
                      ['5.1 Memberships', score.cat5.memberships, 15],
                      ['5.2 Awards', score.cat5.awards, 10],
                      ['5.3 Differentiators', score.cat5.differentiators, 20],
                      ['5.4 Internships', score.cat5.internships, 5],
                    ]],
                  ] as [string, any, number, [string, number, number][]][]).map(([catLabel, catObj, catMax, rows]) => (
                    <div key={catLabel} className="border border-surface-border rounded overflow-hidden">
                      <div className="flex justify-between items-center bg-surface-muted px-3 py-2 border-b border-surface-border">
                        <span className="text-sm font-semibold text-ink-primary">{catLabel}</span>
                        <span className="text-sm font-bold text-primary-700">{catObj.total} / {catMax}</span>
                      </div>
                      <div className="divide-y divide-surface-border">
                        {rows.map(([rk, rv, rm]) => (
                          <div key={rk} className="flex justify-between px-3 py-1.5 text-xs">
                            <span className="text-ink-secondary">{rk}</span>
                            <span className="font-medium text-ink-primary">{rv} / {rm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="bg-primary-50 border border-primary-200 rounded p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-primary-900">Self-Appraisal Total (Cat 1-5)</span>
                    <span className="text-lg font-bold text-primary-900">{score.selfTotal} / 500</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Category 6 (Core Values, max 50) and final Grand Total are filled by HoD/Reviewer and not visible to you per policy.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
              Once submitted, you cannot edit until the reviewer responds.
            </div>
          </div>
        )}

        </fieldset>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-surface-border">
          <button
            type="button"
            onClick={() => goToStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
            className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary disabled:opacity-30"
          >
            <ArrowLeft size={14} /> Previous
          </button>

          <div className="flex gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => saveData()}
                disabled={saving}
                className="text-sm border border-surface-border px-4 py-2 rounded hover:bg-surface-muted disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                disabled={saving}
                className="flex items-center gap-2 text-sm bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : !readOnly ? (
              <button
                type="button"
                onClick={submitAppraisal}
                className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Send size={14} /> Submit Appraisal
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
