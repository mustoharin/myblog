/**
 * Helper function to handle pagination for any model
 * @param {Object} Model - Mongoose model to query
 * @param {Object} query - Query object to filter results
 * @param {Object} options - Pagination options (page, limit, populate, select)
 * @returns {Object} Paginated results with metadata
 */
async function paginateResults(Model, query = {}, options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = Math.min(parseInt(options.limit) || 10, 50); // Max 50 items per page
  const skip = (page - 1) * limit;

  const findQuery = Model.find(query);

  // Apply population if specified
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(path => findQuery.populate(path));
    } else {
      findQuery.populate(options.populate);
    }
  }

  // Apply field selection if specified
  if (options.select) {
    findQuery.select(options.select);
  }

  // Apply sorting
  if (options.sort) {
    findQuery.sort(options.sort);
  }

  // Execute query with pagination
  const items = await findQuery.skip(skip).limit(limit);
  const total = await Model.countDocuments(query);  return {
    items,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: skip + items.length < total,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = paginateResults;