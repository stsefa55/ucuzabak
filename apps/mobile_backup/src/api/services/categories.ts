import type { Category } from "../../lib/types";
import { mockCategories } from "../../lib/railsMock";
import { withMockDelay } from "../client";

export async function fetchCategories(): Promise<Category[]> {
  return withMockDelay(() => mockCategories);
}

