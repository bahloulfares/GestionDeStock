import { SetMetadata } from '@nestjs/common';

export const SKIP_SUBSCRIPTION_KEY = 'skipSubscription';
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);
