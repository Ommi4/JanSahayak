const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    schemeName: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Scheme category is required'],
      trim: true,
      index: true,
    },
    beneficiary: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      default: 'All',
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    benefits: {
      type: [String],
      default: [],
    },
    eligibilityText: {
      type: String,
    },
    rules: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    documents: {
      type: [String],
      default: [],
    },
    applicationProcess: {
      type: [String],
      default: [],
    },
    officialWebsite: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for flexibility across APIs
schemeSchema.virtual('name').get(function () {
  return this.schemeName;
});
schemeSchema.virtual('officialUrl').get(function () {
  return this.officialWebsite;
});
schemeSchema.virtual('documentsRequired').get(function () {
  return this.documents;
});
schemeSchema.virtual('eligibility').get(function () {
  return this.rules;
});

module.exports = mongoose.model('Scheme', schemeSchema);
