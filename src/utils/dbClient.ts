export const db: never = (() => {
  throw new Error("Supabase has been removed. Use the MySQL-backed /api endpoints instead.");
})() as never;

export default db;
