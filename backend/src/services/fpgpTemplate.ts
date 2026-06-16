// FPGP form template — single source of truth.
// Matches VNRVJIET official "FPGP form for AY 25-26" docx structure.
// Frontend fetches via GET /api/fpgp/template.

export type SubsectionDef =
  | {
      type: 'duoText';
      sub: string;
      label: string;
    }
  | {
      type: 'fixedRows';
      sub: string;
      label: string;
      rowNames: string[];
      extraCols?: ('details' | 'outcome')[];
      extraText?: { key: 'extraText1' | 'extraText2' | 'extraText3'; label: string }[];
      goalLabel?: string; // override 'Goal' header
    }
  | {
      type: 'pgUgRows';
      sub: string;
      label: string;
      pg: string[];
      ug: string[];
    }
  | {
      type: 'dynamicRows';
      sub: string;
      label: string;
      defaultRows?: number;
      hasParticipation?: boolean;
    }
  | {
      type: 'rigGroup';
      sub: string;
      label: string;
    }
  | {
      type: 'phdGuidance';
      sub: string;
      label: string;
    }
  | {
      type: 'memberships';
      sub: string;
      label: string;
      minRows: number;
    };

export const FPGP_TEMPLATE: SubsectionDef[] = [
  // Category 1
  {
    type: 'fixedRows',
    sub: '1.1',
    label:
      'Academic Plan: Novel Student Centric Teaching-Learning methodologies (TLM), e-content development, Students Average Attendance, Success Rate, Innovative conduction of lab experiments mapping to Real world applications, Development of Virtual lab/Experiments (IE), etc.',
    rowNames: ['TLM', 'e-Content', 'Student Average Attendance', 'Success Rate', 'Innovative conduction of Experiments (IE)', 'Others'],
    goalLabel: 'Plan / Goal',
  },
  {
    type: 'pgUgRows',
    sub: '1.2',
    label:
      'Academic Projects (B.Tech./ M.Tech.) — Mini and Major projects/ Summer Internships/ Course Based Projects/ Field projects/ Societal Impact Projects — Indicate brief Areas of Interest to work on projects and mention the outcomes',
    pg: ['Mini Project', 'Major Project'],
    ug: ['Field Project', 'Course Based Project', 'Summer Internship', 'Major Project'],
  },
  {
    type: 'duoText',
    sub: '1.3',
    label: 'Mentoring Activity (Plans for effective mentoring)',
  },

  // Category 2
  {
    type: 'fixedRows',
    sub: '2.1',
    label: 'Journal Research Publications (SCI, Scopus and Web of Science) — Q1, Q2, Q3 & Q4 Journals — Indicate No. of Publications planned.',
    rowNames: ['SCI', 'Scopus', 'Web of Science'],
  },
  {
    type: 'fixedRows',
    sub: '2.2',
    label: 'Conference Research Publications indexed and supported by IEEE / ASME / ASCE / SCI / WoS / SCOPUS / IIT / NIT / National R&D Institutions / Top 500 Universities (QS World University Rankings)',
    rowNames: ['National', 'International'],
  },
  {
    type: 'fixedRows',
    sub: '2.3',
    label: 'Books / Book chapters',
    rowNames: ['Book', 'Book Chapter'],
  },
  {
    type: 'fixedRows',
    sub: '2.4',
    label: 'Patents / Copyrights / Trademarks / any other IPR related works',
    rowNames: ['Patents', 'Copyrights', 'Trademarks', 'Others'],
  },
  {
    type: 'fixedRows',
    sub: '2.5',
    label: 'R&D Activities — Funded / Research Projects',
    rowNames: ['Project proposals', 'Proposals for seed grant from institute', 'Status of granted projects'],
  },
  {
    type: 'fixedRows',
    sub: '2.6',
    label: 'Consultancy projects with Government, Industry and Private sectors',
    rowNames: ['Consultancy projects to be applied', 'Status of ongoing projects', 'No of Industries to be visited'],
    extraText: [{ key: 'extraText1', label: 'Area of Strengths to work on Consultancy Projects' }],
  },
  {
    type: 'fixedRows',
    sub: '2.7',
    label: 'Ph.D. pursuing / Ph.D. yet to register',
    rowNames: ['Status of Ph.D. (Pursuing)', 'Ph.D. register (yet to)'],
    goalLabel: 'Plan',
  },
  {
    type: 'phdGuidance',
    sub: '2.8',
    label: 'Ph.D. Guidance',
  },
  {
    type: 'rigGroup',
    sub: '2.9',
    label: 'Faculty Research Interest Groups / Consultancy Interest Groups (RIGs / CIGs) — Specify Domain research area and expected outcomes',
  },
  {
    type: 'fixedRows',
    sub: '2.10',
    label: 'Association with Industry / R&D / Higher Education Institutions (HEIs)',
    rowNames: ['Industry', 'R & D', 'HEIs', 'Others'],
    extraCols: ['details', 'outcome'],
  },

  // Category 3
  {
    type: 'duoText',
    sub: '3.1',
    label: 'Contribution to Laboratory development / Project development / Research Lab / Industry Labs',
  },
  {
    type: 'memberships',
    sub: '3.2',
    label: 'Professional Society memberships (ex: ASME, CSI, ICI, IEEE, IE(I), IGBC, ISOI, ISTE, SAE, AEA, etc.)',
    minRows: 2,
  },
  {
    type: 'dynamicRows',
    sub: '3.3',
    label: 'Outreach activities',
    defaultRows: 3,
  },
  {
    type: 'dynamicRows',
    sub: '3.4',
    label: 'Faculty/Student Development Programs (FDP, Seminars, Workshops, Conferences, Webinars, Hackathons, Coding Contests, Symposium, Trainings, Certifications etc.)',
    defaultRows: 3,
    hasParticipation: true,
  },
  {
    type: 'dynamicRows',
    sub: '3.5',
    label: 'Participation/Contribution for VNRVJIET differentiators (WIT&WIL, Career Vision Approach, Story Board, VNR Lab Protocol, Show & Tell, Laboratory Management, Open house, Course Based Projects etc.) and development of new initiatives in teaching-learning process and research.',
    defaultRows: 3,
  },
  {
    type: 'dynamicRows',
    sub: '3.6',
    label: 'Innovation, Incubation, Entrepreneurship (VJHUB, Start-ups, etc.)',
    defaultRows: 3,
  },

  // Category 4
  {
    type: 'duoText',
    sub: '4.1',
    label: 'International Travels Planned (through sponsored grants)',
  },
  {
    type: 'dynamicRows',
    sub: '4.2',
    label: 'Any other (specify)',
    defaultRows: 3,
  },
];

