/**
 * Http requrest parameter constraint
 */
class RequestConstraint {
  constructor(schema) {
    this.constraintSchema = schema;
  }

  verify(req, res, next) {
    const params = req.body;
    const missKeys = [];
    if (req.path in this.constraintSchema) {
      const schema = this.constraintSchema[req.path];
      for (const k in schema) {
        const item = schema[k];
        if (!item.require && (params[k] === undefined || params[k] === null)) {
          continue;
        }
        if (!item.valid(params[k])) {
          missKeys.push(k);
        }
      }
    }
    if (missKeys.length > 0) {
      typeof (this.constraintSchema.onFailed) === 'function'
        && this.constraintSchema.onFailed(req, res, next, missKeys);
      return;
    }
    next();
  }
}

module.exports = RequestConstraint;
