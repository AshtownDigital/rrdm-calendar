/**
 * BCR Workflow Component
 * 
 * This module handles the BCR workflow visualization and interaction.
 * It provides an interactive workflow diagram and phase transitions.
 */

/**
 * Set up BCR workflow functionality
 */
export function setupBcrWorkflow() {
  const workflowContainer = document.querySelector('.bcr-workflow');
  
  if (!workflowContainer) {
    return;
  }
  
  // Initialize workflow visualization
  initializeWorkflowVisualization();
  
  // Set up phase transition handlers
  setupPhaseTransitions();
  
  // Set up workflow history expansion
  setupWorkflowHistory();
  
  console.log('BCR workflow initialized');
}

/**
 * Initialize workflow visualization
 */
function initializeWorkflowVisualization() {
  const workflowPhases = document.querySelectorAll('.bcr-workflow-phase');
  
  if (workflowPhases.length === 0) {
    return;
  }
  
  // Add connecting lines between phases
  addPhaseConnectors(workflowPhases);
  
  // Highlight the current phase
  highlightCurrentPhase(workflowPhases);
  
  // Add tooltips to phases
  addPhaseTooltips(workflowPhases);
}

/**
 * Add connecting lines between workflow phases
 * @param {NodeList} phases - The workflow phase elements
 */
function addPhaseConnectors(phases) {
  // Remove any existing connectors
  const existingConnectors = document.querySelectorAll('.bcr-phase-connector');
  existingConnectors.forEach(connector => connector.remove());
  
  // Add connectors between phases
  for (let i = 0; i < phases.length - 1; i++) {
    const currentPhase = phases[i];
    const nextPhase = phases[i + 1];
    
    const connector = document.createElement('div');
    connector.className = 'bcr-phase-connector';
    
    // Position the connector between the phases
    const currentRect = currentPhase.getBoundingClientRect();
    const nextRect = nextPhase.getBoundingClientRect();
    
    const connectorWidth = nextRect.left - (currentRect.left + currentRect.width);
    
    connector.style.width = `${connectorWidth}px`;
    connector.style.left = `${currentRect.left + currentRect.width}px`;
    connector.style.top = `${currentRect.top + (currentRect.height / 2)}px`;
    
    // Add completed class if both phases are completed
    if (currentPhase.classList.contains('bcr-workflow-phase--completed') && 
        nextPhase.classList.contains('bcr-workflow-phase--completed')) {
      connector.classList.add('bcr-phase-connector--completed');
    }
    
    document.body.appendChild(connector);
  }
}

/**
 * Highlight the current phase in the workflow
 * @param {NodeList} phases - The workflow phase elements
 */
function highlightCurrentPhase(phases) {
  // Find the current phase
  const currentPhase = document.querySelector('.bcr-workflow-phase--current');
  
  if (!currentPhase) {
    return;
  }
  
  // Add animation to draw attention to the current phase
  currentPhase.classList.add('bcr-workflow-phase--highlight');
  
  // Add "current" label
  const currentLabel = document.createElement('span');
  currentLabel.className = 'bcr-workflow-current-label';
  currentLabel.textContent = 'Current';
  currentPhase.appendChild(currentLabel);
}

/**
 * Add tooltips to workflow phases
 * @param {NodeList} phases - The workflow phase elements
 */