// Initial row defaults for a fresh subsection. Used when seeding empty rows on plan create.
export function defaultRowsFor(def: SubsectionDef): any[] {
  if (def.type === 'fixedRows') {
    return def.rowNames.map((name) => ({ name, goal: '', sem1: '', sem2: '', ...(def.extraCols?.reduce((a, c) => ({ ...a, [c]: '' }), {}) ?? {}) }));
  }
  if (def.type === 'pgUgRows') {
    const make = (group: string, name: string) => ({ group, name, area: '', outcome: '', sem1: '', sem2: '' });
    return [...def.pg.map((n) => make('PG', n)), ...def.ug.map((n) => make('UG', n))];
  }
  if (def.type === 'dynamicRows') {
    const cols: any = { name: '', goal: '', sem1: '', sem2: '' };
    if (def.hasParticipation) cols.participation = '';
    return Array.from({ length: def.defaultRows ?? 3 }, () => ({ ...cols }));
  }
  if (def.type === 'rigGroup') {
    return Array.from({ length: 3 }, () => ({ name: '', outcome: '', sem1: '', sem2: '' }));
  }
  if (def.type === 'memberships') {
    return Array.from({ length: def.minRows }, () => ({ name: '', goal: '', sem1: '', sem2: '' }));
  }
  // duoText, phdGuidance — no rows
  return [];
}
