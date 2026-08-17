import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

// Reports action: navigates to that faculty's uploads page, where HoD/incharge
// can verify/reject each document (the panel self-gates the buttons by role).
// The full faculty-wise list lives at /uploads.
export default function FacultyUploadsButton({ submissionId }: { submissionId: string; facultyName?: string }) {
  return (
    <Link
      to={`/uploads/${submissionId}`}
      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium"
    >
      <FolderOpen size={13} /> Uploads
    </Link>
  );
}
