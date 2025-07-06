/**
 * Submission Split View Controller (Submission module namespace)
 * Provides Details / Dates / Workflow / History pages for a submission.
 */
// IMPORTANT: Access models through the centralized schema registry
const mongoose = require('mongoose');

// Get schema registry and force registration of all models
const schemaRegistry = require('../../../models/schemas');
const models = schemaRegistry.registerAll();

// Get models from registry (these are guaranteed to be registered)
const Submission = models.Submission || mongoose.model('Submission');
const ImpactArea = models.ImpactArea;
const ReferenceDataArea = models.ReferenceDataArea;
const Attachment = models.Attachment;
const RelatedDocument = models.RelatedDocument;

// Verify all models are available
if (!ImpactArea || !ReferenceDataArea || !Attachment || !RelatedDocument) {
  console.error('Critical error: Required models not registered in the splitViewController');
}

async function fetchSubmissionData(req) {
  const submissionId = req.params.submissionId || req.params.id;
  console.log('Fetching submission data for ID:', submissionId);
  
  try {
    // Use our already imported models from the top of the file
    // Skip trying to look up models again - they're already imported
    
    // Verify the model is registered in case Mongoose connection state changed
    if (!mongoose.models.ImpactArea) {
      // Force re-registration if needed
      console.warn('ImpactArea model not found, forcing re-registration');
      // Re-require critical models at runtime if needed
      require('../../../models/ImpactArea');
      require('../../../models/ReferenceDataArea');
      require('../../../models/Attachment');
      require('../../../models/RelatedDocument');
    }
    
    // Perform population with simple syntax first - use explicit model only if needed
    let submission;
    try {
      // Try simple population first
      submission = await Submission.findById(submissionId)
        .populate('impactAreas')
        .populate('affectedReferenceData')
        .populate('relatedDocuments')
        .populate('attachments')
        .lean();
        
      console.log('Population completed with simple syntax');
    } catch (populationError) {
      console.error('Simple population failed, attempting to (re)register schemas then retry with explicit model references:', populationError);
      // Make sure schemas are registered in case the failure was due to a missing model
      const freshModels = schemaRegistry.registerAll();
      const ImpactArea = freshModels.ImpactArea;
      const ReferenceDataArea = freshModels.ReferenceDataArea;
      const RelatedDocument = freshModels.RelatedDocument;
      const Attachment = freshModels.Attachment;
      
      // Fallback to explicit model references
      try {
        submission = await Submission.findById(submissionId)
          .populate({ 
            path: 'impactAreas', 
            model: ImpactArea
          })
        .populate({ 
          path: 'affectedReferenceData', 
          model: ReferenceDataArea
        })
        .populate({ 
          path: 'relatedDocuments', 
          model: RelatedDocument
        })
        .populate({ 
          path: 'attachments', 
          model: Attachment
        })
        .lean();
        console.log('Population completed with explicit model references');
      } catch (castErr) {
        if (castErr.name === 'CastError') {
          console.warn('Populate failed with CastError – returning non-populated submission');
          submission = await Submission.findById(submissionId).lean();
        } else {
          throw castErr;
        }
      }
    }
      


    // Ensure templates can use {{ submission.id }} consistently
    if (submission && submission._id) {
      submission.id = submission._id.toString();
    }
    
    // Map new schema fields to legacy template keys expected by views
    if (submission) {
      submission.title = submission.title || submission.briefDescription || submission.submissionCode;
      submission.description = submission.description || submission.justification || submission.briefDescription;
      submission.submittedBy = submission.submittedBy || submission.fullName;
      // Ensure arrays exist for safe length checks
      submission.impactAreas = submission.impactAreas || [];
      submission.affectedReferenceData = submission.affectedReferenceData || [];
      submission.relatedDocuments = submission.relatedDocuments || [];
      submission.attachments = submission.attachments || [];
    }
    
    if (!submission) {
      const err = new Error('Submission not found');
      err.status = 404;
      throw err;
    }
    
    return {
      title: submission.bcrCode || submission.submissionCode || 'Submission',
      submission,
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    };
  } catch (error) {
    console.error('Error in fetchSubmissionData:', error);
    throw error;
  }
}

exports.viewSubmissionDetails = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('submissions/details', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionDates = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('submissions/dates', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionWorkflow = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('submissions/workflow', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionHistory = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('submissions/history', data);
  } catch (err) {
    next(err);
  }
};
