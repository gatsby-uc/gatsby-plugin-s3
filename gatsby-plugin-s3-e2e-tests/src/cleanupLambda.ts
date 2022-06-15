import { cleanupExistingBuckets } from './helpers';

export default async () => {
    await cleanupExistingBuckets(true);
};
