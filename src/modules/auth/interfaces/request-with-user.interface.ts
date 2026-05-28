import { Request } from 'express';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';

export interface RequestWithUser extends Request {
  user: JwtUser;
  requestId?: string;
}
