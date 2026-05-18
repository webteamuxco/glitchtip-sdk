'use server';

export async function throwOnServer() {
  throw new Error('Demo: thrown inside a Next.js server action');
}
