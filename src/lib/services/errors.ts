export class ServiceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.name = "ServiceError"; this.code = code; this.status = status; }
}
export const notFound = (what: string) => new ServiceError("not_found", `${what} not found`, 404);
export const forbidden = (msg = "You can't do that") => new ServiceError("forbidden", msg, 403);
export const conflict = (code: string, msg: string) => new ServiceError(code, msg, 409);
