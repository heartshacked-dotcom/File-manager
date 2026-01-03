
// AES-GCM Encryption Service using Web Crypto API

export const SecurityService = {
  // --- Authentication ---
  // In a real app, use a secure storage plugin for the PIN hash
  async hashPin(pin: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async verifyPin(pin: string, storedHash: string): Promise<boolean> {
    const hash = await this.hashPin(pin);
    return hash === storedHash;
  },

  // --- AES Encryption ---
  
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Encrypts a base64 string or text
  async encryptData(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    
    const enc = new TextEncoder();
    const encodedData = enc.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    // Combine Salt + IV + Ciphertext
    const combinedBuffer = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
    combinedBuffer.set(salt, 0);
    combinedBuffer.set(iv, salt.byteLength);
    combinedBuffer.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

    // Return as Base64
    return this.arrayBufferToBase64(combinedBuffer.buffer);
  },

  async decryptData(encryptedBase64: string, password: string): Promise<string> {
    try {
      const combinedBuffer = this.base64ToArrayBuffer(encryptedBase64);
      const combinedArray = new Uint8Array(combinedBuffer);

      const salt = combinedArray.slice(0, 16);
      const iv = combinedArray.slice(16, 28);
      const ciphertext = combinedArray.slice(28);

      const key = await this.deriveKey(password, salt);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (e) {
      throw new Error("Decryption failed. Wrong password or corrupted file.");
    }
  },

  // --- Helpers ---

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
};
