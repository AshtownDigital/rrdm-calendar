/**
 * BCR Filters Component
 * 
 * This module provides enhanced filtering capabilities for BCR submissions.
 * It allows for dynamic filtering, saving filter preferences, and advanced search.
 */

/**
 * Set up BCR filters functionality
 */
export function setupBcrFilters() {
  const filterForm = document.querySelector('.bcr-filters-form');
  
  if (!filterForm) {
    return;
  }
  
  // Initialize filter state
  initializeFilterState();
  
  // Set up filter change handlers
  setupFilterChangeHandlers();
  
  // Set up saved filters functionality
  setupSavedFilters();
  
  // Set up advanced search toggle
  setupAdvancedSearch();
  
  console.log('BCR filters initialized');
}

/**
 * Initialize filter state from URL parameters or saved preferences
 */
function initializeFilterState() {
  // Get filter values from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Apply URL parameters to filter form
  const filterForm = document.querySelector('.bcr-filters-form');
  if (filterForm) {
    // For each form element, check if there's a matching URL parameter
    Array.from(filterForm.elements).forEach(element => {
      const name = element.name;
      if (name && urlParams.has(name)) {
        const value = urlParams.get(name);
        
        if (element.type === 'checkbox') {
          element.checked = value === 'true';
        } else if (element.type === 'radio') {
          element.checked = element.value === value;
        } else {
          element.value = value;
        }
      }
    });
  }
  
  // Update filter summary
  updateFilterSummary();
}

/**
 * Set up handlers for filter changes
 */
function setupFilterChangeHandlers() {
  const filterForm = document.querySelector('.bcr-filters-form');
  
  if (filterForm) {
    // Auto-submit on select changes
    const selects = filterForm.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', () => {
        filterForm.submit();
      });
    });
    
    // Date range validation
    const startDateInput = filterForm.querySelector('[name="startDate"]');
    const endDateInput = filterForm.querySelector('[name="endDate"]');
    
    if (startDateInput && endDateInput) {
      endDateInput.addEventListener('change', () => {
        validateDateRange(startDateInput, endDateInput);
      });
      
      startDateInput.addEventListener('change', () => {
        validateDateRange(startDateInput, endDateInput);
      });
    }
    
    // Clear filters button
    const clearButton = filterForm.querySelector('.bcr-filters-clear');
    if (clearButton) {
      clearButton.addEventListener('click', (e) => {
        e.preventDefault();
        clearFilters(filterForm);
      });
    }
  }
}

/**
 * Validate date range and show error if invalid
 * @param {HTMLElement} startDateInput - The start date input element
 * @param {HTMLElement} endDateInput - The end date input element
 */
function validateDateRange(startDateInput, endDateInput) {
  const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
  const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
  
  const errorMessage = document.querySelector('.bcr-date-error');
  
  if (startDate && endDate && startDate > endDate) {
    if (!errorMessage) {
      const error = document.createElement('span');
      error.className = 'govuk-error-message bcr-date-error';
      error.innerHTML = '<span class="govuk-visually-hidden">Error:</span> Start date must be before end date';
      endDateInput.parentNode.appendChild(error);
      endDateInput.classList.add('govuk-input--error');
    }
  } else if (errorMessage) {
    errorMessage.remove();
    endDateInput.classList.remove('govuk-input--error');
  }
}

/**
 * Clear all filters and submit the form
 * @param {HTMLFormElement} form - The filter form element
 */
function clearFilters(form) {
  // Reset all form elements
  Array.from(form.elements).forEach(element => {
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = false;
    } else if (element.type !== 'submit' && element.type !== 'button') {
      element.value = '';
    }
  });
  
  // Reset default values
  const statusSelect = form.querySelector('[name="status"]');
  if (statusSelect) {
    statusSelect.value = 'all';
  }
  
  // Submit the form
  form.submit();
}

/**
 * Update the filter summary display
 */
