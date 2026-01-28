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
        console.error('❌ Application submission error:', error);
        res.status(500).json({
            success: false,
            message: `Error saving submission: ${error.message}`,
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

// Blog data directory
const blogDataDir = path.join(__dirname, 'blog-data');
if (!fs.existsSync(blogDataDir)) {
    fs.mkdirSync(blogDataDir, { recursive: true });
    console.log('✅ Created blog-data directory');
}

// ==========================================
// BLOG MANAGEMENT ENDPOINTS
// ==========================================

// Helper function to generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Helper function to estimate read time
function estimateReadTime(content) {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
}

// Helper function to generate blog post HTML
function generateBlogPostHTML(post) {
    const currentDate = new Date(post.publishedAt || post.createdAt);
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="/attached_assets/NPL_Logo_HD_ICON_1764956290133.png">
    <title>${post.title} - Northbound Product Lab</title>
    <meta name="description" content="${post.excerpt}">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.excerpt}">
    <meta property="og:type" content="article">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
            line-height: 1.7;
            color: #1a1a1a;
            background: #ffffff;
            overflow-x: hidden;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }

        .nav-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .nav-wrapper.scrolled {
            background: rgba(10, 10, 10, 0.98);
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }

        .nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 24px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .logo {
            display: flex;
            align-items: center;
            text-decoration: none;
        }

        .logo-img {
            height: 80px;
            width: auto;
            transition: height 0.3s ease;
        }

        .nav-wrapper.scrolled .logo-img {
            height: 60px;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
        }

        .nav-link {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .nav-link:hover,
        .nav-link.active {
            color: #ff6b35;
        }

        .admin-link {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            padding: 8px 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
        }

        .admin-link:hover {
            color: #ff6b35;
            border-color: #ff6b35;
        }

        .mobile-menu-toggle {
            display: none;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
            z-index: 1001;
        }

        .mobile-menu-toggle span {
            display: block;
            width: 24px;
            height: 2px;
            background: #fff;
            margin: 5px 0;
            transition: all 0.3s ease;
        }

        .article-header {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            padding: 10rem 0 4rem;
            position: relative;
            overflow: hidden;
        }

        .article-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%);
            pointer-events: none;
        }

        .article-header .container {
            max-width: 800px;
        }

        .breadcrumb {
            margin-bottom: 2rem;
        }

        .breadcrumb a {
            color: rgba(255, 255, 255, 0.5);
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.2s ease;
        }

        .breadcrumb a:hover {
            color: #ff6b35;
        }

        .article-tag {
            display: inline-block;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%);
            color: #ff6b35;
            padding: 8px 18px;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(255, 107, 53, 0.3);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 1.5rem;
        }

        .article-header h1 {
            font-size: clamp(2.5rem, 6vw, 3.5rem);
            font-weight: 700;
            color: #fff;
            margin-bottom: 1.5rem;
            line-height: 1.15;
        }

        .hero-image {
            width: 100%;
            max-width: 800px;
            height: auto;
            border-radius: 20px;
            margin-top: 2.5rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .article-author {
            color: #ff6b35;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
        }

        .article-meta {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9rem;
        }

        .article-content {
            padding: 4rem 0;
        }

        .article-content .container {
            max-width: 800px;
        }

        .article-content h2 {
            font-size: 1.75rem;
            font-weight: 600;
            margin: 3rem 0 1.5rem;
            color: #1a1a1a;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }

        .article-content h2:first-child {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
        }

        .article-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 2rem 0 1rem;
            color: #1a1a1a;
        }

        .article-content p {
            margin-bottom: 1.5rem;
            color: #444;
            font-size: 1.1rem;
        }

        .article-content ul,
        .article-content ol {
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
        }

        .article-content li {
            margin-bottom: 0.75rem;
            color: #444;
            font-size: 1.1rem;
        }

        .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            margin: 1.5rem 0;
        }

        .article-content a {
            color: #ff6b35;
            text-decoration: none;
        }

        .article-content a:hover {
            text-decoration: underline;
        }

        .article-content blockquote {
            border-left: 4px solid #ff6b35;
            padding-left: 1.5rem;
            margin: 2rem 0;
            font-style: italic;
            color: #666;
        }

        .article-content pre {
            background: #1a1a1a;
            color: #e0e0e0;
            padding: 1.25rem 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
        }

        .article-content code {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
        }

        .share-section {
            background: #f8f8f8;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            margin-top: 3rem;
        }

        .share-section h3 {
            margin-bottom: 1rem;
            color: #1a1a1a;
        }

        .share-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .share-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.75rem;
            border-radius: 100px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .share-btn:hover {
            transform: translateY(-3px);
        }

        .share-btn.twitter {
            background: #1da1f2;
            color: #fff;
        }

        .share-btn.linkedin {
            background: #0077b5;
            color: #fff;
        }

        .share-btn.copy {
            background: #1a1a1a;
            color: #fff;
            cursor: pointer;
            border: none;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #ff6b35;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 100px;
            background: rgba(255, 107, 53, 0.1);
            border: 1px solid rgba(255, 107, 53, 0.2);
            font-weight: 600;
            margin-top: 3rem;
            transition: all 0.3s ease;
        }

        .back-link:hover {
            background: rgba(255, 107, 53, 0.15);
            transform: translateX(-5px);
        }

        .comments-section {
            margin-top: 4rem;
            padding-top: 3rem;
            border-top: 1px solid #eee;
        }

        .comments-section h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 2rem;
            color: #1a1a1a;
        }

        .comment-form {
            background: #f8f8f8;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
        }

        .comment-form label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #333;
        }

        .comment-form input,
        .comment-form textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            margin-bottom: 1rem;
        }

        .comment-form input:focus,
        .comment-form textarea:focus {
            outline: none;
            border-color: #ff6b35;
        }

        .comment-form textarea {
            min-height: 120px;
            resize: vertical;
        }

        .comment-form button {
            background: #ff6b35;
            color: #fff;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .comment-form button:hover {
            background: #e55a2b;
        }

        .comments-list {
            margin-top: 2rem;
        }

        .comment {
            background: #fff;
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }

        .comment-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.75rem;
        }

        .comment-author {
            font-weight: 600;
            color: #1a1a1a;
        }

        .comment-date {
            font-size: 0.85rem;
            color: #888;
        }

        .comment-text {
            color: #444;
            line-height: 1.6;
        }

        .no-comments {
            text-align: center;
            color: #888;
            padding: 2rem;
            font-style: italic;
        }

        footer {
            background: #0a0a0a;
            color: white;
            padding: 4rem 0;
            text-align: center;
        }

        .footer-logo {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            color: #ffffff;
        }

        footer p {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.9rem;
        }

        @media (max-width: 768px) {
            .mobile-menu-toggle {
                display: block;
            }

            .nav-links {
                position: fixed;
                top: 0;
                right: -100%;
                width: 280px;
                height: 100vh;
                background: rgba(10, 10, 10, 0.98);
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 2rem;
                transition: right 0.3s ease;
                padding: 2rem;
            }

            .nav-links.active {
                right: 0;
            }

            .article-header {
                padding: 8rem 0 3rem;
            }

            .share-buttons {
                flex-direction: column;
            }
        }
    </style>
