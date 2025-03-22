// Required for proper MSW setup with Jest
module.exports = async () => {
  // Set up environment variables or global polyfills if needed
  if (typeof window === 'undefined') {
    global.Response = global.Response || class {
      constructor(body, init) {
        this.body = body;
        this.init = init;
      }
    };
    global.Request = global.Request || class {};
    global.Headers = global.Headers || class {};
    global.fetch = global.fetch || (() => {});
  }
}; 