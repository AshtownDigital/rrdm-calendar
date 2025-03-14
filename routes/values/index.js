const express = require('express');
const router = express.Router();
const items = require('../../data/items.json');
const values = require('../../data/values.json');



// Values list route
router.get('/:itemId', (req, res) => {
  const item = items.items.find(item => item.id === req.params.itemId);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  const itemValues = values[req.params.itemId] || [];
  const formattedValues = itemValues.map(value => ({
    name: value.name,
    status: value.status,
    changeType: value.changeType,
    actions: `<a href="/values/${item.id}/${value.id}/history" class="govuk-button govuk-button--secondary">View History</a>`
  }));

  res.render('modules/values/list', {
    title: `${item.name} Values`,
    item,
    values: formattedValues
  });
});

// Value history route
router.get('/:itemId/:valueId/history', (req, res) => {
  const item = items.items.find(item => item.id === req.params.itemId);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested item could not be found.'
    });
  }

  const itemValues = values[req.params.itemId] || [];
  const value = itemValues.find(v => v.id === req.params.valueId);
  if (!value) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested value could not be found.'
    });
  }

  res.render('modules/values/history', {
    title: `${value.name} History`,
    item,
    value,
    history: value.history.map(entry => ({
      ...entry,
      status: entry.status
    }))
  });
});

module.exports = router;
