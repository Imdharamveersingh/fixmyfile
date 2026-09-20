import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

/**
 * Protect PDF Engine
 *
 * Implements genuine standard PDF encryption (AES-256 and RC4) completely client-side.
 * The resulting document adheres to Adobe PDF 1.7 / Acrobat standards and genuinely
 * requires the password to open in any PDF viewer or parser.
 */

/**
 * Validates PDF binary buffer.
 */
export function validatePdfBuffer(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.byteLength === 0) {
    throw new Error('The selected file is empty. Please select a valid PDF file.');
  }

  const bytes = new Uint8Array(pdfBuffer);
  if (bytes.length < 5) {
    throw new Error('The file is too small to be a valid PDF document.');
  }

  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid file format. The file is not a valid PDF document (missing %PDF- header).');
  }

  return bytes;
}

/**
 * Encrypts a PDF document with genuine AES-256 standard encryption.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer - Source PDF bytes
 * @param {string} userPassword - Password required to open and read the PDF
 * @param {Object} [options={}] - Protection options
 * @param {string} [options.confirmPassword] - Optional confirmation password to validate matching
 * @param {string} [options.ownerPassword] - Optional owner/permissions password
 * @param {string} [options.algorithm='AES-256'] - 'AES-256' or 'RC4'
 * @param {string} [options.baseFilename='protected'] - Base name for output file
 * @returns {Promise<{ buffer: Uint8Array, blob: Blob, filename: string, algorithm: string }>}
 */
export async function protectPdf(pdfBuffer, userPassword, options = {}) {
  const {
    confirmPassword,
    ownerPassword,
    algorithm = 'AES-256',
    baseFilename = 'protected'
  } = options;

  // Validate passwords
  if (!userPassword || typeof userPassword !== 'string' || userPassword.length === 0) {
    throw new Error('Please enter a password to protect your PDF.');
  }

  if (confirmPassword !== undefined && userPassword !== confirmPassword) {
    throw new Error('Password confirmation does not match. Please re-enter.');
  }

  const bytes = validatePdfBuffer(pdfBuffer);

  let encryptedBytes;
  try {
    encryptedBytes = await encryptPDF(bytes, userPassword, {
      algorithm,
      ownerPassword: ownerPassword || userPassword
    });
  } catch (err) {
    if (err.name === 'AlreadyEncryptedError' || (err.message && err.message.toLowerCase().includes('already encrypted'))) {
      throw new Error('This PDF is already password-protected. Please provide an unprotected PDF.');
    }
    throw new Error(`Failed to encrypt PDF: ${err.message || 'Unknown encryption failure'}`);
  }

  const uint8Buffer = new Uint8Array(encryptedBytes);
  const cleanBaseName = baseFilename.replace(/\.pdf$/i, '').trim() || 'protected-document';
  const filename = `${cleanBaseName}-protected.pdf`;

  const blob = new Blob([uint8Buffer], { type: 'application/pdf' });

  return {
    buffer: uint8Buffer,
    blob,
    filename,
    algorithm
  };
}

/**
 * Verifies that a protected PDF genuinely enforces password encryption using PDF.js.
 * Tests:
 * 1. Opening without password must fail / trigger PasswordException.
 * 2. Opening with incorrect password must fail.
 * 3. Opening with correct password must succeed and yield pages.
 *
 * @param {Uint8Array} protectedBuffer - Raw bytes of the encrypted PDF
 * @param {string} correctPassword - The actual password used
 * @param {string} [wrongPassword='invalid_test_password_xyz'] - An incorrect password
 * @param {Object} [pdfjsLib] - Optional PDF.js library instance
 * @returns {Promise<{ verified: boolean, pageCount: number }>}
 */
export async function verifyPdfProtection(
  protectedBuffer,
  correctPassword,
  wrongPassword = 'invalid_test_password_xyz',
  pdfjsLib = null
) {
  let pdfLib = pdfjsLib;
  if (!pdfLib) {
    pdfLib = await import('pdfjs-dist');
  }

  // 1. Verify access WITHOUT password is rejected
  let blockedWithoutPassword = false;
  try {
    const task = pdfLib.getDocument({
      data: protectedBuffer.slice(0),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    await task.promise;
  } catch (err) {
    if (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password'))) {
      blockedWithoutPassword = true;
    }
  }

  if (!blockedWithoutPassword) {
    throw new Error('Security verification failed: PDF was opened without requiring a password!');
  }

  // 2. Verify access WITH WRONG password is rejected
  let blockedWithWrongPassword = false;
  try {
    const task = pdfLib.getDocument({
      data: protectedBuffer.slice(0),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    task.onPassword = (verifyPassword, reason) => {
      if (reason === 1) {
        verifyPassword(wrongPassword);
      } else {
        // Stop on subsequent retry
        throw new Error('Incorrect password rejected');
      }
    };
    await task.promise;
  } catch {
    blockedWithWrongPassword = true;
  }

  if (!blockedWithWrongPassword) {
    throw new Error('Security verification failed: Incorrect password was accepted!');
  }

  // 3. Verify access WITH CORRECT password succeeds
  let pageCount = 0;
  try {
    const task = pdfLib.getDocument({
      data: protectedBuffer.slice(0),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    task.onPassword = (verifyPassword) => {
      verifyPassword(correctPassword);
    };
    const doc = await task.promise;
    pageCount = doc.numPages;
  } catch (err) {
    throw new Error(`Security verification failed: Correct password could not unlock PDF: ${err.message}`);
  }

  return {
    verified: true,
    pageCount
  };
}