</head>

<body>
    <div class="nav-wrapper" id="navWrapper">
        <nav class="nav">
            <a href="/" class="logo">
                <img src="/attached_assets/NPL_Logo_HD_White_1765582270189.png" alt="Northbound Product Lab" class="logo-img">
            </a>
            <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <div class="nav-links" id="navLinks">
                <a href="/" class="nav-link">Home</a>
                <a href="/services.html" class="nav-link">Services</a>
                <a href="/about.html" class="nav-link">About</a>
                <a href="/blog.html" class="nav-link active">Blog</a>
                <a href="/contact.html" class="nav-link">Contact</a>
                <a href="/dashboard-login.html" class="admin-link">Log in</a>
            </div>
        </nav>
    </div>

    <header class="article-header" id="main-content">
        <div class="container">
            <div class="breadcrumb">
                <a href="/">Home</a>
                <span style="color: rgba(255,255,255,0.3); margin: 0 0.5rem;">/</span>
                <a href="/blog.html">Blog</a>
                <span style="color: rgba(255,255,255,0.3); margin: 0 0.5rem;">/</span>
                <a href="#">This Article</a>
            </div>
            <span class="article-tag">${post.category}</span>
            <h1>${post.title}</h1>
            <p class="article-author">By ${post.author}</p>
            <div class="article-meta">
                <span>${post.readTime}</span>
                <span>•</span>
                <span>Updated ${monthYear}</span>
            </div>
            ${post.heroImage ? `<img src="${post.heroImage}" alt="${post.title}" class="hero-image">` : ''}
        </div>
    </header>

    <article class="article-content">
        <div class="container">
            ${post.content}

            <div class="share-section">
                <h3>Found this helpful? Share it!</h3>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=" class="share-btn twitter" target="_blank" rel="noopener">Share on Twitter</a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=" class="share-btn linkedin" target="_blank" rel="noopener">Share on LinkedIn</a>
                    <button class="share-btn copy" onclick="copyLink()">Copy Link</button>
                </div>
            </div>

            <div class="comments-section">
                <h3>Comments</h3>
                <form class="comment-form" id="commentForm">
                    <label for="commentName">Name</label>
                    <input type="text" id="commentName" name="name" placeholder="Your name" required>

                    <label for="commentText">Comment</label>
                    <textarea id="commentText" name="comment" placeholder="Share your thoughts..." required></textarea>

                    <button type="submit">Post Comment</button>
                </form>

                <div class="comments-list" id="commentsList">
                    <p class="no-comments">Be the first to leave a comment!</p>
                </div>
            </div>

            <a href="/blog.html" class="back-link">← Back to Blog</a>
        </div>
    </article>

    <footer>
        <div class="container">
            <div class="footer-logo">Northbound Product Lab</div>
            <p>&copy; 2026 Northbound Product Lab. All rights reserved.</p>
        </div>
    </footer>

    <script>
        const navWrapper = document.getElementById('navWrapper');
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navWrapper.classList.add('scrolled');
            } else {
                navWrapper.classList.remove('scrolled');
            }
        });

        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');

        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        function copyLink() {
            navigator.clipboard.writeText(window.location.href);
            const btn = document.querySelector('.share-btn.copy');
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = 'Copy Link';
            }, 2000);
        }

        const POST_ID = '${post.slug}';

        async function loadComments() {
            const commentsList = document.getElementById('commentsList');

            try {
                const response = await fetch(\`/api/comments/\${POST_ID}\`);
                const data = await response.json();

                if (!data.success || data.comments.length === 0) {
                    commentsList.innerHTML = '<p class="no-comments">Be the first to leave a comment!</p>';
                    return;
                }

                commentsList.innerHTML = data.comments.map(comment => \`
                    <div class="comment">
                        <div class="comment-header">
                            <span class="comment-author">\${escapeHtml(comment.name)}</span>
                            <span class="comment-date">\${comment.date}</span>
                        </div>
                        <p class="comment-text">\${escapeHtml(comment.text)}</p>
                    </div>
                \`).join('');
            } catch (error) {
                commentsList.innerHTML = '<p class="no-comments">Unable to load comments.</p>';
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        document.getElementById('commentForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('commentName').value.trim();
            const text = document.getElementById('commentText').value.trim();
            const submitBtn = this.querySelector('button');

            if (!name || !text) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            try {
                const response = await fetch(\`/api/comments/\${POST_ID}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, text })
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('commentName').value = '';
                    document.getElementById('commentText').value = '';
                    loadComments();
                }
            } catch (error) {
                alert('Failed to post comment.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Comment';
            }
        });

        loadComments();
    </script>

    <!-- Page View Tracking -->
    <script>
        (function() {
            fetch('/api/track-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: window.location.pathname,
                    title: document.title,
                    referrer: document.referrer || 'direct'
                })
            }).catch(() => {});
        })();
    </script>
</body>

</html>`;
}

// Helper function to generate blog card HTML for blog.html
function generateBlogCardHTML(post) {
    const date = new Date(post.publishedAt || post.createdAt);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return `
            <article class="blog-card animate-in" data-post-slug="${post.slug}">
                <div class="blog-card-content">
                    <span class="blog-card-tag">${post.category}</span>
                    <h2><a href="/blog/${post.slug}.html">${post.title}</a></h2>
                    <p>${post.excerpt}</p>
                    <div class="blog-card-meta">
                        <span>${post.readTime}</span>
                        <span>•</span>
                        <span>${monthYear}</span>
                        <a href="/blog/${post.slug}.html" class="read-more">Read article →</a>
                    </div>
                </div>
            </article>`;
}

// Helper function to update blog.html with new post
function updateBlogListing(post, action = 'add') {
    const blogHtmlPath = path.join(__dirname, 'blog.html');

    if (!fs.existsSync(blogHtmlPath)) {
        console.error('blog.html not found');
        return false;
    }

    let blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');

    if (action === 'add') {
        // Find the blog-list container and add the new card after the container div opening
        const blogContainerMatch = blogHtml.match(/<section class="blog-list">\s*<div class="container">/);
        if (blogContainerMatch) {
            const insertPosition = blogHtml.indexOf(blogContainerMatch[0]) + blogContainerMatch[0].length;
            const newCard = generateBlogCardHTML(post);
            blogHtml = blogHtml.slice(0, insertPosition) + newCard + blogHtml.slice(insertPosition);
        }
    } else if (action === 'remove') {
        // Remove the blog card for this post
        const cardRegex = new RegExp(`\\s*<article class="blog-card[^"]*" data-post-slug="${post.slug}">[\\s\\S]*?</article>`, 'g');
        blogHtml = blogHtml.replace(cardRegex, '');
    }

    fs.writeFileSync(blogHtmlPath, blogHtml);
    return true;
}

// Get all blog posts (protected)
app.get('/api/blog-posts', requireDashboardAuth, (req, res) => {
    try {
        // Ensure directory exists
        if (!fs.existsSync(blogDataDir)) {
            fs.mkdirSync(blogDataDir, { recursive: true });
        }

        const files = fs.readdirSync(blogDataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const filePath = path.join(blogDataDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    return JSON.parse(content);
                } catch (parseError) {
                    console.error(`Error parsing blog post ${file}:`, parseError);
                    return null;
                }
            })
            .filter(post => post !== null)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, posts: files });
    } catch (error) {
        console.error('Error reading blog posts:', error);
        res.status(500).json({ success: false, message: 'Error reading blog posts' });
    }
});

