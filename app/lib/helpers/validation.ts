// Validation helper functions

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
  // At least 8 characters, contains uppercase, lowercase, and number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate hex color format
 */
export function validateHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate widget position
 */
export function validateWidgetPosition(position: string): boolean {
  const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
  return validPositions.includes(position);
}

/**
 * Validate file type for uploads
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate required form fields
 */
export function validateRequiredFields(fields: Record<string, any>): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const [key, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(key);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Validate string length
 */
export function validateStringLength(str: string, minLength: number, maxLength?: number): boolean {
  if (str.length < minLength) return false;
  if (maxLength && str.length > maxLength) return false;
  return true;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate form data for login
 */
export function validateLoginForm(email: string, password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!email || !password) {
    errors.push('Email dan password harus diisi');
  }
  
  if (email && !validateEmail(email)) {
    errors.push('Format email tidak valid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate form data for registration
 */
export function validateRegistrationForm(
  email: string, 
  password: string, 
  confirmPassword: string, 
  companyName?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!email || !password || !confirmPassword) {
    errors.push('Email, password, dan konfirmasi password harus diisi');
  }
  
  if (companyName !== undefined && !companyName) {
    errors.push('Nama perusahaan harus diisi');
  }
  
  if (email && !validateEmail(email)) {
    errors.push('Format email tidak valid');
  }
  
  if (password && !validatePassword(password)) {
    errors.push('Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka');
  }
  
  if (password !== confirmPassword) {
    errors.push('Konfirmasi password tidak cocok');
  }
  
  if (companyName && !validateStringLength(companyName, 2)) {
    errors.push('Nama perusahaan minimal 2 karakter');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate widget configuration form
 */
export function validateWidgetConfigForm(data: {
  name: string;
  primaryColor: string;
  position: string;
  welcomeMessage: string;
  systemPrompt: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const requiredValidation = validateRequiredFields({
    name: data.name,
    primaryColor: data.primaryColor,
    position: data.position,
    welcomeMessage: data.welcomeMessage,
    systemPrompt: data.systemPrompt
  });
  
  if (!requiredValidation.isValid) {
    errors.push('Semua field harus diisi');
  }
  
  if (data.primaryColor && !validateHexColor(data.primaryColor)) {
    errors.push('Format warna tidak valid');
  }
  
  if (data.position && !validateWidgetPosition(data.position)) {
    errors.push('Posisi widget tidak valid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!file) {
    errors.push('File harus dipilih');
  } else {
    if (!validateFileType(file)) {
      errors.push('Tipe file tidak didukung. Gunakan PDF, TXT, DOC, atau DOCX');
    }
    
    if (!validateFileSize(file)) {
      errors.push('Ukuran file terlalu besar. Maksimal 10MB');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}