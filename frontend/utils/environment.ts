export const isDevelopment = process.env.NODE_ENV === 'development';

export const isProduction = process.env.NODE_ENV === 'production';

export const isTest = process.env.NODE_ENV === 'test';

export const getEnvironment = () => {
  if (isDevelopment) return 'development';
  if (isProduction) return 'production';
  if (isTest) return 'test';
  return 'unknown';
}; 