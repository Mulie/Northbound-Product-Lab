const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Create submissions directory if it doesn't exist
const submissionsDir = path.join(__dirname, 'submissions');
if (!fs.existsSync(submissionsDir)) {
    fs.mkdirSync(submissionsDir, { recursive: true });
    console.log('✅ Created submissions directory');
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

// Get all submissions (for dashboard)
app.get('/api/submissions', (req, res) => {
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

// Get single submission by ID
app.get('/api/submissions/:id', (req, res) => {
    try {
        const fileName = req.params.id + '.json';
        const filePath = path.join(submissionsDir, fileName);

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

// Delete submission (optional)
app.delete('/api/submissions/:id', (req, res) => {
    try {
        const fileName = req.params.id + '.json';
        const filePath = path.join(submissionsDir, fileName);

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
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   Product Review Studio - Server Running       ║
╠════════════════════════════════════════════════╣
║   Server: http://localhost:${PORT}                 ║
║   Submissions saved to: ./submissions/         ║
╚════════════════════════════════════════════════╝
    `);
});
