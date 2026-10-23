/**
 * Safe Variable Templating Engine
 *
 * Resolves expressions such as:
 * - {{ trigger.userId }}
 * - {{ nodes.fetchUser.output.email }}
 * - {{ nodes.step1.output.items[0].id }}
 *
 * STRICT SECURITY DIRECTIVE:
 * Never use eval(), new Function(), or execute unsanitized strings.
 * All property access is purely functional via bounded path traversal with
 * prototype-pollution guards.
 */

const BLOCKED_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Safely parses property path strings such as:
 * "trigger.userId"
 * "nodes.fetch.output.items[0].name"
 * "nodes.fetch.output.items.0.name"
 */
function parsePath(path: string): string[] {
  // Normalize array syntax foo[0] -> foo.0
  const normalized = path.replace(/\[(\d+)\]/g, '.$1').trim();
  return normalized.split('.').filter((seg) => seg.length > 0);
}

/**
 * Safely traverses an object along a property path without risk of prototype pollution.
 */
export function getByPath(target: any, path: string): any {
  if (target === null || target === undefined || typeof path !== 'string') {
    return undefined;
  }

  const segments = parsePath(path);
  let current = target;

  for (const seg of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (BLOCKED_PROPERTIES.has(seg)) {
      return undefined;
    }

    if (typeof current !== 'object' && typeof current !== 'function') {
      return undefined;
    }

    current = current[seg];
  }

  return current;
}

/**
 * Resolves template expressions inside a template value using the provided context.
 *
 * If the input is a single exact expression like "{{ trigger.data }}", the raw value
 * (object, number, boolean, array, etc.) is preserved without stringification.
 * If the input is a composite string like "Hello {{ trigger.name }}", values are converted to strings.
 * If the input is an object or array, all nested values are resolved recursively.
 */
export function resolveTemplate(template: any, context: Record<string, any>): any {
  if (template === null || template === undefined) {
    return template;
  }

  // Handle primitives other than strings
  if (typeof template !== 'string') {
    if (Array.isArray(template)) {
      return template.map((item) => resolveTemplate(item, context));
    }
    if (typeof template === 'object') {
      const resolvedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(template)) {
        resolvedObj[key] = resolveTemplate(val, context);
      }
      return resolvedObj;
    }
    return template;
  }

  const trimmed = template.trim();
  // Regex to match a single standalone expression: e.g. "{{ trigger.user }}"
  const singleMatch = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(trimmed);

  if (singleMatch) {
    const rawVal = getByPath(context, singleMatch[1]);
    return rawVal !== undefined ? rawVal : '';
  }

  // Multi-expression string interpolation: e.g. "Hello {{ trigger.name }} (id: {{ trigger.id }})"
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, exprPath) => {
    const val = getByPath(context, exprPath);
    if (val === undefined || val === null) {
      return '';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  });
}
