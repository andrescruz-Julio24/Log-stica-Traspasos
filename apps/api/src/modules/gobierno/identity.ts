import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type Identity = { name: string; role: 'operator' | 'supervisor' };
export type OperatorRequest = Request & { identity?: Identity };
export function accounts(): Record<
  string,
  { token: string; role: Identity['role'] }
> {
  const value = JSON.parse(process.env.SGTL_ACCOUNTS || '{}');
  const tokens = new Set<string>();
  for (const [name, account] of Object.entries(value) as [
    string,
    { token: string; role: string },
  ][]) {
    if (
      !name.trim() ||
      !['operator', 'supervisor'].includes(account.role) ||
      typeof account.token !== 'string' ||
      account.token.length < 24 ||
      tokens.has(account.token)
    )
      throw Error('Configuración de operadores inválida');
    tokens.add(account.token);
  }
  return value;
}
export function identify(
  req: OperatorRequest,
  res: Response,
  next: NextFunction,
) {
  const list = Object.entries(accounts());
  delete req.headers['x-demo-actor'];
  if (!list.length) return next();
  const digest = (s: string) => createHash('sha256').update(s).digest();
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || '';
  const found = list.find(([, a]) =>
    timingSafeEqual(digest(a.token), digest(supplied)),
  );
  if (!found)
    return res
      .status(401)
      .json({ message: 'Credencial de operador requerida' });
  const [name, { role }] = found;
  req.identity = { name, role };
  req.headers['x-demo-actor'] = name;
  next();
}
export function operator(req: OperatorRequest, supervisor = false) {
  if (!req.identity)
    throw new UnauthorizedException(
      'Configura credenciales individuales para esta operación',
    );
  if (supervisor && req.identity.role !== 'supervisor')
    throw new ForbiddenException('Se requiere supervisor');
  return req.identity.name;
}
