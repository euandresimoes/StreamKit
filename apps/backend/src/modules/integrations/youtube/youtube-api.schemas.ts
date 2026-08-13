import { z } from 'zod'

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

export const YouTubeLiveChatResponseSchema = z.object({
  items: z.array(
    z.object({
      authorDetails: z.object({
        channelId: z.string().min(1),
        displayName: z.string().min(1),
        isChatModerator: z.boolean().default(false),
        isChatOwner: z.boolean().default(false),
        isChatSponsor: z.boolean().default(false),
        profileImageUrl: z.url().nullable().default(null),
      }),
      id: z.string().min(1),
      snippet: z.object({
        displayMessage: z.string().default(''),
        publishedAt: z.iso.datetime(),
        type: z.string(),
      }),
    }),
  ),
  nextPageToken: z.string().optional(),
  pollingIntervalMillis: z.number().int().min(1_000).default(5_000),
})
