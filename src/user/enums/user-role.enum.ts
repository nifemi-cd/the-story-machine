/**
 * What an account is allowed to do beyond the basics.
 * Every user can read and write stories, so "reader" and "author" aren't
 * roles; whether someone is an author comes from the stories they own.
 */
export enum UserRole {
  // Default for every new account
  User = 'user',
  // For moderating content and managing users, once those features exist
  Admin = 'admin',
}
