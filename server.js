const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Dashboard password from environment variable
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-z0-9.-]/gi, '_');
        cb(null, `${timestamp}_${sanitizedName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 5 // Max 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'), false);
        }
    }
});

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

// Block access to uploads folder (security)
app.use('/uploads', (req, res) => {
    res.status(403).json({ error: 'Access to uploads folder is forbidden' });
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

// Create traffic data directory
const trafficDir = path.join(__dirname, 'traffic');
if (!fs.existsSync(trafficDir)) {
    fs.mkdirSync(trafficDir, { recursive: true });
    console.log('✅ Created traffic directory');
}

// Traffic data file path
const trafficDataFile = path.join(trafficDir, 'visits.json');

// Initialize traffic data file if it doesn't exist
if (!fs.existsSync(trafficDataFile)) {
    fs.writeFileSync(trafficDataFile, JSON.stringify({ visits: [] }, null, 2));
}

// Helper function to get visitor ID from request (using IP + user agent hash)
function getVisitorId(req) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const str = ip + userAgent;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Helper function to read traffic data
function readTrafficData() {
    try {
        const data = fs.readFileSync(trafficDataFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { visits: [] };
    }
}

// Helper function to write traffic data
function writeTrafficData(data) {
    fs.writeFileSync(trafficDataFile, JSON.stringify(data, null, 2));
}

// Helper function to categorize referrer source
function categorizeReferrer(referrer) {
    if (!referrer || referrer === '' || referrer === 'direct') return 'Direct';
    const ref = referrer.toLowerCase();
    if (ref.includes('google')) return 'Google';
    if (ref.includes('linkedin')) return 'LinkedIn';
    if (ref.includes('twitter') || ref.includes('t.co') || ref.includes('x.com')) return 'Twitter/X';
    if (ref.includes('facebook') || ref.includes('fb.')) return 'Facebook';
    if (ref.includes('instagram')) return 'Instagram';
    if (ref.includes('github')) return 'GitHub';
    if (ref.includes('bing')) return 'Bing';
    if (ref.includes('yahoo')) return 'Yahoo';
    return 'Referral';
}

// Security helper: Validate submission ID to prevent path traversal
function validateSubmissionId(id) {
    // Only allow alphanumeric, hyphens, and underscores
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    return validIdPattern.test(id);
}

// Endpoint to handle form submissions with file uploads
app.post('/api/submit-application', upload.array('files', 5), (req, res) => {
    try {
        const formData = req.body;

        // Generate timestamp and filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const businessName = formData.businessName || 'Unknown';
        const sanitizedBusinessName = businessName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${timestamp}_${sanitizedBusinessName}.json`;
        const filePath = path.join(submissionsDir, fileName);

        // Process uploaded files
        const uploadedFiles = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                uploadedFiles.push({
                    originalName: file.originalname,
                    savedName: file.filename,
                    size: file.size,
                    mimetype: file.mimetype,
                    path: file.path
                });
            });
        }

        // Add metadata to submission
        const submission = {
            submittedAt: new Date().toISOString(),
            submittedDate: new Date().toLocaleString(),
            ...formData,
            files: uploadedFiles
        };

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(submission, null, 2));

        // Also create a summary CSV file (append mode)
        const csvPath = path.join(submissionsDir, 'applications_summary.csv');
        const csvHeaders = 'Timestamp,Name,Email,Phone,Business Name,Industry,Website,Employee Count,Service Interest,Files\n';

        // Create CSV header if file doesn't exist
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, csvHeaders);
        }

        // Append data to CSV
        const fileNames = uploadedFiles.map(f => f.originalName).join('; ');
        const csvRow = `"${submission.submittedDate}","${formData.fullName || ''}","${formData.email || ''}","${formData.phone || ''}","${formData.businessName || ''}","${formData.industry || ''}","${formData.website || ''}","${formData.employeeCount || ''}","${formData.serviceInterest || ''}","${fileNames}"\n`;
        fs.appendFileSync(csvPath, csvRow);

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Application submitted successfully!',
            fileName: fileName,
            filesUploaded: uploadedFiles.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving submission',
            error: error.message
        });
    }
});

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 5 files.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
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

// Contact form submissions
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const contactDir = path.join(submissionsDir, 'contacts');

        if (!fs.existsSync(contactDir)) {
            fs.mkdirSync(contactDir, { recursive: true });
        }

        const fileName = `contact_${timestamp}.json`;
        const filePath = path.join(contactDir, fileName);

        const contact = {
            name,
            email,
            subject: subject || '',
            message,
            submittedAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(contact, null, 2));
        console.log(`New contact submission from: ${email}`);

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, message: 'Error saving message' });
    }
});

