import { z } from "zod";

export const createInquirySchema = z.object({
  locale: z.enum(["zh", "en", "ru"]),
  productId: z.string().min(1).max(64).optional(),
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  phoneOrWhatsapp: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100),
  quantity: z.string().trim().max(80).optional().or(z.literal("")),
  requirements: z.string().trim().min(10).max(5000),
  privacyConsent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
  idempotencyKey: z.uuid(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
