/**
 * Submission Split View Controller
 * Provides thin handlers for Details / Dates / Workflow / History pages that
 * replace the old tabbed view. Re-uses existing bcrModel data fetch helpers.
 */
const bcrModel = require('../models/modules/bcr/model');

async function fetchSubmissionData(req) {
  const submissionId = req.params.submissionId;
  const submission = await bcrModel.getSubmissionById(submissionId);
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
}

exports.viewSubmissionDetails = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('bcr/submissions/details', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionDates = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('bcr/submissions/dates', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionWorkflow = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('bcr/submissions/workflow', data);
  } catch (err) {
    next(err);
  }
};

exports.viewSubmissionHistory = async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req);
    res.render('bcr/submissions/history', data);
  } catch (err) {
    next(err);
  }
};
