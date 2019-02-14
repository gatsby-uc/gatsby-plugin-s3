export const withoutLeadingSlash = (string: string) => string.startsWith('/') ? string.substring(1) : string;
export const withoutTrailingSlash = (string: string) => string.endsWith('/') ? string.substring(0, string.length - 1) : string;
export const withTrailingSlash = (string: string) => string.endsWith('/') ? string : (string + '/');