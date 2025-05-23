// services/workflowPhaseService.js
// Service for interacting with the WorkflowPhase model (MongoDB)

// Import MongoDB models
const mongoose = require('mongoose');
const WorkflowPhase = require('../models/WorkflowPhase');

/**
 * Get all workflow phases, ordered by their order field.
 */
async function getAllPhases() {
  return WorkflowPhase.find({}).sort({ order: 1 });
}

/**
 * Get a workflow phase by ID.
 */
async function getPhaseById(id) {
  return WorkflowPhase.findById(id);
}

/**
 * Create a new workflow phase.
 */
async function createPhase(data) {
  const phase = new WorkflowPhase(data);
  return phase.save();
}

/**
 * Update a workflow phase by ID.
 */
async function updatePhase(id, data) {
  return WorkflowPhase.findByIdAndUpdate(id, data, { new: true });
}

/**
 * Delete a workflow phase by ID.
 */
async function deletePhase(id) {
  return WorkflowPhase.findByIdAndDelete(id);
}

/**
 * Get all statuses for all phases (currentStatus and completedStatus for each phase)
 */
async function getAllStatuses() {
  const phases = await getAllPhases();
  // Flatten all statuses into a single array
  return phases.reduce((acc, phase) => {
    if (phase.currentStatus) acc.push({ phaseId: phase._id, type: 'current', status: phase.currentStatus, phaseName: phase.name });
    if (phase.completedStatus) acc.push({ phaseId: phase._id, type: 'completed', status: phase.completedStatus, phaseName: phase.name });
    return acc;
  }, []);
}

/**
 * Get the current and completed statuses for a specific phase.
 */
async function getStatusesForPhase(phaseId) {
  const phase = await getPhaseById(phaseId);
  return {
    currentStatus: phase.currentStatus,
    completedStatus: phase.completedStatus,
  };
}

// --- Status CRUD simulation for compatibility ---
// In current schema, statuses are just strings on WorkflowPhase.
// For full CRUD, these would be in their own model/table. Here we simulate for controller compatibility.

async function createStatus({ name, phaseId, displayOrder }) {
  // Add or update status string on WorkflowPhase
  const phase = await getPhaseById(phaseId);
  if (!phase) throw new Error('Phase not found');
  // For demo, treat 'completed' if name includes 'Completed', else 'current'
  let update = {};
  if (/completed/i.test(name)) {
    update.completedStatus = name;
  } else {
    update.currentStatus = name;
  }
  return updatePhase(phaseId, update);
}

async function getStatusById(id) {
  // Simulate: id is phaseId + status type
  const phase = await getPhaseById(id);
  if (!phase) return null;
  return {
    id: phase._id,
    name: phase.currentStatus,
    type: 'current',
    phaseId: phase._id,
    phaseName: phase.name
  };
}

async function updateStatus(id, { name }) {
  // Simulate update by changing currentStatus or completedStatus
  const phase = await getPhaseById(id);
  if (!phase) throw new Error('Phase not found');
  let update = {};
  if (/completed/i.test(name)) {
    update.completedStatus = name;
  } else {
    update.currentStatus = name;
  }
  return updatePhase(id, update);
}

async function deleteStatus(id) {
  // Simulate by clearing status string on WorkflowPhase
  return updatePhase(id, { currentStatus: '', completedStatus: '' });
}

module.exports = {
  getAllPhases,
  getPhaseById,
  createPhase,
  updatePhase,
  deletePhase,
  getAllStatuses,
  getStatusesForPhase,
  // Simulated status CRUD
  createStatus,
  getStatusById,
  updateStatus,
  deleteStatus,
};
