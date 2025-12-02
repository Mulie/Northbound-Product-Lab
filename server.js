const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Dashboard password from environment variable
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware for dashboard authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'northbound-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Block access to submissions folder (security)
app.use('/submissions', (req, res) => {
    res.status(403).json({ error: 'Access to submissions folder is forbidden' });
});

// Dashboard authentication middleware
function requireDashboardAuth(req, res, next) {
    if (req.session && req.session.dashboardAuthenticated) {
        return next();
    }
    res.redirect('/dashboard-login.html');
}

// Protect dashboard.html
app.get('/dashboard.html', requireDashboardAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Dashboard login endpoint
app.post('/api/dashboard-login', (req, res) => {
    const { password } = req.body;
    
    if (password === DASHBOARD_PASSWORD) {
        req.session.dashboardAuthenticated = true;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Dashboard logout endpoint
app.post('/api/dashboard-logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check if dashboard is authenticated
app.get('/api/dashboard-auth-status', (req, res) => {
    res.json({ 
        authenticated: !!(req.session && req.session.dashboardAuthenticated) 
    });
});

// Serve static files (HTML, CSS, JS) with Cache-Control headers
app.use(express.static(__dirname, {
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));

// Redirect root to Index.html
app.get('/', (req, res) => {
    res.redirect('/Index.html');
});

// Create submissions directory if it doesn't exist
const submissionsDir = path.join(__dirname, 'submissions');
if (!fs.existsSync(submissionsDir)) {
    fs.mkdirSync(submissionsDir, { recursive: true });
    console.log('✅ Created submissions directory');
}

// Security helper: Validate submission ID to prevent path traversal
function validateSubmissionId(id) {
    // Only allow alphanumeric, hyphens, and underscores
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    return validIdPattern.test(id);
}

// Endpoint to handle form submissions
app.post('/api/submit-application', (req, res) => {
    try {
        const formData = req.body;
        console.log('📩 Received application submission');

        // Generate timestamp and filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const businessName = formData.businessName || 'Unknown';
        const sanitizedBusinessName = businessName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${timestamp}_${sanitizedBusinessName}.json`;
        const filePath = path.join(submissionsDir, fileName);

        // Add metadata to submission
        const submission = {
            submittedAt: new Date().toISOString(),
            submittedDate: new Date().toLocaleString(),
            ...formData
        };

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(submission, null, 2));
        console.log(`✅ Saved submission to: ${fileName}`);

        // Also create a summary CSV file (append mode)
        const csvPath = path.join(submissionsDir, 'applications_summary.csv');
        const csvHeaders = 'Timestamp,Name,Email,Phone,Business Name,Industry,Website,Employee Count\n';

        // Create CSV header if file doesn't exist
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, csvHeaders);
        }

        // Append data to CSV
        const csvRow = `"${submission.submittedDate}","${formData.fullName || ''}","${formData.email || ''}","${formData.phone || ''}","${formData.businessName || ''}","${formData.industry || ''}","${formData.website || ''}","${formData.employeeCount || ''}"\n`;
        fs.appendFileSync(csvPath, csvRow);

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Application submitted successfully!',
            fileName: fileName
        });

    } catch (error) {
        console.error('❌ Error saving submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving submission',
            error: error.message
        });
    }
});

// Get all submissions (for dashboard) - protected
app.get('/api/submissions', requireDashboardAuth, (req, res) => {
    try {
        const files = fs.readdirSync(submissionsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(submissionsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                return {
                    id: file.replace('.json', ''),
                    fileName: file,
                    ...data
                };
            })
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // Newest first

        res.json({
            success: true,
            count: files.length,
            submissions: files
        });
    } catch (error) {
        console.error('❌ Error reading submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error reading submissions',
            error: error.message
        });
    }
});

// Get single submission by ID - protected
app.get('/api/submissions/:id', requireDashboardAuth, (req, res) => {
    try {
        // Validate ID to prevent path traversal
        if (!validateSubmissionId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const fileName = req.params.id + '.json';
        const filePath = path.join(submissionsDir, fileName);

        // Additional security check: ensure resolved path is within submissions directory
        const resolvedPath = path.resolve(filePath);
        const resolvedSubmissionsDir = path.resolve(submissionsDir);
        if (!resolvedPath.startsWith(resolvedSubmissionsDir)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        res.json({
            success: true,
            submission: {
                id: req.params.id,
                fileName: fileName,
                ...data
            }
        });
    } catch (error) {
        console.error('❌ Error reading submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error reading submission',
            error: error.message
        });
    }
});

// Delete submission (optional) - protected
app.delete('/api/submissions/:id', requireDashboardAuth, (req, res) => {
    try {
        // Validate ID to prevent path traversal
        if (!validateSubmissionId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const fileName = req.params.id + '.json';
        const filePath = path.join(submissionsDir, fileName);

        // Additional security check: ensure resolved path is within submissions directory
        const resolvedPath = path.resolve(filePath);
        const resolvedSubmissionsDir = path.resolve(submissionsDir);
        if (!resolvedPath.startsWith(resolvedSubmissionsDir)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted submission: ${fileName}`);

        res.json({
            success: true,
            message: 'Submission deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting submission',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   Northbound Product Lab - Server Running       ║
╠════════════════════════════════════════════════╣
║   Server: http://${HOST}:${PORT}                    ║
║   Submissions saved to: ./submissions/         ║
╚════════════════════════════════════════════════╝
    `);
});
