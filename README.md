Optimized tool selection# Faculty Appraisal System

A comprehensive web-based system for managing faculty appraisals, performance evaluations, and development planning in academic institutions.

## Overview

The Faculty Appraisal System is a full-stack application designed to streamline the faculty evaluation process. It includes features for appraisal management, reviewer assignment, performance scoring, report generation, and email notifications.

## Features

- **User Management**: Role-based access control (Admin, Faculty, Reviewer)
- **Appraisal Management**: Create, update, and manage faculty appraisals
- **Reviewer Assignment**: Dynamic reviewer assignment with customizable workflows
- **FPGP Integration**: Faculty Performance and Growth Planning module
- **Performance Scoring**: Automated scoring engine for consistent evaluation
- **Report Generation**: PDF report generation and analytics
- **Email Notifications**: Automated email reminders and notifications
- **Audit Logging**: Complete audit trail of all system activities
- **File Management**: Bulk CSV import and file upload capabilities
- **Academic Year Management**: Multi-year appraisal cycles
- **Department Management**: Organize faculty by departments

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest
- **Email**: Nodemailer
- **PDF Generation**: PDFKit
- **Monitoring**: Prometheus metrics
- **Authentication**: JWT-based

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS
- **HTTP Client**: Axios
- **State Management**: Custom store (authStore)
- **Development Server**: Vite dev server

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **Monitoring**: Prometheus

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Docker & Docker Compose (for production deployment)
- npm or yarn package manager

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd faculty-appraisal-system
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Setup database
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Install dependencies
npm install
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## Running the Project

### Development Mode

#### Backend
```bash
cd backend
npm run dev
```
Server runs on `http://localhost:5000` (default)

#### Frontend
```bash
cd frontend
npm run dev
```
Application runs on `http://localhost:5173` (Vite default)

### Production Mode with Docker
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Testing

#### Backend Tests
```bash
cd backend
npm run test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Project Structure

```
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── app.ts           # Express app configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── prisma/          # Database schema & migrations
│   │   ├── cron/            # Scheduled tasks
│   │   └── utils/           # Utility functions
│   └── package.json
│
├── frontend/                 # React/Vite frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── api/             # API client calls
│   │   ├── store/           # State management
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── docker-compose.prod.yml   # Production deployment config
├── prometheus.yml            # Prometheus monitoring config
└── docs/                     # Documentation files
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/appraisal_db
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## Key Modules

### Appraisal Management
- Create and manage appraisals for academic years
- Track appraisal status and progress
- Support for multiple review cycles

### FPGP (Faculty Performance & Growth Planning)
- Performance-based template system
- Customizable evaluation criteria
- Growth planning integration

### Scoring Engine
- Automated calculation of performance scores
- Weighted scoring based on criteria
- Consistent evaluation methodology

### Email Notifications
- Automated reminders for pending appraisals
- Notification templates
- Worker-based email processing

### Audit System
- Complete audit trail of all operations
- User activity logging
- System event tracking

## Database Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name migration_name

# View migration status
npx prisma migrate status

# Reset database (development only)
npx prisma migrate reset
```

## API Documentation

API endpoints are documented in the controllers:
- `authController` - Authentication endpoints
- `appraisalController` - Appraisal management
- `reviewController` - Review operations
- `userController` - User management
- `reportController` - Report generation
- `uploadController` - File uploads
- `emailController` - Email operations

## Deployment

Refer to DEPLOYMENT.md for detailed deployment instructions.

## Monitoring

Prometheus metrics are exposed at `/metrics`. Configure Prometheus using prometheus.yml:

```bash
# View metrics
curl http://localhost:5000/metrics
```

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, please contact the development team or refer to TUTORIAL.md for user guides.

## Additional Documentation

- [Low Level Design](.FACULTY_APPRAISAL_SYSTEM_LLD.md)
- [File Upload Plan](.FILE_UPLOAD_PLAN.md)
- [Observability Guide](.OBSERVABILITY.md)
- [Project History](.PROJECT_HISTORY.md)
- [Deployment Guide](.DEPLOYMENT.md)
