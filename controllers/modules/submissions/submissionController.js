/**
 * Submissions Controller (stand-alone module)
 *
 * In the first phase of separating submissions from the BCR module we simply
 * proxy to the existing `bcrController` methods.  This keeps behaviour stable
 * while we migrate templates and refactor logic later.
 */

const bcrController = require('../../bcrController');

// Directly re-export the submission-related handlers
function wrap(handler) {
  return function (req, res, next) {
    const originalRender = res.render.bind(res);
    res.render = (view, options, callback) => {
      if (typeof view === 'string') {
        if (view.startsWith('bcr/submissions/')) {
          view = view.replace('bcr/submissions/', 'submissions/');
        } else if (view.startsWith('bcr/dashboard/')) {
          view = view.replace('bcr/dashboard/', 'submissions/dashboard/');
        }
      }
      return originalRender(view, options, callback);
    };
    return handler(req, res, next);
  };
}

module.exports = {
  // Listing & dashboards
  listSubmissions: wrap(bcrController.listSubmissions),
  submissionDashboard: wrap(bcrController.dashboard),

  // CRUD
  newSubmissionForm: wrap(bcrController.newSubmissionForm),
  createSubmission: wrap(bcrController.createSubmission),
  editSubmissionForm: wrap(bcrController.editSubmissionForm || bcrController.editSubmissionForm),
  updateSubmission: wrap(bcrController.updateSubmission || bcrController.updateSubmission),
  deleteSubmissionConfirm: wrap(bcrController.deleteSubmissionConfirm || bcrController.deleteSubmissionConfirm),
  deleteSubmission: wrap(bcrController.deleteSubmission || bcrController.deleteSubmission),

  // View / details
  viewSubmission: wrap(bcrController.viewSubmission),
};
