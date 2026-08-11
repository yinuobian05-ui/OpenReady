export class OpenReadyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OpenReadyError';
    this.code = code;
    this.expose = true;
  }
}
