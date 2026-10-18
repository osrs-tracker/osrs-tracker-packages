export { metricsMiddleware } from './metrics-middleware.js';
export type { MetricsMiddlewareOptions } from './metrics-middleware.js';

// For each app's own metrics, registered on the same registry
export { Counter, Gauge, register, Registry } from '@prometheus-io/client';
