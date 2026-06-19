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
import * as fpgp from '../controllers/fpgpController';
import * as report from '../controllers/reportController';
import * as email from '../controllers/emailController';
import * as audit from '../controllers/auditController';
import * as upload from '../controllers/uploadController';
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

// Admin force actions
router.get('/appraisals/:id/pdf', authenticate, appraisal.downloadAppraisalPdf);
router.get('/fpgp/:id/pdf', authenticate, fpgp.downloadFpgpPdf);
router.post('/admin/appraisals/:id/unlock', authenticate, roleGuard([RoleType.ADMIN]), review.adminUnlock);
router.post('/admin/appraisals/:id/assign-reviewer', authenticate, roleGuard([RoleType.ADMIN]), review.adminAssignReviewer);

// FPGP v2
router.get('/fpgp/template', authenticate, fpgp.getTemplate);
router.get('/fpgp/me', authenticate, fpgp.getMyPlan);
router.post('/fpgp', authenticate, fpgp.createPlan);
router.put('/fpgp/:id/subsections', authenticate, fpgp.updateSubsections);
router.post('/fpgp/:id/sign', authenticate, fpgp.facultySign);
router.post('/fpgp/:id/hod-sign', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), fpgp.hodSign);
router.get('/fpgp/department', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), fpgp.getDepartmentPlans);
router.post('/fpgp/:id/review', authenticate, roleGuard([RoleType.HOD, RoleType.REVIEWER, RoleType.ADMIN]), fpgp.addReview);
router.post('/fpgp/evaluate', authenticate, roleGuard([RoleType.ADMIN]), fpgp.evaluatePlans);
router.get('/fpgp/:id', authenticate, fpgp.getPlanDetail);

// Reports
router.get('/reports/department', authenticate, roleGuard([RoleType.HOD, RoleType.ADMIN]), report.getDeptReport);
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
