import crypto from "crypto";

/**
 * Generate random bytes.
 * @param {number} size - Number of bytes to generate.
 * @returns {ArrayBuffer} An ArrayBuffer with cryptographically random bytes.
 */
export function randomBytes(size) {
    const buffer = crypto.randomBytes(size);
    return buffer.buffer;
}

/**
 * Produce HMAC.
 * @param {string} algorithm - Hash algorithm.
 * @param {string | ArrayBuffer} secret - Shared secret.
 * @param {string | ArrayBuffer} input - Input data.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} Produced HMAC.
 */
export function hmac(algorithm, secret, input, outputEncoding) {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(input);
    return hmac.digest(outputEncoding);
}

/**
 * Hash with MD4.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} MD4 digest.
 */
export function md4(input, outputEncoding) {
    const hash = crypto.createHash('md4');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with MD5.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} MD5 digest.
 */
export function md5(input, outputEncoding) {
    const hash = crypto.createHash('md5');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-1.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-1 digest.
 */
export function sha1(input, outputEncoding) {
    const hash = crypto.createHash('sha1');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-256.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-256 digest.
 */
export function sha256(input, outputEncoding) {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-384.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-384 digest.
 */
export function sha384(input, outputEncoding) {
    const hash = crypto.createHash('sha384');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-512.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-512 digest.
 */
export function sha512(input, outputEncoding) {
    const hash = crypto.createHash('sha512');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-512/224.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-512/224 digest.
 */
export function sha512_224(input, outputEncoding) {
    const hash = crypto.createHash('sha512-224');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with SHA-512/256.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} SHA-512/256 digest.
 */
export function sha512_256(input, outputEncoding) {
    const hash = crypto.createHash('sha512-256');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Hash with RIPEMD-160.
 * @param {string | ArrayBuffer} input - Data to hash.
 * @param {string} outputEncoding - Output encoding.
 * @returns {string | Buffer} RIPEMD-160 digest.
 */
export function ripemd160(input, outputEncoding) {
    const hash = crypto.createHash('ripemd160');
    hash.update(input);
    return hash.digest(outputEncoding);
}

/**
 * Create a hashing object.
 * @param {string} algorithm - Hash algorithm.
 * @returns {Object} Hashing object with update and digest methods.
 */
export function createHash(algorithm) {
    let hasher = crypto.createHash(algorithm);
    const data = [];

    return {
        update(input) {
            data.push(input);
            hasher.update(input);
        },
        digest(outputEncoding) {
            const result = hasher.digest(outputEncoding);
            hasher = crypto.createHash(algorithm);
            data.forEach(d => hasher.update(d));
            return result;
        }
    };
}

/**
 * Create an HMAC hashing object.
 * @param {string} algorithm - Hash algorithm.
 * @param {string | ArrayBuffer} secret - Shared secret.
 * @returns {Object} HMAC hashing object with update and digest methods.
 */
export function createHMAC(algorithm, secret) {
    let hasher = crypto.createHmac(algorithm, secret);
    const data = [];

    return {
        update(input) {
            data.push(input);
            hasher.update(input);
        },
        digest(outputEncoding) {
            const result = hasher.digest(outputEncoding);
            hasher = crypto.createHmac(algorithm, secret);
            data.forEach(d => hasher.update(d));
            return result;
        }
    };
}

export default {
    randomBytes,
    hmac,
    md4,
    md5,
    sha1,
    sha256,
    sha384,
    sha512,
    sha512_224,
    sha512_256,
    ripemd160,
    createHash,
    createHMAC
};