// Create new blog post (protected)
app.post('/api/blog-posts', requireDashboardAuth, (req, res) => {
    try {
        const { title, excerpt, content, category, author, heroImage, status } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required' });
        }

        const slug = generateSlug(title);
        const filePath = path.join(blogDataDir, `${slug}.json`);

        // Check if post with this slug already exists
        if (fs.existsSync(filePath)) {
            return res.status(400).json({ success: false, message: 'A post with this title already exists' });
        }

        const post = {
            slug,
            title,
            excerpt: excerpt || '',
            content,
            category: category || 'Article',
            author: author || 'Muleh Bisrat',
            heroImage: heroImage || '',
            readTime: estimateReadTime(content),
            status: status || 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: null
        };

        fs.writeFileSync(filePath, JSON.stringify(post, null, 2));
        console.log(`✅ Created blog post: ${slug}`);

        res.json({ success: true, post });
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ success: false, message: 'Error creating blog post' });
    }
});

// Get single blog post (protected)
app.get('/api/blog-posts/:slug', requireDashboardAuth, (req, res) => {
    try {
        const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
        const filePath = path.join(blogDataDir, `${slug}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const post = JSON.parse(content);

        res.json({ success: true, post });
    } catch (error) {
        console.error('Error reading blog post:', error);
        res.status(500).json({ success: false, message: 'Error reading blog post' });
    }
});

// Update blog post (protected)
app.put('/api/blog-posts/:slug', requireDashboardAuth, (req, res) => {
    try {
        const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
        const filePath = path.join(blogDataDir, `${slug}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const existingPost = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { title, excerpt, content, category, author, heroImage } = req.body;

        const updatedPost = {
            ...existingPost,
            title: title || existingPost.title,
            excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
            content: content || existingPost.content,
            category: category || existingPost.category,
            author: author || existingPost.author,
            heroImage: heroImage !== undefined ? heroImage : existingPost.heroImage,
            readTime: content ? estimateReadTime(content) : existingPost.readTime,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(updatedPost, null, 2));

        // If post is published, update the HTML file
        if (updatedPost.status === 'published') {
            const htmlPath = path.join(__dirname, 'blog', `${slug}.html`);
            fs.writeFileSync(htmlPath, generateBlogPostHTML(updatedPost));
        }

        console.log(`✅ Updated blog post: ${slug}`);
        res.json({ success: true, post: updatedPost });
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ success: false, message: 'Error updating blog post' });
    }
});

