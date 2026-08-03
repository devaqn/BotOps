export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(message, 404);
  }

  static unauthorized(message = 'Não autenticado') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Sem permissão para esta ação') {
    return new AppError(message, 403);
  }

  static conflict(message = 'Conflito com o estado atual') {
    return new AppError(message, 409);
  }

  static unprocessable(message = 'Dados inválidos', details?: unknown) {
    return new AppError(message, 422, details);
  }
}
