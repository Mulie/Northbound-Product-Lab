-- Product Review Studio Database Schema
-- For InfinityFree MySQL Database

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Contact Information
    full_name VARCHAR(255),
    job_title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Additional Participants
    participant2_name VARCHAR(255),
    participant2_title VARCHAR(255),
    participant2_email VARCHAR(255),

    -- Business Information
    business_name VARCHAR(255),
    operating_name VARCHAR(255),
    year_founded INT,
    website VARCHAR(500),
    industry VARCHAR(255),
    city VARCHAR(255),
    province VARCHAR(255),
    employee_count VARCHAR(50),
    contractor_count INT,
    revenue VARCHAR(50),

    -- Descriptions
    company_description TEXT,
    target_customer TEXT,
    focus_area TEXT,
    value_proposition TEXT,
    audit_goals TEXT,

    -- Product & Logistics
    product_status VARCHAR(50),
    video_participation VARCHAR(10),
    video_exception TEXT,
    preferred_timing VARCHAR(100),
    other_timing VARCHAR(255),
    supporting_materials TEXT,

    -- Acknowledgement
    acknowledgement BOOLEAN DEFAULT 0,

    -- Metadata
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for faster queries
    INDEX idx_email (email),
    INDEX idx_business_name (business_name),
    INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Create a view for quick summary
CREATE OR REPLACE VIEW submissions_summary AS
SELECT
    id,
    full_name,
    email,
    phone,
    business_name,
    industry,
    website,
    employee_count,
    DATE_FORMAT(submitted_at, '%m/%d/%Y %h:%i:%s %p') as submitted_date
FROM submissions
ORDER BY submitted_at DESC;
