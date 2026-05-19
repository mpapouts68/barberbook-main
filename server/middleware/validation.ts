import { body, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";
import { validatePassword, validateEmail } from "../services/auth";

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({ 
      message: `Validation failed: ${errorMessages}`,
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .custom((password) => {
      const validation = validatePassword(password);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      return true;
    }),
  
  body("confirmPassword")
    .custom((value, { req }) => {
      // Only validate if confirmPassword is provided
      if (value !== undefined && value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  
  body("firstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name is too long")
    .matches(/^[a-zA-ZΑ-Ωα-ωίϊΐόάέύϋΰήώ\s]+$/)
    .withMessage("First name can only contain letters"),
  
  body("lastName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Last name is too long")
    .matches(/^[a-zA-ZΑ-Ωα-ωίϊΐόάέύϋΰήώ\s]*$/)
    .withMessage("Last name can only contain letters"),
  
  handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("password")
    .isLength({ min: 1 })
    .withMessage("Password is required"),
  
  handleValidationErrors
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .custom((password) => {
      const validation = validatePassword(password);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      return true;
    }),
  
  body("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Validation rules for updating user role
 */
export const validateRoleUpdate = [
  body("role")
    .isIn(["customer", "admin"])
    .withMessage("Role must be either 'customer' or 'admin'"),
  
  handleValidationErrors
];

/**
 * Sanitize and validate general text input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script[^>]*>.*?<\/script>/gi, "");
};


