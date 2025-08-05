export interface LoginInfo {
  email: string;
  password: string;
}

export interface Errors {
  email?: string;
  password?: string;
  general?: string
}

export interface ValidationResult {
  isValid: boolean;
  error: Errors;
}

export interface User {
  email: string;
  name: string;
  avatar: string;
  phone: string;
  bio: string;
  company: string;
  location: string;
}