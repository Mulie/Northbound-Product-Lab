# Northbound Product Lab - Replit Environment

## Overview
Northbound Product Lab is a design audit service website with form submission functionality. It allows users to apply for design review services, with submissions saved to local JSON files and CSV summaries.

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
├── services.html           # Services page showcasing 6 core offerings
├── dashboard.html          # Admin dashboard for viewing submissions
├── dashboard-login.html    # Login page for dashboard access
├── server.js              # Express server handling API and static files
├── submissions/           # Auto-generated folder for form submissions
│   ├── *.json            # Individual submission files
│   └── applications_summary.csv  # CSV summary of all submissions
└── package.json          # Node.js dependencies
```

## Recent Changes (December 2025)
- **Services Page**: Added dedicated services.html page with 6 core service offerings:
  1. Revenue Impact Audit
  2. UX/UI Performance Evaluation
  3. Conversion Optimization Sprint
  4. Product Experience Redesign
  5. Experimentation & A/B Testing Support
  6. Founder & Product Team Advisory
- **Navigation**: Added site-wide navigation with Home, Services, and Log in links
- **Animated Beams Background**: Added canvas-based animated beams to hero sections
- **Animation Refinements**: Subtle, settled animations (2-3px movements, reduced timing)
- **Content Streamlining**: Shortened all section copy for better readability
- **Form Simplification**: Reduced form from 20+ fields to 10 essential fields
  - Removed: Additional Participants, Supporting Materials sections
  - Simplified: Business info, audit goals, scheduling options
- **Code Cleanup**: Removed all debug console.log statements for production
- **Branding Fix**: Updated all "Product Review Studio" references to "Northbound Product Lab"
- **Dashboard Authentication**: Added password-protected admin dashboard
- **Port Configuration**: Updated from 3000 to 5000 for Replit compatibility
- **Host Binding**: Changed to 0.0.0.0 to work with Replit's proxy
- **Cache Control**: Added no-cache headers to prevent iframe caching issues
- **Security**: Added middleware to block public access to /submissions folder

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
- **Data Access**: Submission data is only accessible through authenticated API endpoints (`/api/submissions`)
- **Git Exclusion**: The submissions folder is gitignored to prevent committing user data
- **Dashboard Authentication**: Password-protected access using session-based authentication
  - Login page: `/dashboard-login.html`
  - Password stored securely as `DASHBOARD_PASSWORD` environment secret
  - Session expires after 24 hours
  - Logout button available in dashboard header

## Notes
- The server automatically creates the submissions directory if it doesn't exist
- All HTML pages are served from the root directory
- Application is configured for Replit webview URL on port 5000
- Deployment uses autoscale mode (suitable for this stateless website)

## Last Updated
December 3, 2025 - Added services page and site-wide navigation
