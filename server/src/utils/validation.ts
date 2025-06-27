import Joi from 'joi';

export const authValidation = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const roomValidation = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    language: Joi.string().default('javascript'),
    isPrivate: Joi.boolean().default(false),
    requiresApproval: Joi.boolean().default(false),
  }),
  
  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    language: Joi.string().optional(),
    isPrivate: Joi.boolean().optional(),
    requiresApproval: Joi.boolean().optional(),
  }),
  
  join: Joi.object({
    roomId: Joi.string().required(),
  }),
};

export const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return value;
}; 