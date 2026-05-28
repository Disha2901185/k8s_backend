import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { LeadApiCredentialDto } from 'src/modules/auth/dto/lead-api-credential.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { RefreshDto } from 'src/modules/auth/dto/refresh.dto';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { TokenResponseDto } from 'src/modules/auth/dto/token-response.dto';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { RequestWithUser } from 'src/modules/auth/interfaces/request-with-user.interface';
import { AuthService } from 'src/modules/auth/auth.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register First Tenant User' })
  @ApiOkResponse({ type: TokenResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setCookies(response, result);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login User' })
  @ApiOkResponse({ type: TokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: this.normalizeHeader(request.headers['user-agent']),
    });

    this.setCookies(response, result);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiOkResponse({ type: TokenResponseDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto.refreshToken || request.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const result = await this.authService.refresh(refreshToken, {
      ipAddress: request.ip,
      userAgent: this.normalizeHeader(request.headers['user-agent']),
    });

    this.setCookies(response, result);
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout User' })
  @ApiBearerAuth()
  async logout(
    @CurrentUser() user: JwtUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user);
    this.clearCookies(response);
    return { success: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get Current User' })
  @ApiBearerAuth()
  getMe(@CurrentUser() user: JwtUser) {
    return this.authService.getMe(user);
  }

  @Get('lead-api-credential')
  @Roles('admin')
  @Permissions('read:system.my-keys')
  @ApiOperation({ summary: 'Get Current Tenant Lead API Credential' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: LeadApiCredentialDto })
  getLeadApiCredential(@CurrentUser() user: JwtUser) {
    return this.authService.getLeadApiCredential(user);
  }

  @Get('session')
  @ApiOperation({ summary: 'Silent Session Check' })
  async getSession(@Req() request: RequestWithUser) {
    const token = request.cookies?.accessToken;
    const user = await this.authService.validateSession(token);
    return { user };
  }

  private setCookies(response: Response, result: TokenResponseDto) {
    const isProduction = process.env.NODE_ENV != 'development';

    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });
  }

  private clearCookies(response: Response) {
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
  }

  private normalizeHeader(header: string | string[] | undefined) {
    if (Array.isArray(header)) {
      return header[0];
    }

    return header;
  }
}

