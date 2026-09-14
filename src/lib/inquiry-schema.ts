import { z } from "zod";
import { locales } from "@/types/domain";

export const createInquirySchema = z.object({
  locale: z.enum(locales),
  productId: z.string().min(1).max(64).optional(),
  interestedCategoryId: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  phoneOrWhatsapp: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100),
  requirements: z.string().trim().min(10).max(5000),
  privacyConsent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
  idempotencyKey: z.uuid(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
