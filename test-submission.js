// Test script to verify the submission system works
const testSubmission = {
    fullName: "John Doe",
    jobTitle: "Founder & CEO",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    businessName: "Test Company Inc",
    yearFounded: 2020,
    website: "https://testcompany.com",
    industry: "Technology / SaaS",
    city: "San Francisco",
    province: "California",
    employeeCount: "6-15",
    companyDescription: "We build innovative software solutions for modern businesses.",
    targetCustomer: "Small to medium-sized businesses looking to improve their operations.",
    focusArea: "Our main product dashboard and user onboarding flow.",
    valueProposition: "We help businesses save time and reduce costs through automation.",
    auditGoals: "We want to improve our conversion rate from trial to paid users.",
    productStatus: "yes",
    videoParticipation: "yes",
    acknowledgement: true
};

console.log('Sending test submission...\n');

fetch('http://localhost:3000/api/submit-application', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(testSubmission)
})
    .then(response => response.json())
    .then(data => {
        console.log('✅ SUCCESS!');
        console.log('Response:', data);
        console.log('\nCheck the submissions/ folder for the saved data!');
    })
    .catch(error => {
        console.error('❌ ERROR:', error);
    });
