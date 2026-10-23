import { NodeExecutor } from './types';
import { resolveTemplate } from '../engine/templating';

/**
 * HTTP Node Executor
 * Executes outbound HTTP requests using native fetch and AbortController.
 */
export const executeHttp: NodeExecutor = async (node, context) => {
  const config = node.config || {};
  const rawUrl = config.url;

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error(`HTTP node "${node.id}" has no URL configured`);
  }

  // Resolve templated variables in URL
  const resolvedUrl = String(resolveTemplate(rawUrl, context)).trim();
  if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    throw new Error(`HTTP node "${node.id}" contains invalid URL: "${resolvedUrl}"`);
  }

  const method = (typeof config.method === 'string' ? config.method : 'GET').toUpperCase();

  // Determine timeout (default 10s = 10,000ms, capped between 500ms and 30,000ms)
  let timeoutMs = 10000;
  if (typeof config.timeout === 'number') {
    // If config.timeout <= 60, assume seconds; otherwise assume ms
    timeoutMs = config.timeout <= 60 ? config.timeout * 1000 : config.timeout;
    timeoutMs = Math.max(500, Math.min(timeoutMs, 30000));
  }

  // Resolve headers
  const headers: Record<string, string> = {};
  if (config.headers && typeof config.headers === 'object') {
    for (const [key, val] of Object.entries(config.headers)) {
      headers[key] = String(resolveTemplate(val, context));
    }
  }

  // Resolve body for payload-carrying methods
  let body: any = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && config.body !== undefined) {
    const resolvedBody = resolveTemplate(config.body, context);
    if (typeof resolvedBody === 'object' && resolvedBody !== null) {
      body = JSON.stringify(resolvedBody);
      const hasContentType = Object.keys(headers).some(
        (h) => h.toLowerCase() === 'content-type'
      );
      if (!hasContentType) {
        headers['Content-Type'] = 'application/json';
      }
    } else if (typeof resolvedBody === 'string') {
      body = resolvedBody;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(resolvedUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

    if (!response.ok) {
      const preview =
        typeof responseData === 'string'
          ? responseData.slice(0, 300)
          : JSON.stringify(responseData).slice(0, 300);
      throw new Error(
        `HTTP request to "${resolvedUrl}" failed with status ${response.status} (${response.statusText}): ${preview}`
      );
    }

    // Capture response headers
    const resHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
      data: responseData,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        `HTTP request to "${resolvedUrl}" timed out after ${timeoutMs}ms`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
