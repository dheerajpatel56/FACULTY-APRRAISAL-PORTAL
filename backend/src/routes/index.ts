import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import { proofUpload } from '../middleware/upload';
import { reviewerGuard } from '../middleware/reviewerGuard';
import { RoleType } from '@prisma/client';

import * as auth from '../controllers/authController';
import * as user from '../controllers/userController';
import * as dept from '../controllers/departmentController';
import * as year from '../controllers/academicYearController';
import * as appraisal from '../controllers/appraisalController';
import * as review from '../controllers/reviewController';
import * as report from '../controllers/reportController';
import * as email from '../controllers/emailController';
import * as audit from '../controllers/auditController';
import * as upload from '../controllers/uploadController';
import * as cadreTarget from '../controllers/cadreTargetController';
import * as cadreTier from '../controllers/cadreTierController';
import * as reviewWindow from '../controllers/reviewWindowController';
import * as verification from '../controllers/verificationController';
import * as tracking from '../controllers/trackingController';
import * as feedback from '../controllers/feedbackController';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Wrap multer middleware to turn upload errors into clean 400 JSON
function handleUpload(req: Request, res: Response, next: NextFunction) {
  proofUpload.single('file')(req, res, (err: any) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB)' : err.message)
        : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

const router = Router();

// Auth
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', authenticate, auth.logout);
router.post('/auth/forgot-password', otpLimiter, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, auth.resetPassword);

// User profile
router.get('/users/me', authenticate, user.getMe);
router.put('/users/me/profile', authenticate, user.updateProfile);
router.post('/users/me/password-otp', authenticate, otpLimiter, user.requestPasswordOtp);
router.post('/users/me/change-password', authenticate, user.changePasswordWithOtp);

// Admin: user management
router.get('/admin/users', authenticate, roleGuard([RoleType.ADMIN]), user.listUsers);
router.post('/admin/users', authenticate, roleGuard([RoleType.ADMIN]), user.createUser);
router.put('/admin/users/:id', authenticate, roleGuard([RoleType.ADMIN]), user.updateUser);
router.delete('/admin/users/:id', authenticate, roleGuard([RoleType.ADMIN]), user.deleteUser);
router.post('/admin/users/:id/roles', authenticate, roleGuard([RoleType.ADMIN]), user.assignRole);
router.delete('/admin/users/:id/roles/:roleId', authenticate, roleGuard([RoleType.ADMIN]), user.revokeRole);
router.get('/admin/users/bulk-import/template', authenticate, roleGuard([RoleType.ADMIN]), user.bulkImportTemplate);
router.post('/admin/users/bulk-import', authenticate, roleGuard([RoleType.ADMIN]), user.bulkImportUsers);

// Admin: departments
router.get('/admin/departments', authenticate, dept.listDepartments);
router.post('/admin/departments', authenticate, roleGuard([RoleType.ADMIN]), dept.createDepartment);
router.put('/admin/departments/:id', authenticate, roleGuard([RoleType.ADMIN]), dept.updateDepartment);
router.delete('/admin/departments/:id', authenticate, roleGuard([RoleType.ADMIN]), dept.deleteDepartment);

// Public departments (for forms)
router.get('/departments', authenticate, dept.listDepartments);

// Public: academic years (any auth user, for dropdowns)
router.get('/academic-years', authenticate, year.listAcademicYears);

// Admin: academic years
router.get('/admin/academic-years', authenticate, roleGuard([RoleType.ADMIN]), year.listAcademicYears);
router.post('/admin/academic-years', authenticate, roleGuard([RoleType.ADMIN]), year.createAcademicYear);
router.put('/admin/academic-years/:id', authenticate, roleGuard([RoleType.ADMIN]), year.updateAcademicYear);

// Admin: cadre eligibility targets (W1)
router.get('/admin/cadre-targets', authenticate, roleGuard([RoleType.ADMIN]), cadreTarget.listCadreTargets);
router.post('/admin/cadre-targets', authenticate, roleGuard([RoleType.ADMIN]), cadreTarget.createCadreTarget);
router.post('/admin/cadre-targets/seed-defaults', authenticate, roleGuard([RoleType.ADMIN]), cadreTarget.seedDefaultCadreTargets);
router.put('/admin/cadre-targets/:id', authenticate, roleGuard([RoleType.ADMIN]), cadreTarget.updateCadreTarget);
router.delete('/admin/cadre-targets/:id', authenticate, roleGuard([RoleType.ADMIN]), cadreTarget.deleteCadreTarget);

// Admin: per-cadre tier thresholds (W7)
router.get('/admin/cadre-tiers', authenticate, roleGuard([RoleType.ADMIN]), cadreTier.listCadreTiers);
router.put('/admin/cadre-tiers', authenticate, roleGuard([RoleType.ADMIN]), cadreTier.upsertCadreTier);
router.post('/admin/cadre-tiers/seed-defaults', authenticate, roleGuard([RoleType.ADMIN]), cadreTier.seedDefaultCadreTiers);
router.delete('/admin/cadre-tiers/:id', authenticate, roleGuard([RoleType.ADMIN]), cadreTier.deleteCadreTier);

// Appraisals
router.get('/appraisals', authenticate, appraisal.listAppraisals);
router.post('/appraisals', authenticate, appraisal.createAppraisal);
router.get('/appraisals/:id', authenticate, appraisal.getAppraisal);
router.put('/appraisals/:id', authenticate, appraisal.updateAppraisal);
router.post('/appraisals/:id/submit', authenticate, appraisal.submitAppraisal);
router.post('/appraisals/:id/withdraw', authenticate, appraisal.withdrawAppraisal);
router.get('/appraisals/:id/score', authenticate, appraisal.getScore);

// Reviews
router.get('/reviews/pending', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), review.listPendingReviews);
router.post('/appraisals/:id/review', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), reviewerGuard, review.submitReview);
router.get('/appraisals/:id/review', authenticate, review.getReview);

