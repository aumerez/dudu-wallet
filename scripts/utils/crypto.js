//crypto.js
class CryptoUtils {
    static async generateEncryptionKey(password, salt) {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      const key = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
  
      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        key,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }
  
    static async encrypt(data, key) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
  
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );
  
      return {
        encrypted: Array.from(new Uint8Array(encryptedData)),
        iv: Array.from(iv)
      };
    }
  
    static async decrypt(encryptedData, key, iv) {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key,
        new Uint8Array(encryptedData)
      );
  
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    }

    static async getDecryptedPrivateKey(wallet) {
        try {
            const { encryptionKey } = await chrome.storage.local.get('encryptionKey');
            
            const key = await crypto.subtle.importKey(
                'raw',
                new Uint8Array(encryptionKey),
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );

            const decryptedPrivateKey = await CryptoUtils.decrypt(
                wallet.encryptedPrivateKey.encrypted,
                key,
                wallet.encryptedPrivateKey.iv
            );

            return decryptedPrivateKey;
        } catch (error) {
            console.error('Error decrypting private key:', error);
            throw new Error('Failed to decrypt private key');
        }
    }
  }