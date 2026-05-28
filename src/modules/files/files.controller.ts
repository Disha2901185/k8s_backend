import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Files')
@Controller({ path: 'files', version: '1' })
export class FilesController {
  @ApiBearerAuth()
  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (e.g. PO document)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/po-documents',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          return cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/i)) {
          return cb(new BadRequestException('Only JPG, JPEG, PNG and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!file.size) {
      throw new BadRequestException('Uploaded file is empty');
    }
    
    // Return the URL to access the file
    // In a real app, this might be an absolute URL or a relative path
    // For now, we'll return the relative path that will be served statically
    const fileUrl = `/uploads/po-documents/${file.filename}`;
    
    return {
      url: fileUrl,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @ApiBearerAuth()
  @Post('upload/tenant-logo')
  @ApiOperation({ summary: 'Upload tenant logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/tenant-logos',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          return cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
          return cb(new BadRequestException('Only JPG, JPEG and PNG files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadTenantLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!file.size) {
      if (file.path) {
        await fs.unlink(file.path).catch(() => undefined);
      }
      throw new BadRequestException('Uploaded file is empty');
    }

    return {
      url: `/uploads/tenant-logos/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
