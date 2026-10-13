// Validation Middleware for Authentication Requests

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const allowedLanguages = ['English', 'Hindi', 'Telugu'];

const validateRegister = (req, res, next) => {
  const { name, email, password, preferredLanguage } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Name is required and cannot be empty',
    });
  }

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'A valid email address is required',
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password is required and must be at least 6 characters long',
    });
  }

  if (preferredLanguage && !allowedLanguages.includes(preferredLanguage)) {
    return res.status(400).json({
      success: false,
      message: `Preferred language must be one of: ${allowedLanguages.join(', ')}`,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'A valid email address is required',
    });
  }

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Password is required',
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
