# Mongoose Reference Check

A Mongoose plugin that validates reference integrity before save, update, and delete operations. It ensures that referenced documents exist and prevents deletion of records that are still being referenced elsewhere.

## Features

- ✅ **Automatic validation** on save, update, and delete operations
- ✅ **Performance optimized** with aggregation pipelines and batch operations
- ✅ **Configurable** - enable/disable specific operations
- ✅ **Comprehensive error handling** with detailed error messages
- ✅ **Logging support** for debugging and monitoring
- ✅ **Utility methods** for manual reference validation
- ✅ **Array support** - handles both single values and arrays of references

## Installation

```bash
npm install mongoose-reference-check
```

Or if you are using yarn:

```bash
yarn add mongoose-reference-check
```

## Basic Usage

### Global Plugin (Recommended)

```javascript
const mongoose = require("mongoose");
const ReferenceCheck = require("mongoose-reference-check");

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/test")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Apply globally to all schemas
mongoose.plugin(ReferenceCheck);
```

### Per-Schema Plugin

```javascript
const mongoose = require("mongoose");
const ReferenceCheck = require("mongoose-reference-check");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
});

const tagSchema = new mongoose.Schema({
  name: String,
  color: String,
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
});

// Create models first
const User = mongoose.model("User", userSchema);
const Tag = mongoose.model("Tag", tagSchema);
const Post = mongoose.model("Post", postSchema);

// Apply to specific schema
postSchema.plugin(ReferenceCheck);
```

## Configuration Options

```javascript
const ReferenceCheck = require("mongoose-reference-check");

// Custom configuration
mongoose.plugin(ReferenceCheck, {
  enableSave: true, // Enable validation on save (default: true)
  enableUpdate: true, // Enable validation on update (default: true)
  enableDelete: true, // Enable validation on delete (default: true)
  enableLogging: true, // Enable console logging (default: false)
  batchSize: 100, // Batch size for bulk operations (default: 100)
});
```

## Schema Requirements

Ensure that fields you want to validate have the `ref` option:

```javascript
const postSchema = new mongoose.Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
});
```

## How It Works

### Save Operation

- Validates all reference fields before saving
- Ensures referenced documents exist in their respective collections
- Throws error if any reference is invalid

### Update Operation

- Validates reference fields in update payload
- Works with `findOneAndUpdate`, `updateOne`, and `updateMany`
- Skips validation if no reference fields are being updated

### Delete Operation

- Checks if the record being deleted is referenced elsewhere
- Prevents deletion if other documents reference it
- Uses optimized aggregation queries for better performance

## Utility Methods

### Static Method: `validateReferences`

```javascript
const Post = mongoose.model("Post", postSchema);

// First create some data to reference
const user = await User.create({ name: "John Doe", email: "john@example.com" });
const category = await Category.create({ name: "Technology" });

// Validate references without saving
const validationResults = await Post.validateReferences({
  author: user._id,
  category: category._id,
});

console.log(validationResults);
// Output:
// [
//   { field: 'author', refTo: 'User', value: user._id, isValid: true },
//   { field: 'category', refTo: 'Category', value: category._id, isValid: true }
// ]
```

### Instance Method: `checkReferences`

```javascript
// First create some data to reference
const user = await User.create({ name: "John Doe", email: "john@example.com" });

const post = new Post({
  title: "My Post",
  author: user._id,
});

// Check references on instance
const results = await post.checkReferences();
console.log(results);
```

## Error Messages

The plugin provides clear error messages:

- **Save/Update errors**: `Reference validation failed: The value [ID] does not exist within [ModelName]`
- **Delete errors**: `Cannot delete record [ID]: It is referenced in [ModelName] model`
- **Database errors**: `Database error validating [fieldName]: [error message]`

## Performance Considerations

- **Batch operations**: Array references are validated in batches using `$in` queries
- **Aggregation pipelines**: Delete operations use optimized aggregation instead of multiple queries
- **Early exit**: Operations skip validation if no reference fields are present
- **Configurable batch size**: Adjust `batchSize` option for your use case

## Logging

Enable logging to monitor validation operations:

```javascript
mongoose.plugin(ReferenceCheck, { enableLogging: true });
```

Log output example:

```
[ReferenceCheck] Validating 2 reference fields on save
[ReferenceCheck] Save validation completed successfully
[ReferenceCheck] Checking references before deleting from Post
[ReferenceCheck] No references found, safe to delete
```

## Examples

### Complete Example

```javascript
const mongoose = require("mongoose");
const ReferenceCheck = require("mongoose-reference-check");

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/test")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Apply plugin globally
mongoose.plugin(ReferenceCheck, { enableLogging: true });

// Define schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
});

const categorySchema = new mongoose.Schema({
  name: String,
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
});

// Create models
const User = mongoose.model("User", userSchema);
const Category = mongoose.model("Category", categorySchema);
const Post = mongoose.model("Post", postSchema);

// Usage
async function createPost() {
  try {
    // First create some data to reference
    const user = await User.create({
      name: "John Doe",
      email: "john@example.com",
    });
    const category = await Category.create({ name: "Technology" });

    const post = new Post({
      title: "My First Post",
      content: "Hello World!",
      author: user._id, // Will be validated
      category: category._id, // Will be validated
    });

    await post.save(); // Validation happens automatically
    console.log("Post created successfully");

    return post;
  } catch (error) {
    console.error("Validation error:", error.message);
    throw error;
  }
}

// Run the example
createPost()
  .then((post) => console.log("Example completed successfully"))
  .catch((err) => console.error("Example failed:", err.message))
  .finally(() => mongoose.connection.close());
```

## License

ISC

## Contact

dothinh115@mail.com