// Delete blog post (protected)
app.delete('/api/blog-posts/:slug', requireDashboardAuth, (req, res) => {
    try {
        const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
        const filePath = path.join(blogDataDir, `${slug}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const post = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Remove HTML file if it exists
        const htmlPath = path.join(__dirname, 'blog', `${slug}.html`);
        if (fs.existsSync(htmlPath)) {
            fs.unlinkSync(htmlPath);
        }

        // Remove from blog.html listing if published
        if (post.status === 'published') {
            updateBlogListing(post, 'remove');
        }

        // Delete the JSON file
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted blog post: ${slug}`);

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ success: false, message: 'Error deleting blog post' });
    }
});

// Publish blog post (protected)
app.post('/api/blog-posts/:slug/publish', requireDashboardAuth, (req, res) => {
    try {
        const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
        const filePath = path.join(blogDataDir, `${slug}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const post = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (post.status === 'published') {
            return res.status(400).json({ success: false, message: 'Post is already published' });
        }

        // Update post status
        post.status = 'published';
        post.publishedAt = new Date().toISOString();
        post.updatedAt = new Date().toISOString();

        // Save updated post data
        fs.writeFileSync(filePath, JSON.stringify(post, null, 2));

        // Generate and save HTML file
        const blogDir = path.join(__dirname, 'blog');
        if (!fs.existsSync(blogDir)) {
            fs.mkdirSync(blogDir, { recursive: true });
        }

        const htmlPath = path.join(blogDir, `${slug}.html`);
        fs.writeFileSync(htmlPath, generateBlogPostHTML(post));

        // Add to blog.html listing
        updateBlogListing(post, 'add');

        console.log(`📢 Published blog post: ${slug}`);
        res.json({ success: true, post, message: 'Post published successfully' });
    } catch (error) {
        console.error('Error publishing blog post:', error);
        res.status(500).json({ success: false, message: 'Error publishing blog post' });
    }
});

// Unpublish blog post (protected)
app.post('/api/blog-posts/:slug/unpublish', requireDashboardAuth, (req, res) => {
    try {
        const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
        const filePath = path.join(blogDataDir, `${slug}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const post = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (post.status !== 'published') {
            return res.status(400).json({ success: false, message: 'Post is not published' });
        }

        // Update post status
        post.status = 'draft';
        post.updatedAt = new Date().toISOString();

        // Save updated post data
        fs.writeFileSync(filePath, JSON.stringify(post, null, 2));

        // Remove HTML file
        const htmlPath = path.join(__dirname, 'blog', `${slug}.html`);
        if (fs.existsSync(htmlPath)) {
            fs.unlinkSync(htmlPath);
        }

        // Remove from blog.html listing
        updateBlogListing(post, 'remove');

        console.log(`📝 Unpublished blog post: ${slug}`);
        res.json({ success: true, post, message: 'Post unpublished successfully' });
    } catch (error) {
        console.error('Error unpublishing blog post:', error);
        res.status(500).json({ success: false, message: 'Error unpublishing blog post' });
    }
})

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
