const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    preferredLanguage: {
      type: String,
      enum: ['English', 'Hindi', 'Telugu'],
      default: 'English',
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age cannot exceed 130'],
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', 'Other', 'Prefer not to say', null],
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    district: {
      type: String,
      trim: true,
      default: null,
    },
    occupation: {
      type: String,
      trim: true,
      default: null,
    },
    annualIncome: {
      type: Number,
      min: [0, 'Annual income cannot be negative'],
      default: null,
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other', null],
      default: null,
    },
    disability: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Safe JSON serialization - never expose password or __v
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
