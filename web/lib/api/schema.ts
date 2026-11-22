/** Convenience types from the generated OpenAPI schema. */

/** Convenience type for ScanRequest with proper typing. */
export type ScanRequest = import("./schema.d").components["schemas"]["ScanRequest"];

/** Convenience type for ScanResponse. */
export type ScanResponse = import("./schema.d").components["schemas"]["ScanResponse"];

/** Convenience type for ScanResult. */
export type ScanResult = import("./schema.d").components["schemas"]["ScanResult"];

/** Convenience type for ScanDetail. */
export type ScanDetail = import("./schema.d").components["schemas"]["ScanDetail"];

/** Convenience type for AnswerResult. */
export type AnswerResult = import("./schema.d").components["schemas"]["AnswerResult"];

/** Re-export the components type with a different name to avoid circularity. */
export type Components = import("./schema.d").components;