// Email signup from popup
app.post('/api/email-signup', (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `email_${timestamp}.json`;
        const filePath = path.join(submissionsDir, 'emails', fileName);

        const emailsDir = path.join(submissionsDir, 'emails');
        if (!fs.existsSync(emailsDir)) {
            fs.mkdirSync(emailsDir, { recursive: true });
        }

        const signup = {
            name: name || '',
            email: email,
            submittedAt: new Date().toISOString(),
            source: 'popup'
        };

        fs.writeFileSync(filePath, JSON.stringify(signup, null, 2));

        const csvPath = path.join(emailsDir, 'email_signups.csv');
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'Timestamp,Name,Email\n');
        }
        fs.appendFileSync(csvPath, `"${signup.submittedAt}","${name || ''}","${email}"\n`);

        console.log(`New email signup: ${email}`);
        res.json({ success: true, message: 'Email saved successfully' });
    } catch (error) {
        console.error('Email signup error:', error);
        res.status(500).json({ success: false, message: 'Error saving email' });
    }
});

// Download website content as ZIP
app.get('/api/download-site', (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="northbound-site.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).json({ error: 'Failed to create archive' });
        });

        archive.pipe(res);

        // Include public website files
        const filesToInclude = [
            'Index.html',
            'services.html',
            'about.html',
            'dashboard.html',
            'dashboard-login.html'
        ];

        filesToInclude.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
            }
        });

        // Include attached_assets folder if it exists
        const assetsDir = path.join(__dirname, 'attached_assets');
        if (fs.existsSync(assetsDir)) {
            archive.directory(assetsDir, 'attached_assets');
        }

        archive.finalize();
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to create download' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Get email signups (for dashboard) - protected
app.get('/api/email-signups', requireDashboardAuth, (req, res) => {
    try {
        const emailsDir = path.join(submissionsDir, 'emails');
        if (!fs.existsSync(emailsDir)) {
            return res.json({ success: true, count: 0, signups: [] });
        }

        const files = fs.readdirSync(emailsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(emailsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                return {
                    id: file.replace('.json', ''),
                    ...data
                };
            })
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        res.json({ success: true, count: files.length, signups: files });
    } catch (error) {
        console.error('Error reading email signups:', error);
        res.status(500).json({ success: false, message: 'Error reading email signups' });
    }
});

// ==========================================
// TRAFFIC TRACKING ENDPOINTS
// ==========================================

// Track page visit (public endpoint)
app.post('/api/track-visit', (req, res) => {
    try {
        const { page, referrer, title } = req.body;

        if (!page) {
            return res.status(400).json({ success: false, message: 'Page is required' });
        }

        const visitorId = getVisitorId(req);
        const now = new Date();

        const visit = {
            page: page.substring(0, 200),
            title: (title || '').substring(0, 200),
            referrer: (referrer || 'direct').substring(0, 500),
            source: categorizeReferrer(referrer),
            visitorId: visitorId,
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
            userAgent: (req.headers['user-agent'] || '').substring(0, 500)
        };

        const trafficData = readTrafficData();
        trafficData.visits.push(visit);

        // Keep only last 90 days of data to prevent file from growing too large
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        trafficData.visits = trafficData.visits.filter(v => new Date(v.timestamp) >= ninetyDaysAgo);

        writeTrafficData(trafficData);

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({ success: false, message: 'Error tracking visit' });
    }
});

