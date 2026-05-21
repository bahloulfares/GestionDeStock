import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Accepts string literals ('ADMIN', 'EMPLOYEE') to avoid isolatedModules issues
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
