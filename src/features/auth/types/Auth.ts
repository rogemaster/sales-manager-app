import { SUB_USER_GRADES, USER_GRADES } from '../constant/grade.constant';

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

export type UserGrade = (typeof USER_GRADES)[number];
export type SubUserGrade = (typeof SUB_USER_GRADES)[number];

export interface User {
  email: string;
  name: string;
  avatar: string;
  phone: string;
  bio: string;
  company: string;
  location: string;
  grade: UserGrade;
}