// W2 — proof verification + red-list
router.get('/appraisals/:id/proofs', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), verification.listProofs);
router.post('/appraisals/:id/proofs/verify', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), verification.verifyProof);
router.get('/red-list', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), verification.listRedList);
router.post('/appraisals/:id/clear-hold', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), verification.clearHold);

// W3 — criteria tracking / tier / eligibility
router.get('/tracking', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), tracking.getTracking);
// W5 — segregated cadre+tier report export
router.get('/tracking/export', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), tracking.exportTracking);
// W4 — quarterly snapshot manual trigger (cron runs it at quarter-end)
router.post('/admin/tracking/snapshot', authenticate, roleGuard([RoleType.ADMIN]), tracking.runSnapshot);

// W8 — admin-configured quarterly review windows (automation fires on end date)
router.get('/admin/review-windows', authenticate, roleGuard([RoleType.ADMIN]), reviewWindow.listReviewWindows);
router.put('/admin/review-windows', authenticate, roleGuard([RoleType.ADMIN]), reviewWindow.upsertReviewWindow);
router.delete('/admin/review-windows/:id', authenticate, roleGuard([RoleType.ADMIN]), reviewWindow.deleteReviewWindow);

// W6 — annual HoD feedback
router.get('/appraisals/:id/feedback', authenticate, feedback.getFeedback);
router.put('/appraisals/:id/feedback', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), feedback.saveFeedback);
router.post('/appraisals/:id/feedback/issue', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), feedback.issueFeedback);

// Admin force actions
router.get('/appraisals/:id/pdf', authenticate, appraisal.downloadAppraisalPdf);
router.post('/admin/appraisals/:id/unlock', authenticate, roleGuard([RoleType.ADMIN]), review.adminUnlock);
router.post('/admin/appraisals/:id/assign-reviewer', authenticate, roleGuard([RoleType.ADMIN]), review.adminAssignReviewer);

// FPGP v2 — routes retired (module off; controller + data kept, unreachable).

// Reports
router.get('/reports/department', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), report.getDeptReport);
router.get('/reports/criteria', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), report.getCriteriaReport);
router.get('/reports/institute', authenticate, roleGuard([RoleType.ADMIN]), report.getInstituteReport);
router.get('/reports/export', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), report.exportReport);

// Admin: email notifications
router.get('/admin/emails', authenticate, roleGuard([RoleType.ADMIN]), email.listEmails);
router.post('/admin/emails/:id/retry', authenticate, roleGuard([RoleType.ADMIN]), email.retryEmail);
router.post('/admin/emails/trigger', authenticate, roleGuard([RoleType.ADMIN]), email.manualTrigger);

// File upload (proof attachments) — any authenticated user
router.post('/uploads/proof', authenticate, handleUpload, upload.uploadProof);
router.delete('/uploads/proof', authenticate, upload.deleteProof);
router.get('/uploads/file/:filename', authenticate, upload.serveProof);

// Admin: audit log
router.get('/admin/audit', authenticate, roleGuard([RoleType.ADMIN]), audit.listAuditLogs);
router.get('/admin/audit/actions', authenticate, roleGuard([RoleType.ADMIN]), audit.listAuditActions);

export default router;
