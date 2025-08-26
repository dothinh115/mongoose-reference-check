/**
 * Mongoose Reference Check Plugin
 * Validates reference integrity before save, update, and delete operations
 */

function ReferenceCheck(schema, options = {}) {
  // Default configuration
  const config = {
    enableSave: true,
    enableUpdate: true,
    enableDelete: true,
    enableLogging: false,
    batchSize: 100, // For bulk operations
    ...options,
  };

  // Helper function to get reference fields from schema
  function getRefFields(schema) {
    const refFields = [];
    for (const field in schema.paths) {
      if (schema.paths[field].options.ref) {
        refFields.push({
          field,
          refTo: schema.paths[field].options.ref,
        });
      }
    }
    return refFields;
  }

  // Helper function to validate single reference
  async function validateReference(model, refModelName, value, fieldName) {
    try {
      if (!value) return true;

      // Handle array values
      if (Array.isArray(value)) {
        if (value.length === 0) return true;

        // Batch check for arrays
        const uniqueValues = [...new Set(value)];
        const exists = await model.exists({ _id: { $in: uniqueValues } });
        return exists;
      }

      // Single value check
      const exists = await model.exists({ _id: value });
      return exists;
    } catch (error) {
      throw new Error(
        `Database error validating ${fieldName}: ${error.message}`
      );
    }
  }

  // Helper function to log operations
  function log(message) {
    if (config.enableLogging) {
      console.log(`[ReferenceCheck] ${message}`);
    }
  }

  // Save middleware
  if (config.enableSave) {
    schema.pre("save", async function (next) {
      try {
        const refFields = getRefFields(this.schema);
        if (refFields.length === 0) return next();

        log(`Validating ${refFields.length} reference fields on save`);

        for (const fieldObj of refFields) {
          const value = this.get(fieldObj.field);
          if (!value) continue;

          const model = this.model(fieldObj.refTo);
          const isValid = await validateReference(
            model,
            fieldObj.refTo,
            value,
            fieldObj.field
          );

          if (!isValid) {
            throw new Error(
              `Reference validation failed: The value ${value} does not exist within ${fieldObj.refTo}`
            );
          }
        }

        log("Save validation completed successfully");
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  // Update middlewares
  if (config.enableUpdate) {
    const updateOperations = ["findOneAndUpdate", "updateOne", "updateMany"];

    schema.pre(updateOperations, async function (next) {
      try {
        const payload = this.getUpdate();
        if (!payload) return next();

        const refFields = getRefFields(this.model.schema);
        if (refFields.length === 0) return next();

        log(`Validating ${refFields.length} reference fields on update`);

        for (const fieldObj of refFields) {
          const value = payload[fieldObj.field];
          if (!value) continue;

          const model = this.model.db.model(fieldObj.refTo);
          const isValid = await validateReference(
            model,
            fieldObj.refTo,
            value,
            fieldObj.field
          );

          if (!isValid) {
            throw new Error(
              `Reference validation failed: The value ${value} does not exist within ${fieldObj.refTo}`
            );
          }
        }

        log("Update validation completed successfully");
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  // Delete middleware with performance optimization
  if (config.enableDelete) {
    const deleteOperations = ["deleteOne", "findOneAndDelete", "deleteMany"];

    schema.pre(deleteOperations, async function (next) {
      try {
        const deletingModelName = this.model.modelName;
        const query = this.getQuery();

        log(`Checking references before deleting from ${deletingModelName}`);

        // Get the item being deleted
        const deletingItem = await this.model.findOne(query);
        if (!deletingItem) {
          log("No item found to delete, skipping reference check");
          return next();
        }

        // Find all models that reference this model
        const refModels = [];
        const allModelNames = this.model.db.modelNames();

        for (const modelName of allModelNames) {
          if (modelName === deletingModelName) continue;

          const model = this.model.db.model(modelName);
          const refFields = [];

          for (const field in model.schema.paths) {
            if (model.schema.paths[field].options.ref === deletingModelName) {
              refFields.push(field);
            }
          }

          if (refFields.length > 0) {
            refModels.push({
              modelName,
              fields: refFields,
            });
          }
        }

        if (refModels.length === 0) {
          log("No references found, safe to delete");
          return next();
        }

        // Check references using optimized queries
        for (const refModel of refModels) {
          const model = this.model.db.model(refModel.modelName);

          // Use aggregation for better performance
          const pipeline = [
            {
              $match: {
                $or: refModel.fields.map((field) => ({
                  [field]: deletingItem._id,
                })),
              },
            },
            { $limit: 1 },
          ];

          const exists = await model.aggregate(pipeline);

          if (exists.length > 0) {
            throw new Error(
              `Cannot delete record ${deletingItem._id}: It is referenced in ${refModel.modelName} model`
            );
          }
        }

        log("Delete validation completed successfully");
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  // Add utility methods to schema
  schema.statics.validateReferences = async function (data) {
    const refFields = getRefFields(this.schema);
    const results = [];

    for (const fieldObj of refFields) {
      const value = data[fieldObj.field];
      if (!value) continue;

      const model = this.model(fieldObj.refTo);
      const isValid = await validateReference(
        model,
        fieldObj.refTo,
        value,
        fieldObj.field
      );

      results.push({
        field: fieldObj.field,
        refTo: fieldObj.refTo,
        value,
        isValid,
      });
    }

    return results;
  };

  // Add instance method to check references
  schema.methods.checkReferences = async function () {
    const refFields = getRefFields(this.schema);
    const results = [];

    for (const fieldObj of refFields) {
      const value = this.get(fieldObj.field);
      if (!value) continue;

      const model = this.model(fieldObj.refTo);
      const isValid = await validateReference(
        model,
        fieldObj.refTo,
        value,
        fieldObj.field
      );

      results.push({
        field: fieldObj.field,
        refTo: fieldObj.refTo,
        value,
        isValid,
      });
    }

    return results;
  };
}

module.exports = ReferenceCheck;
