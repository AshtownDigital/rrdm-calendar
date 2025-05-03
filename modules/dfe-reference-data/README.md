# DFE Reference Data Module

This module provides a JavaScript interface to the [DFE Reference Data](https://github.com/DFE-Digital/dfe-reference-data) lists. It is designed to be used as a separate isolated module within the Reference Data Management System.

## Purpose

This module exists to provide a uniform interface to high-quality reference data lists from the Department for Education. It allows the reference data to be used without additional dependencies and provides simple version control of the reference data.

## Features

- Access to DFE Reference Data lists in JavaScript
- Local caching of reference data
- Ability to fetch the latest data from GitHub
- Utility functions for working with reference data
- Support for tweaking reference data for local use

## Installation

The module is designed to be used as a local module within the RRDM application. No separate installation is required.

## Usage

### Basic Usage

```javascript
const dfeReferenceData = require('./modules/dfe-reference-data');

// Get a reference list
async function getCountries() {
  const countries = await dfeReferenceData.getReferenceList(dfeReferenceData.lists.LISTS.COUNTRIES);
  return countries;
}

// Get an item from a reference list
async function getCountry(countryId) {
  const country = await dfeReferenceData.getItemById(dfeReferenceData.lists.LISTS.COUNTRIES, countryId);
  return country;
}

// Get items matching a filter
async function getEUCountries() {
  const euCountries = await dfeReferenceData.getItemsByFilter(
    dfeReferenceData.lists.LISTS.COUNTRIES, 
    { eu_member: true }
  );
  return euCountries;
}
```

### Formatting for Select Dropdowns

```javascript
const dfeReferenceData = require('./modules/dfe-reference-data');

async function getCountriesForSelect() {
  const countries = await dfeReferenceData.getReferenceList(dfeReferenceData.lists.LISTS.COUNTRIES);
  
  // Format for a select dropdown
  const options = dfeReferenceData.utils.formatForSelect(countries, {
    valueField: 'id',
    textField: 'name',
    includeEmpty: true,
    emptyText: 'Select a country'
  });
  
  return options;
}
```

### Tweaking Reference Data

```javascript
const dfeReferenceData = require('./modules/dfe-reference-data');

async function getTweakedCountries() {
  const countries = await dfeReferenceData.getReferenceList(dfeReferenceData.lists.LISTS.COUNTRIES);
  
  // Tweak the reference data
  const tweakedCountries = dfeReferenceData.utils.tweakList(
    countries,
    {
      'GB': { name: 'United Kingdom (Great Britain)' }, // Modify an existing item
      'EU': { id: 'EU', name: 'European Union', type: 'POLITICAL_UNION' } // Add a new item
    }
  );
  
  return tweakedCountries;
}
```

## Available Reference Lists

The module provides access to the following reference lists:

- Common Aggregation Hierarchy
- Countries and Territories
- Degrees
- Equality and Diversity
- Initial Teacher Training
- Qualifications

See the `data-lists.js` file for the complete list of available reference lists.

## Generating JSON Files

To generate JSON files for all reference lists:

```bash
node modules/dfe-reference-data/scripts/generate-json.js
```

This will fetch the latest reference data from GitHub and save it to the `modules/dfe-reference-data/data` directory.

## Integration with RRDM

This module is designed to be integrated with the Reference Data Management System. It can be used in routes, controllers, and views to access reference data.

### Example Integration in a Route

```javascript
const express = require('express');
const router = express.Router();
const dfeReferenceData = require('../../modules/dfe-reference-data');

// Route to display a list of countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await dfeReferenceData.getReferenceList(dfeReferenceData.lists.LISTS.COUNTRIES);
    
    res.render('countries', {
      title: 'Countries',
      countries: countries
    });
  } catch (error) {
    console.error('Error retrieving countries:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to retrieve countries'
    });
  }
});

module.exports = router;
```

## License

This module is provided under the same license as the original DFE Reference Data repository.