function updateFilterSummary() {
  const filterSummary = document.querySelector('.bcr-filter-summary');
  if (!filterSummary) {
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const filterCount = Array.from(urlParams.entries()).filter(([key]) => key !== 'page').length;
  
  if (filterCount > 0) {
    filterSummary.textContent = `${filterCount} filter${filterCount !== 1 ? 's' : ''} applied`;
    filterSummary.classList.add('bcr-filter-summary--active');
  } else {
    filterSummary.textContent = 'No filters applied';
    filterSummary.classList.remove('bcr-filter-summary--active');
  }
}

/**
 * Set up saved filters functionality
 */
function setupSavedFilters() {
  const saveFilterButton = document.querySelector('.bcr-save-filter');
  
  if (saveFilterButton) {
    saveFilterButton.addEventListener('click', (e) => {
      e.preventDefault();
      saveCurrentFilter();
    });
  }
  
  // Load saved filters into dropdown
  loadSavedFilters();
}

/**
 * Save the current filter settings
 */
function saveCurrentFilter() {
  const filterName = prompt('Enter a name for this filter:');
  
  if (!filterName) {
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const filterParams = {};
  
  // Store all parameters except pagination
  urlParams.forEach((value, key) => {
    if (key !== 'page') {
      filterParams[key] = value;
    }
  });
  
  // Get existing saved filters or initialize empty array
  const savedFilters = JSON.parse(localStorage.getItem('bcrSavedFilters') || '[]');
  
  // Add new filter
  savedFilters.push({
    name: filterName,
    params: filterParams,
    created: new Date().toISOString()
  });
  
  // Save back to localStorage
  localStorage.setItem('bcrSavedFilters', JSON.stringify(savedFilters));
  
  // Refresh the saved filters dropdown
  loadSavedFilters();
}

/**
 * Load saved filters into the dropdown
 */
function loadSavedFilters() {
  const savedFiltersSelect = document.querySelector('.bcr-saved-filters');
  
  if (!savedFiltersSelect) {
    return;
  }
  
  // Clear existing options except the first one
  while (savedFiltersSelect.options.length > 1) {
    savedFiltersSelect.remove(1);
  }
  
  // Get saved filters
  const savedFilters = JSON.parse(localStorage.getItem('bcrSavedFilters') || '[]');
  
  if (savedFilters.length === 0) {
    // Add a disabled option if no saved filters
    const option = document.createElement('option');
    option.textContent = 'No saved filters';
    option.disabled = true;
    savedFiltersSelect.appendChild(option);
  } else {
    // Add each saved filter as an option
    savedFilters.forEach((filter, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = filter.name;
      savedFiltersSelect.appendChild(option);
    });
  }
  
  // Add change handler
  savedFiltersSelect.addEventListener('change', () => {
    const selectedIndex = parseInt(savedFiltersSelect.value, 10);
    
    if (!isNaN(selectedIndex)) {
      applySavedFilter(selectedIndex);
    }
  });
}

/**
 * Apply a saved filter by index
 * @param {number} index - The index of the saved filter
 */
function applySavedFilter(index) {
  const savedFilters = JSON.parse(localStorage.getItem('bcrSavedFilters') || '[]');
  
  if (index >= 0 && index < savedFilters.length) {
    const filter = savedFilters[index];
    
    // Build URL parameters
    const params = new URLSearchParams();
    
    // Add filter parameters
    Object.entries(filter.params).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    // Navigate to the filtered URL
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  }
}

/**
 * Set up advanced search toggle
 */
function setupAdvancedSearch() {
  const advancedToggle = document.querySelector('.bcr-advanced-search-toggle');
  const advancedSection = document.querySelector('.bcr-advanced-search');
  
  if (advancedToggle && advancedSection) {
    // Hide advanced section initially
    advancedSection.style.display = 'none';
    
    // Set up toggle functionality
    advancedToggle.addEventListener('click', (e) => {
      e.preventDefault();
      
      const isExpanded = advancedToggle.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        advancedToggle.setAttribute('aria-expanded', 'false');
        advancedSection.style.display = 'none';
        advancedToggle.textContent = 'Show advanced filters';
      } else {
        advancedToggle.setAttribute('aria-expanded', 'true');
        advancedSection.style.display = 'block';
        advancedToggle.textContent = 'Hide advanced filters';
      }
    });
  }
}
