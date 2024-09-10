export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 2000
) => {
  const controller = new AbortController();
  const { signal } = controller;
  const fetchPromise = fetch(url, { ...options, signal });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeout)
  );

  return Promise.race([fetchPromise, timeoutPromise]);
};
