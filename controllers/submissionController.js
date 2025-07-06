/**
 * Submission module controller – minimal CRUD scaffolding
 * Populates all relationships so Nunjucks templates can access related names.
 */
const Submission = require('../models/Submission');
const ImpactArea = require('../models/ImpactArea');
const ReferenceDataArea = require('../models/ReferenceDataArea');


// Static list of register field enums
const referenceDataFields = [
  { label: 'Funding Method', value: 'BURSLEV' },
  { label: 'Awarding Institution', value: 'DEGEST' },
  { label: 'Degree Grade', value: 'DEGCLSS' },
  { label: 'Degree Type', value: 'DEGTYPE' },
  { label: 'Disability', value: 'DISABLE' },
  { label: 'Degree Country', value: 'DEGCTRY' },
  { label: 'Nationality', value: 'NATION' },
  { label: 'Training Route', value: 'ENTRYRTE' },
  { label: 'Degree Subject', value: 'DEGSBJ' },
  { label: 'Ethnicity', value: 'ETHNIC' },
  { label: 'Fund Code', value: 'FUNDCODE' },
  { label: 'Training Initiative', value: 'INITIATIVES' },
  { label: 'ITT Aim', value: 'ITTAIM' },
  { label: 'Course Age Range', value: 'ITTPHSC' },
  { label: 'Study Mode', value: 'MODE' },
  { label: 'Qualification Aim', value: 'QLAIM' },
  { label: 'Sex', value: 'SEXID' },
  { label: 'Course Subject', value: 'SBJCA' }
];

// Helper – central population rules
const POPULATE_PATHS = [
  { path: 'submittedById', select: 'name email' },
  { path: 'impactAreas' },
  { path: 'affectedReferenceData' }
];

// GET /submissions/:id/details
const details = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate(POPULATE_PATHS).lean({ getters: true, virtuals: true });
    if (!submission) return res.status(404).send('Not found');
    res.render('submissions/details', { submission, title: `Submission ${submission.submissionCode}` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // GET /submissions
  async list(req, res, next) {
    try {
      const submissions = await Submission.find().populate('submittedById', 'name email').lean({ getters: true, virtuals: true });
      res.render('submissions/list', { submissions, title: 'Submissions' });
    } catch (err) {
      next(err);
    }
  },

  details,

  // GET /submissions/new
  async newForm(req, res) {
    // Use consolidated BCR service for consistent data
    const rawImpactAreas = await require('../models/BcrService').getAllImpactAreas();
    const impactAreas = rawImpactAreas.map(area => ({
      id: area._id,
      name: area.name || area.displayName || area.value
    }));
    const refAreas = await ReferenceDataArea.find().lean();
    const referenceDataSelectItems = referenceDataFields.map(f => ({ value: f.value, text: `${f.label} (${f.value})` }));
    res.render('submissions/new', { impactAreas, refAreas, referenceDataSelectItems, title: 'New Submission' });
  },

  // POST /submissions
  async create(req, res, next) {
    try {
      const body = req.body;
      const errors = {};
      const required = ['fullName', 'emailAddress', 'briefDescription', 'justification', 'urgencyLevel', 'submissionSource', 'impactAreas', 'technicalDependencies', 'declaration'];
      required.forEach(f => {
        if (!body[f] || (Array.isArray(body[f]) && body[f].length === 0)) {
          errors[f] = 'This field is required';
        }
      });

      // basic email pattern check
      if (body.emailAddress && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.emailAddress)) {
        errors.emailAddress = 'Enter a valid email address';
      }

      if (Object.keys(errors).length) {
        // Re-fetch enums for re-render
        const rawImpactAreas = await require('../models/BcrService').getAllImpactAreas();
        const impactAreas = rawImpactAreas.map(a => ({ id: a._id, name: a.name }));
        const referenceDataSelectItems = referenceDataFields.map(f => ({ value: f.value, text: `${f.label} (${f.value})` }));
        return res.status(400).render('submissions/new', {
          errors,
          formData: body,
          impactAreas,
          referenceDataSelectItems,
          title: 'New Submission'
        });
      }

      // Remove optional textareas if left blank to avoid ObjectId cast errors
['attachments','relatedDocuments'].forEach(f=>{
      if (body[f] === '' || (Array.isArray(body[f]) && body[f].every(v=>v===''))) {
        delete body[f];
      }
    });

    const submission = new Submission(body);
      await submission.save();
      res.redirect(`/submissions/${submission._id}`);
    } catch (err) {
      next(err);
    }
  },

  // GET /submissions/:id
  async view(req, res, next) {
    try {
      const submission = await Submission.findById(req.params.id).populate(POPULATE_PATHS).lean({ getters: true, virtuals: true });
      if (!submission) return res.status(404).send('Not found');
      res.render('submissions/view', { submission, title: `Submission ${submission.submissionCode}` });
    } catch (err) {
      next(err);
    }
  },

  // GET /submissions/:id/edit
  async editForm(req, res, next) {
    try {
      const submission = await Submission.findById(req.params.id).lean();
      if (!submission) return res.status(404).send('Not found');
      const impactAreas = await ImpactArea.find().lean();
      const refAreas = await ReferenceDataArea.find().lean();
      res.render('submissions/edit', { submission, impactAreas, refAreas, title: 'Edit Submission' });
    } catch (err) {
      next(err);
    }
  },

  // POST /submissions/:id
  async update(req, res, next) {
    try {
      await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.redirect(`/submissions/${req.params.id}`);
    } catch (err) {
      next(err);
    }
  },

  // POST /submissions/:id/delete
  async delete(req, res, next) {
    try {
      await Submission.findByIdAndDelete(req.params.id);
      res.redirect('/submissions');
    } catch (err) {
      next(err);
    }
  }
};
