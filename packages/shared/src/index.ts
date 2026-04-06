export const UCZBK_VERSION = "0.1.0";

export {
  buildFeedImportCanonicalProductSlugBase,
  isGenericFeedImportBrandPhrase,
  normalizeFeedBrandMatchKey,
  type FeedImportSlugInput
} from "./feedImportBrandSlug";

export {
  extractFeedBrandFromSpecsJson,
  matchCanonicalBrandForFeedImport,
  type BrandRowForFeedImport
} from "./feedImportBrandMatch";

export {
  brandDisplayNameFromRaw,
  classifyFeedBrandSuggestion,
  isFeedBrandChannelOrStoreNoiseNormalized,
  type FeedBrandClassification,
  type FeedBrandSuggestionClass
} from "./feedBrandClassification";

export {
  slugifyCanonical,
  normalizeProductTitle,
  normalizeProductTitleForMatching,
  normalizeEanDigits,
  normalizeModelNumberForMatch,
  normalizeBrandText,
  brandStemKeyForMatch,
  normalizeCategoryText,
  AUTO_CATEGORY_MATCH_THRESHOLD,
  CATEGORY_SUGGESTION_STRONG,
  CATEGORY_SUGGESTION_OK,
  bigramDiceSimilarity,
  normalizeForCategorySimilarityQuery,
  scoreQueryAgainstCanonical,
  lastCategorySegmentForSimilarity,
  bestCanonicalCategoryBySimilarity,
  extractModelNumber,
  isValidCanonicalSlug,
  CANONICAL_SLUG_PATTERN
} from "./catalog";

export {
  EMAIL_QUEUE_NAME,
  type EmailJobName,
  type WelcomeEmailJobData,
  type ResetPasswordEmailJobData,
  type VerifyEmailJobData,
  type PriceAlertEmailJobData,
  type TestEmailJobData,
  type BulkEmailBatchJobData
} from "./email-queue";

export {
  bullmqConnectionProducer,
  bullmqConnectionWorker,
  bullmqConnectionSummary,
  resolveRedisConnectionOptions,
  redisUrlForNodeRedis,
  type BullmqRedisOptions,
  type RedisConnectionOptions
} from "./bullmq-redis";

export {
  PASSWORD_RESET_TOKEN_TTL_ENV_KEY,
  PASSWORD_RESET_TTL_DEFAULT_SEC,
  PASSWORD_RESET_TTL_MIN_SEC,
  PASSWORD_RESET_TTL_MAX_SEC,
  resolvePasswordResetTtlSeconds
} from "./password-reset-ttl";

export {
  EMAIL_VERIFICATION_TOKEN_TTL_ENV_KEY,
  EMAIL_VERIFICATION_TTL_DEFAULT_SEC,
  EMAIL_VERIFICATION_TTL_MIN_SEC,
  EMAIL_VERIFICATION_TTL_MAX_SEC,
  resolveEmailVerificationTtlSeconds
} from "./email-verification-ttl";

export {
  CANONICAL_STOREFRONT_PRODUCTION,
  resolveStorefrontBaseUrlForBackend,
  resolveStorefrontBaseUrlForWeb
} from "./storefront-url";
