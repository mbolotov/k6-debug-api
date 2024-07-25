export const encoding = {
    // Base64 decode a string.
    b64decode: function (input, variant = "std", format) {
        let buffer;
        switch (variant) {
            case "std":
            case null:
                buffer = Buffer.from(input, 'base64');
                break;
            case "rawstd":
                buffer = Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
                break;
            case "url":
                buffer = Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
                break;
            case "rawurl":
                buffer = Buffer.from(input, 'base64');
                break;
            default:
                throw new Error(`Unsupported base64 variant: ${variant}`);
        }
        if (format === "s") {
            return buffer.toString('utf8');
        } else {
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
    },

    // Base64 encode a string or ArrayBuffer.
    b64encode: function (input, variant = "std") {
        let buffer;
        if (input instanceof ArrayBuffer) {
            buffer = Buffer.from(new Uint8Array(input));
        } else {
            buffer = Buffer.from(input, 'utf8');
        }
        let base64 = buffer.toString('base64');
        switch (variant) {
            case "std":
            case null:
                return base64;
            case "rawstd":
                return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            case "url":
                return base64.replace(/\+/g, '-').replace(/\//g, '_');
            case "rawurl":
                return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            default:
                throw new Error(`Unsupported base64 variant: ${variant}`);
        }
    }
};


export default encoding
