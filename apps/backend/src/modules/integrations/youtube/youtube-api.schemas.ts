import { z } from 'zod'

export const YouTubeApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.number().int(),
    errors: z
      .array(
        z.object({
          domain: z.string().optional(),
          message: z.string().optional(),
          reason: z.string().optional(),
        }),
      )
      .default([]),
    message: z.string().min(1),
  }),
})

export const YouTubeBroadcastListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      snippet: z.object({
        channelId: z.string().min(1),
        liveChatId: z.string().min(1).optional(),
        scheduledStartTime: z.iso.datetime().optional(),
        title: z.string().min(1),
      }),
    }),
  ),
})

export const YouTubeLiveChatItemSchema = z.object({
  authorDetails: z
    .object({
      channelId: z.string().min(1),
      displayName: z.string().min(1),
      isChatModerator: z.boolean().default(false),
      isChatOwner: z.boolean().default(false),
      isChatSponsor: z.boolean().default(false),
      profileImageUrl: z.url().nullable().default(null),
    })
    .optional(),
  id: z.string().min(1),
  snippet: z.object({
    displayMessage: z.string().optional(),
    publishedAt: z.string().min(1).optional(),
    type: z.string(),
  }),
})

export const YouTubeLiveChatResponseSchema = z.object({
  items: z.array(z.unknown()),
  nextPageToken: z.string().optional(),
  pollingIntervalMillis: z.number().int().nonnegative().default(5_000),
})
