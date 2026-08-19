import { SetMetadata } from '@nestjs/common'

export const LOCAL_PUBLIC_METADATA = 'streamlet:local-public'
export const LocalPublic = () => SetMetadata(LOCAL_PUBLIC_METADATA, true)
