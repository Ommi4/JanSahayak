/**
 * JanSahayak - Deterministic Eligibility Rule Engine
 * Evaluates citizen profile data against structured government scheme rules.
 * Does NOT rely on any external LLM or AI model.
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Validates user profile inputs
 * @param {Object} profile 
 */
const validateUserProfile = (profile) => {
  if (!profile || typeof profile !== 'object') {
    throw new ValidationError('User profile must be an object');
  }

  if (profile.age !== undefined && profile.age !== null) {
    const age = Number(profile.age);
    if (!Number.isFinite(age) || age < 0 || age > 130) {
      throw new ValidationError('Age must be a valid number between 0 and 130');
    }
  }

  if (profile.annualIncome !== undefined && profile.annualIncome !== null) {
    const income = Number(profile.annualIncome);
    if (!Number.isFinite(income) || income < 0) {
      throw new ValidationError('Annual income must be a non-negative number');
    }
  }

  const booleanFields = ['farmer', 'student', 'disability'];
  for (const field of booleanFields) {
    if (profile[field] !== undefined && profile[field] !== null && typeof profile[field] !== 'boolean') {
      throw new ValidationError(`${field} must be a boolean value (true or false)`);
    }
  }
};

/**
 * Normalizes rule criteria into consistent format
 * @param {Object} rules 
 * @param {Object} scheme 
 * @returns {Object} normalizedRules
 */
const extractRules = (rules = {}, scheme = {}) => {
  const normalized = {};

  // Age limits: support rules.age.min/max, rules.minAge/maxAge
  const minAge = rules.age?.min ?? rules.minAge ?? null;
  const maxAge = rules.age?.max ?? rules.maxAge ?? null;
  if (minAge !== null || maxAge !== null) {
    normalized.age = {
      min: minAge !== null ? Number(minAge) : null,
      max: maxAge !== null ? Number(maxAge) : null,
    };
  }

  // Annual Income limits: support rules.annualIncome.max/min, rules.maxAnnualIncome/minAnnualIncome
  const maxIncome = rules.annualIncome?.max ?? rules.maxAnnualIncome ?? null;
  const minIncome = rules.annualIncome?.min ?? rules.minAnnualIncome ?? null;
  if (maxIncome !== null || minIncome !== null) {
    normalized.annualIncome = {
      max: maxIncome !== null ? Number(maxIncome) : null,
      min: minIncome !== null ? Number(minIncome) : null,
    };
  }

  // Gender: support rules.gender as array or string
  if (rules.gender) {
    if (Array.isArray(rules.gender)) {
      normalized.gender = rules.gender.map((g) => String(g).toLowerCase().trim());
    } else if (typeof rules.gender === 'string') {
      const g = rules.gender.toLowerCase().trim();
      if (g !== 'all') {
        normalized.gender = [g];
      }
    }
  }

  // State: check rules.states, rules.state, or scheme.state
  const stateSource = rules.states || rules.state || scheme.state;
  if (stateSource) {
    if (Array.isArray(stateSource)) {
      normalized.states = stateSource.map((s) => String(s).toLowerCase().trim());
    } else if (typeof stateSource === 'string') {
      const s = stateSource.toLowerCase().trim();
      if (s !== 'all' && s !== 'national') {
        normalized.states = [s];
      }
    }
  }

  // Category (social/caste): support rules.categories or rules.category
  const categorySource = rules.categories || rules.category;
  if (categorySource) {
    if (Array.isArray(categorySource)) {
      normalized.categories = categorySource.map((c) => String(c).toLowerCase().trim());
    } else if (typeof categorySource === 'string') {
      const c = categorySource.toLowerCase().trim();
      if (c !== 'all') {
        normalized.categories = [c];
      }
    }
  }

  // Occupation: support rules.occupations or rules.occupation
  const occSource = rules.occupations || rules.occupation;
  if (occSource) {
    if (Array.isArray(occSource)) {
      normalized.occupations = occSource.map((o) => String(o).toLowerCase().trim());
    } else if (typeof occSource === 'string') {
      const o = occSource.toLowerCase().trim();
      if (o !== 'all') {
        normalized.occupations = [o];
      }
    }
  }

  // Boolean flags
  if (rules.farmer === true) normalized.farmer = true;
  if (rules.student === true) normalized.student = true;
  if (rules.disability === true) normalized.disability = true;

  return normalized;
};

/**
 * Deterministically evaluates user profile against scheme rules
 * @param {Object} userProfile 
 * @param {Object} scheme 
 * @returns {Object} { eligible, status, reasons, missingInformation }
 */
