/**
 * Pagination Service
 * Handles pagination logic for database queries and view rendering
 */

/**
 * Calculate pagination parameters
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {number} options.total - Total number of items
 * @returns {Object} - Pagination parameters
 */
exports.getPaginationParams = (options) => {
  // Set defaults and parse values
  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.max(1, parseInt(options.limit) || 10);
  const total = Math.max(0, parseInt(options.total) || 0);
  
  // Calculate total pages
  const totalPages = Math.ceil(total / limit);
  
  // Calculate skip value for database query
  const skip = (page - 1) * limit;
  
  // Determine if there are previous/next pages
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  
  // Calculate previous and next page numbers
  const prevPage = hasPrevPage ? page - 1 : null;
  const nextPage = hasNextPage ? page + 1 : null;
  
  return {
    page,
    limit,
    skip,
    total,
    totalPages,
    hasPrevPage,
    hasNextPage,
    prevPage,
    nextPage
  };
};

/**
 * Apply pagination to a Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @returns {Object} - Modified query with pagination applied
 */
exports.paginateQuery = (query, options) => {
  // Calculate pagination parameters
  const { skip, limit } = exports.getPaginationParams(options);
  
  // Apply pagination to query
  return query.skip(skip).limit(limit);
};

/**
 * Prepare pagination data for views
 * @param {Object} options - Pagination options
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total number of items
 * @param {string} options.baseUrl - Base URL for pagination links
 * @param {Object} options.queryParams - Additional query parameters
 * @returns {Object} - Pagination data for views
 */
exports.preparePaginationData = (options) => {
  // Get basic pagination parameters
  const paginationParams = exports.getPaginationParams(options);
  
  // Add URL-related parameters
  return {
    ...paginationParams,
    baseUrl: options.baseUrl || '',
    queryParams: {
      ...options.queryParams,
      limit: paginationParams.limit
    }
  };
};
