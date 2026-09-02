const Joi = require("joi");

const loginValidation = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      minDomainSegments: 2,
    })
    .required(),
  password: Joi.string().required(),
});

module.exports = loginValidation;
