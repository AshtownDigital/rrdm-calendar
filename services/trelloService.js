/**
 * Trello Service
 * Handles integration with Trello API for BCR management
 */
const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Create a new Trello card for a BCR
 * @param {string} title - Card title
 * @param {string} description - Card description
 * @param {string} bcrNumber - BCR reference number
 * @returns {Promise<Object>} - Created Trello card data
 */
const createCard = async (title, description, bcrNumber) => {
  try {
    // Check if Trello integration is enabled
    if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN || !process.env.TRELLO_LIST_ID) {
      logger.warn('Trello integration is not configured. Skipping card creation.');
      return null;
    }

    const response = await axios.post('https://api.trello.com/1/cards', {
      name: `${bcrNumber}: ${title}`,
      desc: description,
      idList: process.env.TRELLO_LIST_ID,
      key: process.env.TRELLO_KEY,
      token: process.env.TRELLO_TOKEN,
      pos: 'top'
    });

    logger.info(`Created Trello card for BCR ${bcrNumber}`);
    return response.data;
  } catch (error) {
    logger.error('Error creating Trello card:', error);
    return null;
  }
};

/**
 * Update an existing Trello card
 * @param {string} cardId - Trello card ID
 * @param {Object} updates - Card updates (name, desc, etc.)
 * @returns {Promise<Object>} - Updated Trello card data
 */
const updateCard = async (cardId, updates) => {
  try {
    if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
      logger.warn('Trello integration is not configured. Skipping card update.');
      return null;
    }

    const response = await axios.put(`https://api.trello.com/1/cards/${cardId}`, {
      ...updates,
      key: process.env.TRELLO_KEY,
      token: process.env.TRELLO_TOKEN
    });

    logger.info(`Updated Trello card ${cardId}`);
    return response.data;
  } catch (error) {
    logger.error('Error updating Trello card:', error);
    return null;
  }
};

/**
 * Move a Trello card to a different list
 * @param {string} cardId - Trello card ID
 * @param {string} listId - Target list ID
 * @returns {Promise<Object>} - Updated Trello card data
 */
const moveCardToList = async (cardId, listId) => {
  try {
    if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
      logger.warn('Trello integration is not configured. Skipping card move.');
      return null;
    }

    const response = await axios.put(`https://api.trello.com/1/cards/${cardId}`, {
      idList: listId,
      key: process.env.TRELLO_KEY,
      token: process.env.TRELLO_TOKEN
    });

    logger.info(`Moved Trello card ${cardId} to list ${listId}`);
    return response.data;
  } catch (error) {
    logger.error('Error moving Trello card:', error);
    return null;
  }
};

/**
 * Add a comment to a Trello card
 * @param {string} cardId - Trello card ID
 * @param {string} comment - Comment text
 * @returns {Promise<Object>} - Comment data
 */
const addComment = async (cardId, comment) => {
  try {
    if (!process.env.TRELLO_KEY || !process.env.TRELLO_TOKEN) {
      logger.warn('Trello integration is not configured. Skipping comment addition.');
      return null;
    }

    const response = await axios.post(`https://api.trello.com/1/cards/${cardId}/actions/comments`, {
      text: comment,
      key: process.env.TRELLO_KEY,
      token: process.env.TRELLO_TOKEN
    });

    logger.info(`Added comment to Trello card ${cardId}`);
    return response.data;
  } catch (error) {
    logger.error('Error adding comment to Trello card:', error);
    return null;
  }
};

module.exports = {
  createCard,
  updateCard,
  moveCardToList,
  addComment
};
