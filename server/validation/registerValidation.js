const Joi = require("joi");
const registerValidation = Joi.object({
  username: Joi.string().trim().min(3).max(30).required(),
  password: Joi.string().required().min(8),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      minDomainSegments: 2,
    })
    .required(),
});

module.exports = registerValidation;
