"use server";

import { searchCompanies } from "@/db/queries";

export async function searchCompaniesAction(query: string) {
  if (query.trim().length < 1) return [];
  return searchCompanies(query);
}
