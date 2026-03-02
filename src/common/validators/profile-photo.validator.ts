import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const MAX_PROFILE_PHOTO_LENGTH = 7_000_000; // ~5MB image as base64
const DATA_URL_IMAGE_PREFIX = 'data:image/';
const BASE64_MARKER = ';base64,';

function isUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isDataUrlBase64Image(value: string): boolean {
  if (!value.startsWith(DATA_URL_IMAGE_PREFIX)) return false;
  const base64Index = value.indexOf(BASE64_MARKER);
  if (base64Index === -1) return false;
  const payload = value.slice(base64Index + BASE64_MARKER.length);
  return /^[A-Za-z0-9+/]*={0,2}$/.test(payload.replace(/\s/g, ''));
}

function isRawBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(value.replace(/\s/g, '')) && value.length > 0;
}

export function IsProfilePhoto(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isProfilePhoto',
      target: object.constructor,
      propertyName,
      options: validationOptions ?? {
        message:
          'profilePhoto must be a valid HTTP(S) URL, a data URL (data:image/...;base64,...), or a raw base64 string',
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return false;
          if (value.length > MAX_PROFILE_PHOTO_LENGTH) return false;
          return isUrl(value) || isDataUrlBase64Image(value) || isRawBase64(value);
        },
      },
    });
  };
}
