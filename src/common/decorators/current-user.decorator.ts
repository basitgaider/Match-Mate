import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | string => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;
    return (data ? user[data] : user) as User | string;
  },
);
