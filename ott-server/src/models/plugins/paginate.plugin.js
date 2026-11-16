// From hagopj13/node-express-boilerplate (MIT)
/**
 * Adds Model.paginate(filter, { sortBy: 'field:desc', limit, page, populate })
 * Returns { results, page, limit, totalPages, totalResults }
 */
const paginate = (schema) => {
  schema.statics.paginate = async function (filter, options) {
    let sort = 'createdAt';
    if (options.sortBy) {
      sort = options.sortBy
        .split(',')
        .map((sortOption) => {
          const [key, order] = sortOption.split(':');
          return (order === 'desc' ? '-' : '') + key;
        })
        .join(' ');
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsQuery = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      options.populate.split(',').forEach((populateOption) => {
        docsQuery = docsQuery.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    }

    const [totalResults, results] = await Promise.all([countPromise, docsQuery.exec()]);
    return { results, page, limit, totalPages: Math.ceil(totalResults / limit), totalResults };
  };
};

export default paginate;
