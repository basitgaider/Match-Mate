import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ROUTES } from '../constants/routes';

@Controller(ROUTES.AUTH.ROOT)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(ROUTES.AUTH.REGISTER)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post(ROUTES.AUTH.LOGIN)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
