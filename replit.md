# Product Review Studio - Replit Environment

## Overview
Product Review Studio is a design audit service website with form submission functionality. It allows users to apply for design review services, with submissions saved to local JSON files and CSV summaries.

## Project Architecture

### Technology Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js with Express.js
- **Data Storage**: File-based (JSON + CSV)
- **Port**: 5000 (configured for Replit)

### Project Structure
```
/
├── Index.html              # Main landing page
├── dashboard.html          # Admin dashboard for viewing submissions
├── server.js              # Express server handling API and static files
├── submissions/           # Auto-generated folder for form submissions
│   ├── *.json            # Individual submission files
│   └── applications_summary.csv  # CSV summary of all submissions
└── package.json          # Node.js dependencies
```

## Recent Changes (December 2025)
- **Port Configuration**: Updated from 3000 to 5000 for Replit compatibility
- **Host Binding**: Changed to 0.0.0.0 to work with Replit's proxy
- **Cache Control**: Added no-cache headers to prevent iframe caching issues
- **Security**: Added middleware to block public access to /submissions folder
- **Security**: Added path traversal protection for submission ID parameters
- **Dashboard Fix**: Updated API endpoint from PHP to Node.js (/api/submissions)
- **Environment Setup**: Configured for Replit deployment with autoscale

## Features
1. **Form Submission System**
   - Dual storage: JSON files + CSV summary
   - Timestamp-based file naming
   - Automatic folder creation

2. **API Endpoints**
   - `POST /api/submit-application` - Submit form data
   - `GET /api/submissions` - Get all submissions
   - `GET /api/submissions/:id` - Get single submission
   - `DELETE /api/submissions/:id` - Delete submission
   - `GET /api/health` - Health check

3. **Static File Serving**
   - Serves Index.html as main page
   - Serves dashboard.html for viewing submissions
   - All static assets served with cache-control headers

## Configuration

### Environment Variables
- `PORT`: Server port (defaults to 5000)

### Dependencies
- express: Web server framework
- cors: Cross-origin resource sharing
- body-parser: JSON/form data parsing
- nodemon: Development auto-restart (dev only)

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The application will be available at the Replit webview URL.

## User Preferences
None recorded yet.

## Security
- **Submissions Protection**: Direct HTTP access to `/submissions/*` is blocked via middleware (returns 403)
- **Data Access**: Submission data is only accessible through API endpoints (`/api/submissions`)
- **Git Exclusion**: The submissions folder is gitignored to prevent committing user data
- **Authentication**: Dashboard access is currently open (no authentication implemented)

## Notes
- The server automatically creates the submissions directory if it doesn't exist
- All HTML pages are served from the root directory
- Application is configured for Replit webview URL on port 5000
- Deployment uses autoscale mode (suitable for this stateless website)

## Last Updated
December 2, 2025 - Initial Replit setup
