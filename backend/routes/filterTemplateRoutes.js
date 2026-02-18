const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getFilterTemplates,
    getFilterTemplateById,
    createFilterTemplate,
    updateFilterTemplate,
    deleteFilterTemplate,
    setDefaultTemplate,
    applyTemplate
} = require('../controllers/filterTemplateController');

// All routes require authentication
router.use(protect);

// CRUD operations
router.route('/')
    .get(getFilterTemplates)      // GET /api/v1/filter-templates
    .post(createFilterTemplate);   // POST /api/v1/filter-templates

router.route('/:id')
    .get(getFilterTemplateById)    // GET /api/v1/filter-templates/:id
    .put(updateFilterTemplate)     // PUT /api/v1/filter-templates/:id
    .delete(deleteFilterTemplate); // DELETE /api/v1/filter-templates/:id

// Special actions
router.put('/:id/set-default', setDefaultTemplate);  // Set as default template
router.post('/:id/apply', applyTemplate);            // Track usage when applied

module.exports = router;