function addPhaseTooltips(phases) {
  phases.forEach(phase => {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'bcr-phase-tooltip';
    
    // Get phase details
    const phaseName = phase.getAttribute('data-phase-name');
    const phaseDescription = phase.getAttribute('data-phase-description');
    const phaseStatus = phase.getAttribute('data-phase-status');
    
    // Create tooltip content
    tooltip.innerHTML = `
      <h3 class="govuk-heading-s">${phaseName}</h3>
      <p class="govuk-body-s">${phaseDescription || 'No description available'}</p>
      ${phaseStatus ? `<span class="govuk-tag">${phaseStatus}</span>` : ''}
    `;
    
    // Add tooltip to phase
    phase.appendChild(tooltip);
    
    // Show/hide tooltip on hover
    phase.addEventListener('mouseenter', () => {
      tooltip.style.display = 'block';
    });
    
    phase.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

/**
 * Set up phase transition handlers
 */
function setupPhaseTransitions() {
  const phaseTransitionForm = document.querySelector('.bcr-phase-transition-form');
  
  if (!phaseTransitionForm) {
    return;
  }
  
  // Get phase and status selectors
  const phaseSelect = phaseTransitionForm.querySelector('[name="phase"]');
  const statusSelect = phaseTransitionForm.querySelector('[name="status"]');
  
  if (phaseSelect && statusSelect) {
    // Update available statuses based on selected phase
    phaseSelect.addEventListener('change', () => {
      updateAvailableStatuses(phaseSelect.value, statusSelect);
    });
    
    // Add confirmation dialog before submission
    phaseTransitionForm.addEventListener('submit', (e) => {
      const currentPhase = document.querySelector('.bcr-workflow-phase--current')
        ?.getAttribute('data-phase-id');
      const newPhase = phaseSelect.value;
      
      // If moving backward in the workflow, show confirmation
      if (currentPhase && newPhase && parseInt(newPhase, 10) < parseInt(currentPhase, 10)) {
        e.preventDefault();
        
        if (!confirm('Moving to an earlier phase will reset progress on subsequent phases. Are you sure you want to continue?')) {
          return false;
        }
        
        // Submit the form if confirmed
        phaseTransitionForm.submit();
      }
    });
  }
}

/**
 * Update available statuses based on selected phase
 * @param {string} phaseId - The selected phase ID
 * @param {HTMLSelectElement} statusSelect - The status select element
 */
function updateAvailableStatuses(phaseId, statusSelect) {
  // Get the mapping of phases to statuses
  const phaseStatusMapping = JSON.parse(
    document.getElementById('phase-status-mapping')?.textContent || '{}'
  );
  
  // Clear existing options
  while (statusSelect.options.length > 0) {
    statusSelect.remove(0);
  }
  
  // Add available statuses for the selected phase
  const availableStatuses = phaseStatusMapping[phaseId] || [];
  
  availableStatuses.forEach(status => {
    const option = document.createElement('option');
    option.value = status.id;
    option.textContent = status.name;
    statusSelect.appendChild(option);
  });
  
  // If no statuses available, add a default option
  if (availableStatuses.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No statuses available';
    option.disabled = true;
    statusSelect.appendChild(option);
  }
}

/**
 * Set up workflow history expansion
 */
function setupWorkflowHistory() {
  const historyContainer = document.querySelector('.bcr-workflow-history');
  
  if (!historyContainer) {
    return;
  }
  
  const historyToggle = document.querySelector('.bcr-history-toggle');
  const historyItems = historyContainer.querySelectorAll('.bcr-history-item');
  
  // Show only the first 5 history items initially
  if (historyItems.length > 5) {
    for (let i = 5; i < historyItems.length; i++) {
      historyItems[i].style.display = 'none';
    }
    
    // Create "Show more" button if it doesn't exist
    if (!historyToggle) {
      const toggle = document.createElement('button');
      toggle.className = 'govuk-button govuk-button--secondary bcr-history-toggle';
      toggle.textContent = `Show ${historyItems.length - 5} more items`;
      toggle.setAttribute('type', 'button');
      toggle.setAttribute('aria-expanded', 'false');
      
      historyContainer.appendChild(toggle);
      
      // Add click handler
      toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
          // Hide items beyond the first 5
          for (let i = 5; i < historyItems.length; i++) {
            historyItems[i].style.display = 'none';
          }
          toggle.textContent = `Show ${historyItems.length - 5} more items`;
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          // Show all items
          for (let i = 5; i < historyItems.length; i++) {
            historyItems[i].style.display = 'block';
          }
          toggle.textContent = 'Show less';
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }
}