// Get traffic statistics (protected - dashboard only)
app.get('/api/traffic-stats', requireDashboardAuth, (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const trafficData = readTrafficData();
        const now = new Date();

        // Calculate date ranges
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - days);

        // Filter visits for current period
        const currentVisits = trafficData.visits.filter(v => new Date(v.timestamp) >= startDate);

        // Filter visits for previous period (for comparison)
        const prevVisits = trafficData.visits.filter(v => {
            const date = new Date(v.timestamp);
            return date >= prevStartDate && date < startDate;
        });

        // Calculate stats
        const totalPageViews = currentVisits.length;
        const uniqueVisitors = new Set(currentVisits.map(v => v.visitorId)).size;
        const prevPageViews = prevVisits.length;
        const prevUniqueVisitors = new Set(prevVisits.map(v => v.visitorId)).size;

        // Calculate bounce rate (single page visits)
        const visitorPages = {};
        currentVisits.forEach(v => {
            if (!visitorPages[v.visitorId]) visitorPages[v.visitorId] = new Set();
            visitorPages[v.visitorId].add(v.page);
        });
        const singlePageVisitors = Object.values(visitorPages).filter(pages => pages.size === 1).length;
        const bounceRate = uniqueVisitors > 0 ? Math.round((singlePageVisitors / uniqueVisitors) * 100) : 0;

        // Previous bounce rate
        const prevVisitorPages = {};
        prevVisits.forEach(v => {
            if (!prevVisitorPages[v.visitorId]) prevVisitorPages[v.visitorId] = new Set();
            prevVisitorPages[v.visitorId].add(v.page);
        });
        const prevSinglePageVisitors = Object.values(prevVisitorPages).filter(pages => pages.size === 1).length;
        const prevBounceRate = prevUniqueVisitors > 0 ? Math.round((prevSinglePageVisitors / prevUniqueVisitors) * 100) : 0;

        // Calculate average session (pages per visitor)
        const avgPagesPerVisitor = uniqueVisitors > 0 ? (totalPageViews / uniqueVisitors).toFixed(1) : 0;
        const prevAvgPages = prevUniqueVisitors > 0 ? (prevPageViews / prevUniqueVisitors).toFixed(1) : 0;

        // Calculate percentage changes
        const pageViewsChange = prevPageViews > 0 ? Math.round(((totalPageViews - prevPageViews) / prevPageViews) * 100) : 0;
        const visitorsChange = prevUniqueVisitors > 0 ? Math.round(((uniqueVisitors - prevUniqueVisitors) / prevUniqueVisitors) * 100) : 0;
        const bounceChange = prevBounceRate > 0 ? Math.round(bounceRate - prevBounceRate) : 0;
        const sessionChange = prevAvgPages > 0 ? Math.round(((avgPagesPerVisitor - prevAvgPages) / prevAvgPages) * 100) : 0;

        // Daily traffic data
        const dailyData = {};
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = { pageViews: 0, visitors: new Set() };
        }

        currentVisits.forEach(v => {
            const dateStr = v.date;
            if (dailyData[dateStr]) {
                dailyData[dateStr].pageViews++;
                dailyData[dateStr].visitors.add(v.visitorId);
            }
        });

        const daily = Object.entries(dailyData).map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            pageViews: data.pageViews,
            visitors: data.visitors.size
        }));

        // Traffic sources
        const sourceCounts = {};
        currentVisits.forEach(v => {
            sourceCounts[v.source] = (sourceCounts[v.source] || 0) + 1;
        });

        const sources = Object.entries(sourceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Top pages
        const pageCounts = {};
        currentVisits.forEach(v => {
            const pageName = v.title || v.page;
            pageCounts[pageName] = (pageCounts[pageName] || 0) + 1;
        });

        const topPages = Object.entries(pageCounts)
            .map(([name, views]) => ({ name, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        // Top referrers
        const referrerCounts = {};
        currentVisits.forEach(v => {
            let ref = v.referrer;
            if (ref && ref !== 'direct') {
                try {
                    const url = new URL(ref);
                    ref = url.hostname;
                } catch (e) {
                    // Use as-is if not a valid URL
                }
            } else {
                ref = 'Direct';
            }
            referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
        });

        const referrers = Object.entries(referrerCounts)
            .map(([source, visits]) => ({ source, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 5);

        res.json({
            success: true,
            stats: {
                pageViews: totalPageViews,
                visitors: uniqueVisitors,
                bounceRate: bounceRate,
                avgSession: avgPagesPerVisitor + ' pages',
                pageViewsChange,
                visitorsChange,
                bounceChange,
                sessionChange
            },
            daily,
            sources,
            topPages,
            referrers
        });
    } catch (error) {
        console.error('Error getting traffic stats:', error);
        res.status(500).json({ success: false, message: 'Error getting traffic stats' });
    }
});

// Comments directory
const commentsDir = path.join(__dirname, 'comments');
if (!fs.existsSync(commentsDir)) {
    fs.mkdirSync(commentsDir, { recursive: true });
}

// Get comments for a blog post
app.get('/api/comments/:postId', (req, res) => {
    try {
        const postId = req.params.postId.replace(/[^a-z0-9-]/gi, '_');
        const filePath = path.join(commentsDir, `${postId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.json({ success: true, comments: [] });
        }
        
        const comments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Error reading comments:', error);
        res.status(500).json({ success: false, message: 'Error reading comments' });
    }
});

// Add a comment to a blog post
app.post('/api/comments/:postId', (req, res) => {
    try {
        const postId = req.params.postId.replace(/[^a-z0-9-]/gi, '_');
        const { name, text } = req.body;
        
        if (!name || !text) {
            return res.status(400).json({ success: false, message: 'Name and comment are required' });
        }
        
        const filePath = path.join(commentsDir, `${postId}.json`);
        let comments = [];
        
        if (fs.existsSync(filePath)) {
            comments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        
        const newComment = {
            id: Date.now().toString(),
            name: name.substring(0, 100),
            text: text.substring(0, 2000),
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            createdAt: new Date().toISOString()
        };
        
        comments.unshift(newComment);
        fs.writeFileSync(filePath, JSON.stringify(comments, null, 2));
        
        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error('Error saving comment:', error);
        res.status(500).json({ success: false, message: 'Error saving comment' });
    }
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
