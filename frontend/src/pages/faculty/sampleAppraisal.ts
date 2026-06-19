// Sample appraisal data for the "Fill Test Data" button (testing only).
// Shape matches AppraisalEditPage's form (reset() values). Based on the
// Dr V. Baby sample. Remove the button + this file before production.

export const SAMPLE_APPRAISAL = {
  clLeaves: 2, elLeaves: 5, hplLeaves: 0, odLeaves: 3,
  otherLeaves: 'ML: 0', higherQualAcquired: '-',

  // 1.1 Courses — lectures
  cat1Courses: [
    { courseName: 'Programming for Problem Solving', level: 'BTECH', yearSem: 'I B.Tech I Sem', periodPlanned: 48, periodsConducted: 46, novelPedagogyUsed: true, novelPedagogyMethod: 'Chalk and Talk' },
    { courseName: 'Programming for Problem Solving Lab', level: 'BTECH', yearSem: 'I B.Tech I Sem', periodPlanned: 48, periodsConducted: 46, novelPedagogyUsed: true, novelPedagogyMethod: 'Learning by Doing' },
    { courseName: 'Data Structures', level: 'BTECH', yearSem: 'I B.Tech I Sem', periodPlanned: 48, periodsConducted: 47, novelPedagogyUsed: true, novelPedagogyMethod: 'Chalk and Talk' },
    { courseName: 'Data Structures Lab', level: 'BTECH', yearSem: 'I B.Tech I Sem', periodPlanned: 48, periodsConducted: 47, novelPedagogyUsed: true, novelPedagogyMethod: 'Learning by Doing' },
    { courseName: 'Major Project Phase-1', level: 'BTECH', yearSem: 'IV B.Tech I Sem', periodPlanned: 64, periodsConducted: 64, novelPedagogyUsed: true, novelPedagogyMethod: 'Project Based Learning' },
    { courseName: 'Major Project Phase-2', level: 'BTECH', yearSem: 'IV B.Tech II Sem', periodPlanned: 64, periodsConducted: 64, novelPedagogyUsed: true, novelPedagogyMethod: 'Project Based Learning' },
  ],

  // 1.2 Courses — attendance / feedback / results
  cat1CourseResults: [
    { courseName: 'Programming for Problem Solving', classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.7, gradeOAPlus: 40, gradeAB: 28, gradeCD: 2 },
    { courseName: 'Programming for Problem Solving Lab', classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.7, gradeOAPlus: 45, gradeAB: 23, gradeCD: 2 },
    { courseName: 'Data Structures', classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.76, gradeOAPlus: 42, gradeAB: 25, gradeCD: 3 },
    { courseName: 'Data Structures Lab', classSize: 70, attnGte75: 65, attnLt75Gte65: 5, feedbackReceived: 4.6, gradeOAPlus: 45, gradeAB: 22, gradeCD: 3 },
    { courseName: 'Major Project Phase-1', classSize: 70, attnGte75: 70, attnLt75Gte65: 0, feedbackReceived: 4.5, gradeOAPlus: 60, gradeAB: 9, gradeCD: 1 },
    { courseName: 'Major Project Phase-2', classSize: 70, attnGte75: 70, attnLt75Gte65: 0, feedbackReceived: 4.5, gradeOAPlus: 60, gradeAB: 10, gradeCD: 0 },
  ],

  // 1.3 Projects guided
  cat1Projects: [
    { course: 'BTECH', projectType: 'MINI', count: 1 },
    { course: 'BTECH', projectType: 'MAJOR', count: 2 },
    { course: 'MTECH', projectType: 'MAJOR', count: 1 },
  ],

  cat1EContent: [
    { courseName: 'Data Structures', contentName: 'Video Lectures + Quiz', nature: 'Video', evidenceFile: '' },
  ],
  cat1ICT: [
    { courseName: 'Programming for Problem Solving', platform: 'Google Classroom', natureOfUse: 'Assignments', evidenceFile: '' },
  ],

  // 2.1 Journals (all Scopus-indexed)
  cat2Journals: [
    { title: 'Personalized Health Assistance during PCOS using ML', journalName: 'ICACCT 2024', authors: 'V Baby, P Anjusha, J Nelluri', authorPosition: 'First', volume: '2', issueNo: '', pageNos: '3420-3429', dateOfPub: '2024-08-01', issn: '9798331300579', doi: '', impactFactor: 0, indexed: 'SCOPUS', quartile: '', proofFile: '' },
    { title: 'AI based Chatbots for Emotional Health Support', journalName: 'ICACCT 2024', authors: 'V Baby, K Sahith, M Saroj', authorPosition: 'First', volume: '2', issueNo: '', pageNos: '4851-4860', dateOfPub: '2024-08-01', issn: '9798331300579', doi: '', impactFactor: 0, indexed: 'SCOPUS', quartile: '', proofFile: '' },
    { title: 'Emotional Support Systems', journalName: 'Journal of Information Systems Engg & Mgmt', authors: 'V Baby, K Sahith', authorPosition: 'First', volume: '', issueNo: '', pageNos: '525-533', dateOfPub: '2025-03-01', issn: '2468-4376', doi: '', impactFactor: 0, indexed: 'SCOPUS', quartile: '', proofFile: '' },
    { title: 'Intelligent Systems and ML', journalName: 'ISML 2024', authors: 'A Pimpalshende, V Baby', authorPosition: 'First', volume: '', issueNo: '', pageNos: '354-360', dateOfPub: '2025-05-23', issn: '979-8-3503-4387-8', doi: '', impactFactor: 0, indexed: 'SCOPUS', quartile: '', proofFile: '' },
  ],
  cat2Conferences: [
    { title: 'Personalized Health Assistance during PCOS', conferenceName: 'International Conference', authors: 'V Baby et al', authorPosition: 'First', dateOfPub: '2024-06-01', issn: '', doi: '', indexed: 'SCOPUS', proofFile: '' },
    { title: 'AI based Chatbots for Emotional Health', conferenceName: 'International Conference', authors: 'V Baby et al', authorPosition: 'First', dateOfPub: '2024-06-01', issn: '', doi: '', indexed: 'SCOPUS', proofFile: '' },
  ],
  cat2BookChapters: [
    { title: 'Interactive Programming Learning Platform with MEAN Stack', authors: 'V Baby, N V Sailaja, D N Vasundhara', authorPosition: 'First', publisher: 'Taylor & Francis Group', isbn: '9781003472537', chapterNo: '25', isEdited: false, scope: 'INTERNATIONAL' },
  ],
  cat2Books: [],
  cat2Citations: { totalPubsTillDate: 34, pubsWithCitations: 10, totalCitations: 61, hIndexGoogle: 3, hIndexScopus: 2, hIndexWos: 1 },
  cat2Patents: [
    { title: 'Real-Time ML Posture Detection & Exercise Recommendations', country: 'India', inventors: 'VNRVJIET', appNumber: '202541057369 A', status: 'PUBLISHED', dateOfPub: '2025-06-27', dateOfGrant: null, validDuration: '', proofFile: '' },
  ],
  cat2Projects: [],
  cat2Consultancy: [],
  cat2Guidance: [],
  cat2ResearchGroups: [
    { groupName: 'ML and Healthcare RIG', size: 5, outcome: 'Knowledge Sharing' },
  ],
  cat2Linkages: [
    { instituteName: 'IIIT Hyderabad', contactPerson: 'Dr. Anil Kumar', outcome: 'R&D Road Show' },
    { instituteName: 'Pulse Heart Clinic', contactPerson: 'Dr. Mukherjee', outcome: 'Heart disease problem statement' },
  ],
  cat2Startups: [],
  cat2IndustryLinkages: [
    { industryName: 'Enfabrica', contactPerson: 'Giri, CEO', outcome: 'Internships & placements' },
    { industryName: 'GlobalLogic', contactPerson: 'Upasana, HR', outcome: 'Training & placements' },
    { industryName: 'Katalyst India', contactPerson: 'Radha S, Centre Manager', outcome: 'Scholarship & internship' },
  ],

  cat3AdvQual: { registeredForPhD: false, clearedPrePhD: false, thesisSubmitted: false, awarded: false },
  cat3Organised: [
    { title: 'ICACECS 2024', period: '13-14 Aug 2024', sponsor: 'VNRVJIET, Smart Interviews', status: 'Completed', scope: 'INTERNATIONAL' },
    { title: 'Workshop on Cyber Security and Digital Forensics', period: '25-27 Mar 2025', sponsor: 'VNRVJIET', status: 'Completed', scope: 'NATIONAL' },
  ],
  cat3ConferencesAttended: [
    { paperTitle: 'Personalized Health Assistance during PCOS', authors: 'V Baby et al', conferenceName: 'International Conference', period: 'June 2024' },
    { paperTitle: 'AI based Chatbots for Emotional Health', authors: 'V Baby et al', conferenceName: 'International Conference', period: 'June 2024' },
  ],
  cat3ResourcePerson: [
    { programType: 'FDP', programName: 'FDP on Data Structures', topic: 'Trees', duration: '3 hrs', venue: 'VNRVJIET', organisedBy: 'Dept of CSE, VNRVJIET' },
  ],
  cat3Editorial: [
    { natureOfContrib: 'Program Chair', orgOrJournal: 'ICACECS 2024', scope: 'INTERNATIONAL', dateDuration: 'Aug 5-6 2024' },
  ],
  cat3Training: [
    { name: 'Responsible AI - Tour Cohort 2', period: '4 Oct - 4 Nov 2024', durationDays: 30, proofFile: '' },
    { name: 'BFSI Skilling Initiative', period: 'Sep 2024', durationDays: 2, proofFile: '' },
    { name: 'R25 Curriculum Design Workshop', period: 'Jan 2025', durationDays: 2, proofFile: '' },
    { name: 'Introduction to Agentic AI', period: 'Jun 2025', durationDays: 1, proofFile: '' },
  ],
  cat3IntlTravel: [],

  cat4AdminResp: [
    { responsibility: 'HoD', level: 'Department', workInvolved: 'NBA Compliance', period: 'Aug 2024 - Jul 2025' },
    { responsibility: 'HoD', level: 'Department', workInvolved: 'Departmental Administration', period: 'Aug 2024 - Jul 2025' },
    { responsibility: 'HoD', level: 'Department', workInvolved: 'Industry interaction for internships', period: 'Aug 2024 - Jul 2025' },
    { responsibility: 'HoD', level: 'Department', workInvolved: 'Conduction of competitive exams', period: 'Aug 2024 - Jul 2025' },
  ],
  cat4StudentAct: [
    { activityName: 'TuringCup 2025', period: 'Apr 2025' },
    { activityName: 'Design-a-Thon', period: 'Oct 2024' },
  ],

  cat5Memberships: [
    { association: 'CSI', status: 'national_member' },
    { association: 'ISTE', status: 'national_member' },
    { association: 'ISO', status: 'national_member' },
  ],
  cat5Awards: [],
  cat5Differentiators: [
    { name: 'Knowledge Asset', role: 'participating' },
    { name: 'Project Compendium', role: 'participating' },
    { name: 'WIT and WILL', role: 'leading' },
    { name: 'Project Arcade', role: 'leading' },
  ],
  cat5Internships: [
    { industryOrInst: 'GlobalLogic', studentBatch: '46 IV-year students', internshipDetails: 'Java & .NET full stack', period: 'Jan-Apr 2025' },
    { industryOrInst: 'ICRISAT', studentBatch: '8 III-year students', internshipDetails: 'Mail Automation for Scientists', period: 'Jan-Apr 2025' },
  ],
};