const evaluateEligibility = (userProfile = {}, scheme = {}) => {
  validateUserProfile(userProfile);

  const rawRules = scheme.rules || scheme.eligibility || {};
  const rules = extractRules(rawRules, scheme);

  const reasons = [];
  const missingInformation = [];

  // 1. Evaluate Age
  if (rules.age) {
    const userAge = userProfile.age !== undefined && userProfile.age !== null ? Number(userProfile.age) : null;
    if (userAge === null) {
      missingInformation.push('age');
    } else {
      if (rules.age.min !== null && userAge < rules.age.min) {
        reasons.push({
          field: 'age',
          expected: `>= ${rules.age.min}`,
          actual: userAge,
          message: `Age must be at least ${rules.age.min} years (provided: ${userAge}).`,
        });
      }
      if (rules.age.max !== null && userAge > rules.age.max) {
        reasons.push({
          field: 'age',
          expected: `<= ${rules.age.max}`,
          actual: userAge,
          message: `Age cannot exceed ${rules.age.max} years (provided: ${userAge}).`,
        });
      }
    }
  }

  // 2. Evaluate Annual Income
  if (rules.annualIncome) {
    const userIncome = userProfile.annualIncome !== undefined && userProfile.annualIncome !== null ? Number(userProfile.annualIncome) : null;
    if (userIncome === null) {
      missingInformation.push('annualIncome');
    } else {
      if (rules.annualIncome.max !== null && userIncome > rules.annualIncome.max) {
        reasons.push({
          field: 'annualIncome',
          expected: `<= ${rules.annualIncome.max}`,
          actual: userIncome,
          message: `Annual income exceeds scheme limit of ₹${rules.annualIncome.max.toLocaleString('en-IN')} (provided: ₹${userIncome.toLocaleString('en-IN')}).`,
        });
      }
      if (rules.annualIncome.min !== null && userIncome < rules.annualIncome.min) {
        reasons.push({
          field: 'annualIncome',
          expected: `>= ${rules.annualIncome.min}`,
          actual: userIncome,
          message: `Annual income must be at least ₹${rules.annualIncome.min.toLocaleString('en-IN')} (provided: ₹${userIncome.toLocaleString('en-IN')}).`,
        });
      }
    }
  }

  // 3. Evaluate Gender
  if (rules.gender && rules.gender.length > 0 && !rules.gender.includes('all')) {
    const userGender = userProfile.gender ? String(userProfile.gender).toLowerCase().trim() : null;
    if (!userGender) {
      missingInformation.push('gender');
    } else if (!rules.gender.includes(userGender)) {
      reasons.push({
        field: 'gender',
        expected: rules.gender.join(', '),
        actual: userProfile.gender,
        message: `Scheme is restricted to ${rules.gender.join(', ')} applicants (provided: ${userProfile.gender}).`,
      });
    }
  }

  // 4. Evaluate State
  if (rules.states && rules.states.length > 0 && !rules.states.includes('all') && !rules.states.includes('national')) {
    const userState = userProfile.state ? String(userProfile.state).toLowerCase().trim() : null;
    if (!userState) {
      missingInformation.push('state');
    } else if (!rules.states.includes(userState)) {
      reasons.push({
        field: 'state',
        expected: rules.states.join(', '),
        actual: userProfile.state,
        message: `Scheme is only applicable in ${rules.states.join(', ')} (provided: ${userProfile.state}).`,
      });
    }
  }

  // 5. Evaluate Social Category
  if (rules.categories && rules.categories.length > 0 && !rules.categories.includes('all')) {
    const userCat = userProfile.category ? String(userProfile.category).toLowerCase().trim() : null;
    if (!userCat) {
      missingInformation.push('category');
    } else if (!rules.categories.includes(userCat)) {
      reasons.push({
        field: 'category',
        expected: rules.categories.join(', '),
        actual: userProfile.category,
        message: `Scheme is reserved for ${rules.categories.join(', ')} category (provided: ${userProfile.category}).`,
      });
    }
  }

  // 6. Evaluate Occupation
  if (rules.occupations && rules.occupations.length > 0 && !rules.occupations.includes('all')) {
    const userOcc = userProfile.occupation ? String(userProfile.occupation).toLowerCase().trim() : null;
    if (!userOcc) {
      missingInformation.push('occupation');
    } else if (!rules.occupations.includes(userOcc)) {
      reasons.push({
        field: 'occupation',
        expected: rules.occupations.join(', '),
        actual: userProfile.occupation,
        message: `Scheme requires occupation to be ${rules.occupations.join(', ')} (provided: ${userProfile.occupation}).`,
      });
    }
  }

  // 7. Evaluate Farmer Boolean
  if (rules.farmer === true) {
    if (userProfile.farmer === undefined || userProfile.farmer === null) {
      missingInformation.push('farmer');
    } else if (userProfile.farmer !== true) {
      reasons.push({
        field: 'farmer',
        expected: true,
        actual: userProfile.farmer,
        message: 'Applicant must be an agricultural farmer.',
      });
    }
  }

  // 8. Evaluate Student Boolean
  if (rules.student === true) {
    if (userProfile.student === undefined || userProfile.student === null) {
      missingInformation.push('student');
    } else if (userProfile.student !== true) {
      reasons.push({
        field: 'student',
        expected: true,
        actual: userProfile.student,
        message: 'Applicant must be an active student enrolled in recognized institution.',
      });
    }
  }

  // 9. Evaluate Disability Boolean
  if (rules.disability === true) {
    if (userProfile.disability === undefined || userProfile.disability === null) {
      missingInformation.push('disability');
    } else if (userProfile.disability !== true) {
      reasons.push({
        field: 'disability',
        expected: true,
        actual: userProfile.disability,
        message: 'Applicant must have a recognized disability.',
      });
    }
  }

  // Status calculation
  let status;
  let eligible;

  if (reasons.length > 0) {
    status = 'ineligible';
    eligible = false;
  } else if (missingInformation.length > 0) {
    status = 'missing_information';
    eligible = false;
  } else {
    status = 'eligible';
    eligible = true;
  }

  return {
    eligible,
    status,
    reasons,
    missingInformation,
  };
};

module.exports = {
  evaluateEligibility,
  validateUserProfile,
  ValidationError,
};
