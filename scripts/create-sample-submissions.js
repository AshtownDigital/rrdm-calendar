/**
 * Script to create 10 sample BCR submissions
 * Tests the submission flow and database creation
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rrdm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Import the Submission model
const Submission = require('../models/Submission');

// First, delete all existing submissions
async function deleteAllSubmissions() {
  try {
    const result = await Submission.deleteMany({});
    console.log(`Deleted ${result.deletedCount} existing submissions`);
  } catch (error) {
    console.error('Error deleting submissions:', error);
    process.exit(1);
  }
}

// Sample BCR submission data
const sampleSubmissions = [
  {
    fullName: 'John Smith',
    emailAddress: 'john.smith@education.gov.uk',
    submissionSource: 'internal',
    organisation: 'Department for Education',
    briefDescription: 'Update to school reference data to include new academy trusts',
    justification: 'New academy trusts need to be added to reference data for accurate reporting',
    urgencyLevel: 'High',
    impactAreas: ['School Data', 'Reporting'],
    affectedReferenceDataArea: 'Academy Trusts',
    technicalDependencies: 'School Data API',
    attachments: 'academy-trusts-list.xlsx',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'Jane Wilson',
    emailAddress: 'j.wilson@serviceprovider.com',
    submissionSource: 'provider',
    organisation: 'Education Service Provider Ltd',
    briefDescription: 'Reference data correction for LA codes in South East region',
    justification: 'Current LA codes contain errors affecting reporting accuracy',
    urgencyLevel: 'Medium',
    impactAreas: ['Local Authority Data'],
    affectedReferenceDataArea: 'LA Codes',
    technicalDependencies: 'LA Database',
    additionalNotes: 'Scheduled quarterly update',
    attachments: 'la-codes-correction.pdf',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'Robert Johnson',
    emailAddress: 'r.johnson@school.edu',
    submissionSource: 'external',
    organisation: 'Springfield Academy',
    briefDescription: 'Request to update institution type classification',
    justification: 'Our school has changed from maintained to academy status',
    urgencyLevel: 'Low',
    impactAreas: ['Institution Data', 'School Types'],
    affectedReferenceDataArea: 'Institution Types',
    relatedDocuments: 'Academy conversion documents attached',
    attachments: 'conversion-approval.pdf',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'Sarah Ahmed',
    emailAddress: 'sarah.ahmed@education-stats.org',
    submissionSource: 'external',
    organisation: 'Education Statistics Authority',
    briefDescription: 'Critical update needed for examination board codes',
    justification: 'New examination boards have been established for the upcoming academic year',
    urgencyLevel: 'Critical',
    impactAreas: ['Examinations', 'Certifications'],
    affectedReferenceDataArea: 'Examination Boards',
    technicalDependencies: 'Certification System',
    attachments: 'new-exam-boards.docx',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'Michael Thompson',
    emailAddress: 'm.thompson@education.gov.uk',
    submissionSource: 'internal',
    organisation: 'Department for Education',
    briefDescription: 'Subject code updates for new curriculum',
    justification: 'New subjects have been added to the national curriculum',
    urgencyLevel: 'Medium',
    impactAreas: ['Curriculum', 'Subjects'],
    affectedReferenceDataArea: 'Subject Codes',
    technicalDependencies: 'Curriculum Database',
    additionalNotes: 'Effective from next academic year',
    attachments: 'new-subject-codes.xlsx',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'Emma Davis',
    emailAddress: 'emma.davis@localauthority.gov.uk',
    submissionSource: 'external',
    organisation: 'Westshire County Council',
    briefDescription: 'Update demographic categories in student records',
    justification: 'New demographic categories needed to comply with updated equality monitoring',
    urgencyLevel: 'Medium',
    impactAreas: ['Student Records', 'Equality Monitoring'],
    affectedReferenceDataArea: 'Demographic Categories',
    attachments: 'equality-monitoring-update.pdf',
    declaration: true,
    status: 'Pending'
  },
  {
    fullName: 'David Williams',
    emailAddress: 'd.williams@education.gov.uk',
    submissionSource: 'internal',
    organisation: 'Department for Education',
    briefDescription: 'Special educational needs classification update',
    justification: 'Updated SEN classifications as per new policy directive',
    urgencyLevel: 'High',
    impactAreas: ['SEN', 'Student Support'],
    affectedReferenceDataArea: 'SEN Classifications',
    technicalDependencies: 'Student Support System',
    relatedDocuments: 'Policy document reference: SEN-2025-001',
    attachments: 'sen-classifications-updated.docx',
    declaration: true,
    status: 'Approved',
    reviewOutcome: 'Approved for implementation',
    reviewComments: 'Changes align with policy directive. Implementation approved.',
    reviewedAt: new Date('2025-05-28')
  },
  {
    fullName: 'Jennifer Lee',
    emailAddress: 'j.lee@curriculum-authority.org',
    submissionSource: 'external',
    organisation: 'National Curriculum Authority',
    briefDescription: 'Addition of new qualification types',
    justification: 'New vocational qualifications being introduced next academic year',
    urgencyLevel: 'Low',
    impactAreas: ['Qualifications', 'Vocational Education'],
    affectedReferenceDataArea: 'Qualification Types',
    additionalNotes: 'Implementation can wait until next term',
    attachments: 'new-qualification-types.xlsx',
    declaration: true,
    status: 'Rejected',
    reviewOutcome: 'Rejected - needs revision',
    reviewComments: 'Submission lacks details on how new qualifications map to existing framework',
    reviewedAt: new Date('2025-06-01')
  },
  {
    fullName: 'Richard Taylor',
    emailAddress: 'r.taylor@dataservices.edu',
    submissionSource: 'provider',
    organisation: 'Education Data Services Inc.',
    briefDescription: 'School calendar reference data update',
    justification: 'Holidays and term dates need updating for next academic year',
    urgencyLevel: 'Medium',
    impactAreas: ['Academic Calendar', 'School Planning'],
    affectedReferenceDataArea: 'Term Dates',
    technicalDependencies: 'Calendar Systems',
    attachments: 'term-dates-2025-26.xlsx',
    declaration: true,
    status: 'In Review'
  },
  {
    fullName: 'Olivia Chen',
    emailAddress: 'o.chen@researchinstitute.ac.uk',
    submissionSource: 'external',
    organisation: 'Educational Research Institute',
    briefDescription: 'Update to educational research topic classifications',
    justification: 'New research areas have emerged requiring categorization in the reference data',
    urgencyLevel: 'Low',
    impactAreas: ['Research', 'Publications'],
    affectedReferenceDataArea: 'Research Categories',
    relatedDocuments: 'Research taxonomy document attached',
    additionalNotes: 'Annual review of research categories',
    attachments: 'research-taxonomy-v2.pdf',
    declaration: true,
    status: 'More Info Required',
    reviewComments: 'Please provide examples of how the new categories will be used in practice'
  }
];

// Main execution function
async function createSampleData() {
  try {
    // First, delete all existing submissions
    await deleteAllSubmissions();
    
    console.log(`Creating ${sampleSubmissions.length} sample submissions...`);
    
    const createdSubmissions = [];
    
    // Create each submission using the model directly
    for (const [index, submissionData] of sampleSubmissions.entries()) {
      try {
        const submission = new Submission(submissionData);
        await submission.save();
        createdSubmissions.push(submission);
        console.log(`Submission ${index + 1} created with ID: ${submission._id} and code: ${submission.submissionCode}`);
      } catch (err) {
        console.error(`Error creating submission ${index + 1}:`, err.message);
      }
    }
    
    if (createdSubmissions.length > 0) {
      console.log(`${createdSubmissions.length} sample submissions created successfully.`);
      // Display the created submission codes
      console.log('Created submission codes:');
      createdSubmissions.forEach(s => {
        console.log(`- ${s.submissionCode}: ${s.briefDescription}`);
      });
    } else {
      console.error('No submissions were created.');
    }

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error in createSampleData:', error);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    process.exit(1);
  }
}

// Start the process
createSampleData();
