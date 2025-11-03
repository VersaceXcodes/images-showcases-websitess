import { z } from 'zod';

/* --------------------------------------------------------------------------- */
/*                          USERS TABLE SCHEMAS                               */
/* --------------------------------------------------------------------------- */

// Entity schema (exact mapping of the `users` table)
export const usersEntitySchema = z.object({
  user_id: z.string().trim().nonempty(),
  email: z.string().email().trim().nonempty(),
  password_hash: z.string().trim().nonempty(),
  name: z.string().trim().nullable(),
  profile_photo_url: z.string().url().trim().nullable(),
  bio: z.string().trim().nullable(),
  contact_link: z.string().url().trim().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type UsersEntity = z.infer<typeof usersEntitySchema>;

// Input schema for creating a user
export const createUserInputSchema = z.object({
  email: z.string().email().trim().nonempty(),
  password_hash: z.string().min(8).trim().nonempty(),
  name: z.string().trim().nullable(),
  profile_photo_url: z.string().url().trim().nullable(),
  bio: z.string().trim().nullable(),
  contact_link: z.string().url().trim().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating a user
export const updateUserInputSchema = z.object({
  user_id: z.string().trim().nonempty(),
  email: z.string().email().trim().nullable().optional(),
  password_hash: z.string().min(8).trim().nullable().optional(),
  name: z.string().trim().nullable().optional(),
  profile_photo_url: z.string().url().trim().nullable().optional(),
  bio: z.string().trim().nullable().optional(),
  contact_link: z.string().url().trim().nullable().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Query schema for searching users
export const searchUsersQuerySchema = z.object({
  email: z.string().email().trim().optional(),
  name: z.string().trim().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['user_id', 'email', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

/* --------------------------------------------------------------------------- */
/*                         GALLERIES TABLE SCHEMAS                            */
/* --------------------------------------------------------------------------- */

export const galleriesEntitySchema = z.object({
  gallery_id: z.string().trim().nonempty(),
  user_id: z.string().trim().nonempty(),
  title: z.string().trim().nonempty(),
  description: z.string().trim().nullable(),
  template_name: z.string().trim().nonempty(),
  visibility: z.enum(['public', 'private', 'friends']),
  is_published: z.boolean(),
  view_count: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type GalleriesEntity = z.infer<typeof galleriesEntitySchema>;

export const createGalleryInputSchema = z.object({
  user_id: z.string().trim().nonempty(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().nullable(),
  template_name: z.string().trim().nonempty(),
  visibility: z.enum(['public', 'private', 'friends']),
  is_published: z.boolean().optional(),
});
export type CreateGalleryInput = z.infer<typeof createGalleryInputSchema>;

export const updateGalleryInputSchema = z.object({
  gallery_id: z.string().trim().nonempty(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  template_name: z.string().trim().optional(),
  visibility: z.enum(['public', 'private', 'friends']).optional(),
  is_published: z.boolean().optional(),
});
export type UpdateGalleryInput = z.infer<typeof updateGalleryInputSchema>;

export const searchGalleriesQuerySchema = z.object({
  user_id: z.string().trim().optional(),
  title: z.string().trim().optional(),
  visibility: z.enum(['public', 'private', 'friends']).optional(),
  is_published: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['gallery_id', 'title', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchGalleriesQuery = z.infer<typeof searchGalleriesQuerySchema>;

/* --------------------------------------------------------------------------- */
/*                           IMAGES TABLE SCHEMAS                              */
/* --------------------------------------------------------------------------- */

export const imagesEntitySchema = z.object({
  image_id: z.string().trim().nonempty(),
  gallery_id: z.string().trim().nonempty(),
  file_url: z.string().url().trim().nonempty(),
  title: z.string().trim().nonempty(),
  description: z.string().trim().nullable(),
  alt_text: z.string().trim().nonempty(),
  tags: z
    .array(z.string().trim())
    .nullable()
    .refine((tags) => !tags || tags.length > 0, {
      message: 'tags array must contain at least one string when provided',
    }),
  order_index: z.number().int().positive(),
  created_at: z.coerce.date(),
});
export type ImagesEntity = z.infer<typeof imagesEntitySchema>;

export const createImageInputSchema = z.object({
  gallery_id: z.string().trim().nonempty(),
  file_url: z.string().url().trim().nonempty(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().nullable(),
  alt_text: z.string().trim().min(1).max(255),
  tags: z
    .array(z.string().trim())
    .min(1, { message: 'tags must contain at least one string' })
    .nullable(),
  order_index: z.number().int().positive(),
});
export type CreateImageInput = z.infer<typeof createImageInputSchema>;

export const updateImageInputSchema = z.object({
  image_id: z.string().trim().nonempty(),
  file_url: z.string().url().trim().nullable().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  alt_text: z.string().trim().min(1).max(255).optional(),
  tags: z
    .array(z.string().trim())
    .min(1, { message: 'tags must contain at least one string' })
    .nullable()
    .optional(),
  order_index: z.number().int().positive().optional(),
});
export type UpdateImageInput = z.infer<typeof updateImageInputSchema>;

export const searchImagesQuerySchema = z.object({
  gallery_id: z.string().trim().optional(),
  title: z.string().trim().optional(),
  tags_includes: z.string().trim().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['image_id', 'title', 'created_at', 'order_index'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchImagesQuery = z.infer<typeof searchImagesQuerySchema>;

/* --------------------------------------------------------------------------- */
/*                   EMAIL VERIFICATION TOKENS TABLE SCHEMAS                  */
/* --------------------------------------------------------------------------- */

export const emailVerificationTokensEntitySchema = z.object({
  token: z.string().trim().nonempty(),
  user_id: z.string().trim().nonempty(),
  expires_at: z.coerce.date(),
  used: z.boolean(),
});
export type EmailVerificationTokensEntity =
  z.infer<typeof emailVerificationTokensEntitySchema>;

export const createEmailVerificationTokenInputSchema = z.object({
  token: z.string().trim().nonempty(),
  user_id: z.string().trim().nonempty(),
  expires_at: z.coerce.date(),
});
export type CreateEmailVerificationTokenInput =
  z.infer<typeof createEmailVerificationTokenInputSchema>;

export const updateEmailVerificationTokenInputSchema = z.object({
  token: z.string().trim().nonempty(),
  used: z.boolean().optional(),
});
export type UpdateEmailVerificationTokenInput =
  z.infer<typeof updateEmailVerificationTokenInputSchema>;

export const searchEmailVerificationTokensQuerySchema = z.object({
  user_id: z.string().trim().optional(),
  used: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['token', 'expires_at', 'created_at']).default('expires_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchEmailVerificationTokensQuery =
  z.infer<typeof searchEmailVerificationTokensQuerySchema>;

/* --------------------------------------------------------------------------- */
/*                   PASSWORD RESET TOKENS TABLE SCHEMAS                       */
/* --------------------------------------------------------------------------- */

export const passwordResetTokensEntitySchema = z.object({
  token: z.string().trim().nonempty(),
  user_id: z.string().trim().nonempty(),
  expires_at: z.coerce.date(),
  used: z.boolean(),
});
export type PasswordResetTokensEntity =
  z.infer<typeof passwordResetTokensEntitySchema>;

export const createPasswordResetTokenInputSchema = z.object({
  token: z.string().trim().nonempty(),
  user_id: z.string().trim().nonempty(),
  expires_at: z.coerce.date(),
});
export type CreatePasswordResetTokenInput =
  z.infer<typeof createPasswordResetTokenInputSchema>;

export const updatePasswordResetTokenInputSchema = z.object({
  token: z.string().trim().nonempty(),
  used: z.boolean().optional(),
});
export type UpdatePasswordResetTokenInput =
  z.infer<typeof updatePasswordResetTokenInputSchema>;

export const searchPasswordResetTokensQuerySchema = z.object({
  user_id: z.string().trim().optional(),
  used: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['token', 'expires_at', 'created_at']).default('expires_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchPasswordResetTokensQuery =
  z.infer<typeof searchPasswordResetTokensQuerySchema>;

/* --------------------------------------------------------------------------- */
/*                            VIEW LOGS TABLE SCHEMAS                           */
/* --------------------------------------------------------------------------- */

export const viewLogsEntitySchema = z.object({
  view_id: z.string().trim().nonempty(),
  gallery_id: z.string().trim().nonempty(),
  ip_address: z.string().trim().nonempty(),
  created_at: z.coerce.date(),
});
export type ViewLogsEntity = z.infer<typeof viewLogsEntitySchema>;

export const createViewLogInputSchema = z.object({
  view_id: z.string().trim().nonempty(),
  gallery_id: z.string().trim().nonempty(),
  ip_address: z.string().trim().nonempty(),
});
export type CreateViewLogInput = z.infer<typeof createViewLogInputSchema>;

export const updateViewLogInputSchema = z.object({
  view_id: z.string().trim().nonempty(),
  ip_address: z.string().trim().optional(),
});
export type UpdateViewLogInput = z.infer<typeof updateViewLogInputSchema>;

export const searchViewLogsQuerySchema = z.object({
  gallery_id: z.string().trim().optional(),
  ip_address: z.string().trim().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['view_id', 'gallery_id', 'ip_address', 'created_at'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchViewLogsQuery = z.infer<typeof searchViewLogsQuerySchema>;