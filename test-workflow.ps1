$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000/api'

function Login($code, $pw) {
  $body = @{ employeeCode = $code; password = $pw } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType 'application/json'
  return $r.accessToken
}

function Hdrs($tok) { return @{ Authorization = "Bearer $tok" } }

Write-Host "`n=== Step 1: Faculty login (FAC21) ===" -ForegroundColor Cyan
$facTok = Login 'FAC21' 'faculty123'
Write-Host "Token acquired"

Write-Host "`n=== Step 2: Get academic year ===" -ForegroundColor Cyan
$years = Invoke-RestMethod -Uri "$base/academic-years" -Headers (Hdrs $facTok)
$year = $years | Where-Object { $_.label -eq '2025-26' } | Select-Object -First 1
Write-Host "Year ID: $($year.id)  open=$($year.submissionOpen)"

Write-Host "`n=== Step 3: Create draft appraisal ===" -ForegroundColor Cyan
$createBody = @{ academicYearId = $year.id } | ConvertTo-Json
$sub = Invoke-RestMethod -Uri "$base/appraisals" -Method Post -Headers (Hdrs $facTok) -ContentType 'application/json' -Body $createBody
$subId = $sub.id
Write-Host "Created submission #$($sub.submissionNumber) id=$subId"

Write-Host "`n=== Step 4: Fill appraisal data ===" -ForegroundColor Cyan
$updateBody = @{
  leaveData = @{ clLeaves = 5; elLeaves = 8; hplLeaves = 0; odLeaves = 2; otherLeaves = ''; higherQualAcquired = '' }
  categories = @{
    cat1Courses = @(
      @{ courseName = 'Data Structures'; level = 'BTECH'; yearSem = '2-1'; periodPlanned = 60; periodsConducted = 58; avgAttendance = 92; feedbackScore = 4.5; passPercentage = 95; novelPedagogyUsed = $true }
      @{ courseName = 'Algorithms'; level = 'MTECH'; yearSem = '1-2'; periodPlanned = 45; periodsConducted = 44; avgAttendance = 88; feedbackScore = 4.2; passPercentage = 90; novelPedagogyUsed = $false }
    )
    cat1Projects = @(
      @{ course = 'BTECH'; projectType = 'MAJOR'; count = 2 }
      @{ course = 'MTECH'; projectType = 'MAJOR'; count = 1 }
    )
    cat1EContent = @(
      @{ courseName = 'Data Structures'; contentName = 'Sorting Algorithms Video Series'; nature = 'Video'; evidenceFile = 'https://example.com/sort-video' }
    )
    cat1ICT = @(
      @{ courseName = 'Algorithms'; platform = 'Google Classroom'; natureOfUse = 'Assignments'; evidenceFile = '' }
    )
    cat2Journals = @(
      @{ title = 'Novel Graph Traversal Optimization'; journalName = 'IEEE TPDS'; authors = 'Faculty FAC21, et al.'; authorPosition = 'First'; indexed = 'SCI'; impactFactor = 3.5; volume = '34'; issueNo = '6'; pageNos = '120-135'; dateOfPub = '2025-06-15'; quartile = 'Q1'; doi = '10.1109/example'; issn = '1045-9219' }
    )
    cat2Conferences = @(
      @{ title = 'Distributed ML Workshop Paper'; conferenceName = 'NeurIPS Workshop'; authors = 'FAC21'; authorPosition = 'First'; dateOfPub = '2025-12-10'; indexed = 'SCOPUS'; doi = ''; issn = '' }
    )
    cat2Citations = @{ scopusCount = 45; wosCount = 30; hIndex = 6; pubsWithCitations = 8; totalPubsTillDate = 12 }
    cat2Patents = @(
      @{ title = 'Adaptive Caching Method'; country = 'India'; inventors = 'FAC21'; status = 'PUBLISHED'; appNumber = 'IN202541234'; dateOfPub = '2025-05-01'; dateOfGrant = ''; validDuration = '' }
    )
    cat2Projects = @(
      @{ title = 'AI for Healthcare'; fundingAgency = 'DST'; amountLakhs = 15.5; role = 'PI'; status = 'ONGOING'; durationPeriod = '2 years'; dateOfApplication = '2024-08-01' }
    )
    cat2Consultancy = @(
      @{ name = 'Software Audit'; agency = 'TCS'; amountLakhs = 3.2 }
    )
    cat2Guidance = @(
      @{ studentName = 'Student A'; university = 'IIT Delhi'; thesisTitle = 'ML in Networks'; isGuide = $true }
    )
    cat3AdvQual = @{ pursuingPostDoc = $false; phdStatus = 'thesis_submitted'; pursuingPGDegree = $false; pursuingPGDiploma = $false }
    cat3Organised = @(
      @{ title = 'AI Workshop 2025'; period = 'Oct 2025'; sponsor = 'AICTE'; status = 'Completed'; scope = 'NATIONAL' }
    )
    cat3ResourcePerson = @(
      @{ programType = 'FDP'; programName = 'ML for Educators'; topic = 'Deep Learning Basics'; duration = '5 days'; venue = 'IIT Madras'; organisedBy = 'IIT Madras' }
    )
    cat3Training = @(
      @{ name = 'AICTE ATAL FDP'; period = 'July 2025'; durationDays = 6 }
    )
    cat3IntlTravel = @(
      @{ purpose = 'Conference Presentation'; placeOrUniv = 'NeurIPS 2025, Vancouver'; outcome = 'Paper presented' }
    )
    cat4AdminResp = @(
      @{ responsibility = 'Class Coordinator'; level = 'Department'; workInvolved = 'Schedule + attendance'; period = '2 Semesters' }
    )
    cat4StudentAct = @(
      @{ activityName = 'Tech Club Mentor'; period = '2025-26' }
    )
    cat5Memberships = @(
      @{ association = 'IEEE'; status = 'international_member' }
    )
    cat5Awards = @(
      @{ awardType = 'Best Paper'; organization = 'IEEE TPDS'; level = 'international' }
    )
    cat5Differentiators = @(
      @{ name = 'Open-source Library Maintainer'; role = 'initiating' }
    )
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$base/appraisals/$subId" -Method Put -Headers (Hdrs $facTok) -ContentType 'application/json' -Body $updateBody | Out-Null
Write-Host "Data filled across Cat 1-5"

Write-Host "`n=== Step 5: Check faculty score (self-appraisal only) ===" -ForegroundColor Cyan
$score = Invoke-RestMethod -Uri "$base/appraisals/$subId/score" -Headers (Hdrs $facTok)
Write-Host ("Cat1={0}  Cat2={1}  Cat3={2}  Cat4={3}  Cat5={4}  Total={5}" -f $score.cat1.total, $score.cat2.total, $score.cat3.total, $score.cat4.total, $score.cat5.total, $score.selfTotal)

Write-Host "`n=== Step 6: Submit appraisal ===" -ForegroundColor Cyan
$sresp = Invoke-RestMethod -Uri "$base/appraisals/$subId/submit" -Method Post -Headers (Hdrs $facTok)
Write-Host $sresp.message

Write-Host "`n=== Step 7: Reviewer login (FAC11 - REVIEWER for ECE) ===" -ForegroundColor Cyan
$revTok = Login 'FAC11' 'faculty123'
Write-Host "Reviewer token acquired"

Write-Host "`n=== Step 8: List pending reviews ===" -ForegroundColor Cyan
$pending = Invoke-RestMethod -Uri "$base/reviews/pending" -Headers (Hdrs $revTok)
$target = $pending | Where-Object { $_.id -eq $subId }
if ($null -eq $target) { throw "Submission $subId not in reviewer's pending list" }
Write-Host ("Found {0} (faculty {1}, status {2})" -f $target.id, $target.user.employeeCode, $target.status)

Write-Host "`n=== Step 9: Submit review (Cat 6 + comments + APPROVED) ===" -ForegroundColor Cyan
$reviewBody = @{
  cat6Punctuality = 9
  cat6Professionalism = 9
  cat6Willingness = 8
  cat6Cordiality = 10
  cat6Classroom = 9
  teachingComment = 'Strong pedagogy. Consider more peer-learning.'
  researchComment = 'Excellent SCI publication. Push for more Q1 outputs.'
  developmentComment = 'Good FDP engagement.'
  governanceComment = 'Reliable coordinator.'
  supplementaryComment = 'Strong industry visibility through IEEE award.'
  overallComment = 'Excellent year overall. Approved.'
  status = 'APPROVED'
} | ConvertTo-Json
$rresp = Invoke-RestMethod -Uri "$base/appraisals/$subId/review" -Method Post -Headers (Hdrs $revTok) -ContentType 'application/json' -Body $reviewBody
Write-Host $rresp.message

Write-Host "`n=== Step 10: Faculty re-fetches submission - verify visibility rules ===" -ForegroundColor Cyan
$verify = Invoke-RestMethod -Uri "$base/appraisals/$subId" -Headers (Hdrs $facTok)
Write-Host ("Status: {0}" -f $verify.status)
$rev = Invoke-RestMethod -Uri "$base/appraisals/$subId/review" -Headers (Hdrs $facTok)
Write-Host "Comments visible to faculty:"
Write-Host ("  teaching: {0}" -f $rev.teachingComment)
Write-Host ("  research: {0}" -f $rev.researchComment)
Write-Host ("  overall:  {0}" -f $rev.overallComment)
Write-Host "Score fields exposed to faculty (must all be null/undefined):"
Write-Host ("  cat1Score:  {0}" -f $rev.cat1Score)
Write-Host ("  totalScore: {0}" -f $rev.totalScore)
Write-Host ("  grandTotal: {0}" -f $rev.grandTotal)

if ($null -ne $rev.cat1Score -or $null -ne $rev.totalScore -or $null -ne $rev.grandTotal) {
  Write-Host "FAIL: Scores leaked to faculty!" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== Step 11: Reviewer fetches review - sees full scores ===" -ForegroundColor Cyan
$revFull = Invoke-RestMethod -Uri "$base/appraisals/$subId/review" -Headers (Hdrs $revTok)
Write-Host ("Reviewer sees cat1Score={0} totalScore={1} grandTotal={2}" -f $revFull.cat1Score, $revFull.totalScore, $revFull.grandTotal)

Write-Host "`n=== WORKFLOW COMPLETE ===" -ForegroundColor Green
