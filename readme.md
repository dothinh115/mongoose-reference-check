# mongoose-reference-check

A **TypeScript-ready** Mongoose plugin that validates reference integrity before save, update, and delete operations with performance optimizations and comprehensive error handling.

## Features

- ✅ **Reference validation** before save and update operations
- ✅ **Cascade delete protection** - prevents deleting documents that are referenced
- ✅ **Array reference support** - validates arrays of ObjectIds
- ✅ **Performance optimized** with batch operations and aggregation pipelines
- ✅ **TypeScript ready** with full type definitions
- ✅ **Zero configuration** - works out of the box with sensible defaults
- ✅ **Utility methods** for manual reference checking

## Installation

```bash
npm install mongoose-reference-check
```

## Quick Start

### JavaScript

```javascript
const mongoose = require("mongoose");
const ReferenceCheck = require("mongoose-reference-check");

const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
});

// Apply the plugin
PostSchema.plugin(ReferenceCheck);

const Post = mongoose.model('Post', PostSchema);
```

### TypeScript

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import ReferenceCheck from 'mongoose-reference-check';

interface IUser extends Document {
  name: string;
  email: string;
}

interface IPost extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  categories: mongoose.Types.ObjectId[];
}

const PostSchema = new Schema<IPost>({
  title: String,
  content: String,
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }]
});

// Apply the plugin
PostSchema.plugin(ReferenceCheck);

const Post = mongoose.model<IPost>('Post', PostSchema);
```

## Usage Examples

### Basic Validation

```typescript
// This will validate that the author and categories exist
const post = new Post({
  title: 'Hello World',
  content: 'This is my first post',
  author: new mongoose.Types.ObjectId(), // Must exist in User collection
  categories: [categoryId1, categoryId2] // Must exist in Category collection
});

try {
  await post.save(); // Throws error if references don't exist
} catch (error) {
  console.log(error.message); // "Reference validation failed: The value ... does not exist within User"
}
```

### Update Validation

```typescript
// This will validate references in update operations
try {
  await Post.findByIdAndUpdate(postId, {
    author: nonExistentUserId // Will throw validation error
  });
} catch (error) {
  console.log(error.message);
}
```

### Delete Protection

```typescript
// This will prevent deleting users that are referenced in posts
try {
  await User.findByIdAndDelete(userId); // Throws error if user is referenced
} catch (error) {
  console.log(error.message); // "Cannot delete record: It is referenced in Post model"
}
```

### Manual Reference Checking

```typescript
// Check references on a document instance
const post = await Post.findById(postId);
const results = await post.checkReferences();
console.log(results);
// [
//   { field: 'author', refTo: 'User', value: ObjectId('...'), isValid: true },
//   { field: 'categories', refTo: 'Category', value: [ObjectId('...')], isValid: false }
// ]

// Check references on model (static method)
const results = await Post.validateReferences({
  author: userId,
  categories: [cat1, cat2]
});
```

## Configuration Options

```typescript
import ReferenceCheck, { ReferenceCheckOptions } from 'mongoose-reference-check';

const options: ReferenceCheckOptions = {
  enableSave: true,      // Enable save validation (default: true)
  enableUpdate: true,    // Enable update validation (default: true) 
  enableDelete: true,    // Enable delete protection (default: true)
  enableLogging: false,  // Enable debug logging (default: false)
  batchSize: 100        // Batch size for bulk operations (default: 100)
};

PostSchema.plugin(ReferenceCheck, options);
```

## TypeScript Support

The plugin includes comprehensive TypeScript definitions:

```typescript
import { ReferenceCheckOptions, ValidationResult } from 'mongoose-reference-check';

// Full type safety for options
const options: ReferenceCheckOptions = {
  enableSave: true,
  enableLogging: false
};

// Typed validation results
const results: ValidationResult[] = await post.checkReferences();
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

## Supported Operations

### Save Operations
- `document.save()`
- `Model.create()`
- `Model.insertMany()`

### Update Operations  
- `Model.findByIdAndUpdate()`
- `Model.findOneAndUpdate()`
- `Model.updateOne()`
- `Model.updateMany()`

### Delete Operations
- `Model.findByIdAndDelete()`
- `Model.findOneAndDelete()`
- `Model.deleteOne()`
- `Model.deleteMany()`

## Requirements

- Node.js >= 12.0.0
- Mongoose >= 5.0.0

## Changelog

### v2.0.0
- ✨ **Full TypeScript rewrite** with comprehensive type definitions
- 📦 **Modular type system** for better maintainability
- 🎯 **Enhanced interfaces** for better developer experience
- 🔄 **Backward compatible** - same API, enhanced with types
- 📚 **Updated documentation** with TypeScript examples

### v1.x
- JavaScript implementation
- Core reference validation functionality

## License

ISC

## Support

I'm happy to help! If you encounter any issues or have suggestions, please [create an issue](https://github.com/dothinh115/mongoose-reference-check/issues) on GitHub.

## Contact

dothinh115@gmail.com
