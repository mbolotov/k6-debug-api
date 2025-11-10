import syncRequest from 'sync-request';
import {Cookie, CookieJar as ToughCookieJar} from 'tough-cookie';
import querystring from 'querystring';
import thenRequest from 'then-request';
import execution from "./execution.js";
import {parseHTML} from "./html.js";


export const OCSP_STATUS_GOOD = 'good';
export const OCSP_STATUS_REVOKED = 'revoked';
export const OCSP_STATUS_UNKNOWN = 'unknown';
export const OCSP_REASON_AA_COMPROMISE = "aa_compromise";
export const OCSP_REASON_AFFILIATION_CHANGED = "affiliation_changed";
export const OCSP_REASON_CA_COMPROMISE = "ca_compromise";
export const OCSP_REASON_CERTIFICATE_HOLD = "certificate_hold";
export const OCSP_REASON_CESSATION_OF_OPERATION = "cessation_of_operation";
export const OCSP_REASON_KEY_COMPROMISE = "key_compromise";
export const OCSP_REASON_PRIVILEGE_WITHDRAWN = "privilege_withdrawn";
export const OCSP_REASON_REMOVE_FROM_CRL = "remove_from_crl";
export const OCSP_REASON_SUPERSEDED = "superseded";
export const OCSP_REASON_UNSPECIFIED = "unspecified";

export const SSL_3_0 = "ssl3.0";
export const TLS_1_0 = "tls1.0";
export const TLS_1_1 = "tls1.1";
export const TLS_1_2 = "tls1.2";
export const TLS_1_3 = "tls1.3";


/**
 * Object for storing cookies.
 */
export class CookieJar {
    constructor() {
        this.jar = new ToughCookieJar();
    }

    cookiesForURL(url) {
        const cookies = this.jar.getCookiesSync(url);
        const cookieJarCookies = {};
        cookies.forEach(cookie => {
            if (!cookieJarCookies[cookie.key]) {
                cookieJarCookies[cookie.key] = [];
            }
            cookieJarCookies[cookie.key].push(cookie.value);
        });
        return cookieJarCookies;
    }

    set(url, name, value, options = {}) {
        const cookie = new Cookie({key: name, value, ...options});
        this.jar.setCookieSync(cookie, url);
    }

    clear(url) {
        this.jar.removeAllCookiesSync()
    }

    delete(url, name) {
        const cookies = this.jar.getCookiesSync(url);
        const cookie = cookies.find(cookie => cookie.key === name);
        if (cookie) {
            this.jar.setCookieSync("", cookie.path, cookie.key);
        }
    }
}

const curCookieJar = new CookieJar();

export function cookieJar() {
    return curCookieJar;
}

export function file(data, filename, contentType) {
    if (typeof data !== 'string' && !(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
        throw new Error("Invalid data type. Expected string, Uint8Array, or ArrayBuffer.");
    }

    return {
        data: data,
        filename: filename || "file",
        content_type: contentType || "application/octet-stream"
    };
}

export function get(url, params) {
    return request('GET', url, null, params);
}

export function post(url, body, params) {
    return request('POST', url, body, params);
}

export function put(url, body, params) {
    return request('PUT', url, body, params);
}

export function patch(url, body, params) {
    return request('PATCH', url, body, params);
}

export function del(url, params) {
    return request('DELETE', url, null, params);
}

export function batch(requests) {
    const results = [];

    for (const req of requests) {
        let method, url, body, params;

        if (typeof req === "string") {
            method = 'GET';
            url = req;
            body = undefined;
            params = undefined;
        } else if (Array.isArray(req) && req.length === 2) {
            [method, url] = req;
            body = undefined;
            params = undefined;
        } else if (Array.isArray(req) && req.length === 3) {
            [method, url, body] = req;
            params = undefined;
        } else if (typeof req === "object" && req !== null) {
            [method, url, body, params] = req;
        } else {
            throw new Error("Invalid request format");
        }

        results.push(request(method || 'GET', url, body, params));
    }

    return results;
}


export const http = {
    get: get,
    post: post,
    put: put,
    patch: patch,
    del: del,
    file: file,

    batch: batch,

    asyncRequest: asyncRequest,

    cookieJar: cookieJar,
    CookieJar: CookieJar,

    OCSP_STATUS_GOOD,
    OCSP_STATUS_REVOKED,
    OCSP_STATUS_UNKNOWN,
    TLS_1_0,
    TLS_1_2,
    TLS_1_3,
    SSL_3_0,
};

export function asyncRequest(method, url, body = null, params = null) {
    return new Promise((resolve, reject) => {
        const options = {
            body: body,
            headers: params ? params.headers : undefined,
        };

        thenRequest(method, url, options)
            .then((response) => {
                const refinedResponse = {
                    body: response.getBody(),
                    status: response.statusCode,
                    headers: response.headers,
                };
                resolve(refinedResponse);
            })
            .catch((error) => {
                reject(error);
            });
    });
}
function request(method, url, body, params) {
    const start = Date.now();

    let timings = {
        blocked: 0,
        connecting: 0,
        tls_handshaking: 0,
        sending: 0,
        waiting: 0,
        receiving: 0,
        duration: 0
    };
    let requestDetails = {
        body: body || '',
        cookies: params?.cookies || {},
        headers: params?.headers || {},
        method: method,
        url: url
    };

    try {
        let queryString = '';
        if (params && params.query) {
            queryString = '?' + new URLSearchParams(params.query).toString();
        }

        const {auth, username, password} = extractAuthFromURL(url, params);
        url = removeCredentialsFromURL(url);

        const options = {
            headers: params?.headers || {},
            timeout: params?.timeout,
            rejectUnauthorized: execution.test.options?.insecureSkipTLSVerify ?? false
        };

        if (auth) {
            addAuthHeaders(options.headers, auth, username, password);
        }

        if (body !== null && body !== undefined) {
            if (typeof body === 'string' || Buffer.isBuffer(body) || body instanceof ArrayBuffer) {
                options.body = body;
            } else if (typeof body === 'object' && method === 'POST') {
                options.body = querystring.stringify(body);
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                options.json = body;
            }
        }

        if (params?.cookies) {
            options.headers['Cookie'] = formatCookies(params.cookies);
        }
        if (options.headers['User-Agent'] === undefined) {
            let fromOptions = execution.test.options?.userAgent
            if (fromOptions) {
                options.headers['User-Agent'] = fromOptions;
            }
        }

        const urlWithParams = url + queryString;


        const connectStart = Date.now();
        const response = syncRequest(method, urlWithParams, options);
        const connectEnd = Date.now();

        const responseStart = Date.now();
        const responseBody = response.getBody('utf8');
        const responseEnd = Date.now();

        timings.blocked = connectStart - start;
        timings.connecting = connectEnd - connectStart;
        timings.sending = responseStart - connectEnd;
        timings.waiting = responseEnd - responseStart;
        timings.receiving = Date.now() - responseEnd;
        timings.duration = timings.sending + timings.waiting + timings.receiving;
        return new Response(response.statusCode, responseBody, response.headers, url, params?.jar, '', 0, timings, requestDetails);
    } catch (error) {
        if (execution.test.options?.throw === true) {
            throw new Error("Failed to make a http request: " + error)
        }
        const errorEnd = Date.now();

        timings.blocked = 0;
        timings.connecting = 0;
        timings.sending = errorEnd - start;
        timings.waiting = 0;
        timings.receiving = 0;
        timings.duration = timings.sending + timings.waiting + timings.receiving;
        return new Response(error.statusCode || 500, error.message, {}, null, null, error.message, -1, timings, requestDetails);
    }
}

function extractAuthFromURL(url, params) {
    const urlObj = new URL(url);
    let authMethod = params?.auth;
    let username = params?.username || urlObj.username;
    let password = params?.password || urlObj.password;

    if (!authMethod && (username || password)) {
        authMethod = 'basic';
    }

    return {auth: authMethod, username, password};
}

function removeCredentialsFromURL(url) {
    const urlObj = new URL(url);
    urlObj.username = '';
    urlObj.password = '';
    return urlObj.toString();
}

function addAuthHeaders(headers, authMethod, username, password) {
    const authString = `${username}:${password}`;
    switch (authMethod) {
        case 'basic':
            headers['Authorization'] = 'Basic ' + Buffer.from(authString).toString('base64');
            break;
        case 'digest':
            // Digest authentication can be complex, and typically involves multiple requests.
            // This is a simplified implementation.
            headers['Authorization'] = 'Digest ' + Buffer.from(authString).toString('base64');
            break;
        case 'ntlm':
            // NTLM authentication is also complex and often involves external libraries.
            // This is a placeholder for NTLM authentication.
            headers['Authorization'] = 'NTLM ' + Buffer.from(authString).toString('base64');
            break;
        default:
            throw new Error(`Unsupported auth method: ${authMethod}`);
    }
}

class Response {
    constructor(status, body, headers, url, jar, error = '', errorCode = 0, timings, request) {
        this.body = body;
        this.cookies = parseCookies(headers['set-cookie']);
        this.error = error;
        this.error_code = errorCode;
        this.headers = headers;
        this.ocsp = {
            produced_at: Date.now(),
            this_update: Date.now(),
            next_update: Date.now() + 1000,
            revocation_reason: OCSP_REASON_UNSPECIFIED,
            revoked_at: -1,
            status: OCSP_STATUS_GOOD
        };
        this.proto = 'HTTP/1.1';
        this.remote_ip = '127.0.0.1';
        this.remote_port = 80;
        this.request = request;
        this.status = status;
        this.status_text = 'OK';
        this.timings = timings;
        this.tls_cipher_suite = "TLS_RSA_WITH_AES_128_GCM_SHA256";
        this.tls_version = TLS_1_2;
        this.url = url;

        saveCookiesToJar(url, this.cookies, jar || curCookieJar);
    }

    json(selector) {
        let json;
        try {
            json = JSON.parse(this.body);
        } catch (error) {
            throw new Error('Failed to parse JSON: ' + error.message);
        }

        if (selector) {
            const keys = selector.split('.');
            let value = json;
            for (const key of keys) {
                if (value[key] !== undefined) {
                    value = value[key];
                } else {
                    throw new Error(`Selector path '${selector}' not found in JSON`);
                }
            }
            return value;
        } else {
            return json;
        }
    }

    html(selector) {
        const $ = parseHTML(this.body);
        if (selector) {
            return $.find(selector);
        } else {
            return $.elements;
        }
    }

    clickLink(args) {
        // todo implement
        return null;
    }

    submitForm(args) {
        // todo implement
        return null;
    }
}

function formatCookies(cookies) {
    return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ');
}

function parseCookies(setCookieHeaders) {
    const cookies = {};
    if (setCookieHeaders) {
        setCookieHeaders.forEach(header => {
            const cookie = Cookie.parse(header);
            if (cookie) {
                cookies[cookie.key] = cookie.value;
            }
        });
    }
    return cookies;
}

function saveCookiesToJar(url, cookies, jar) {
    for (const [name, value] of Object.entries(cookies)) {
        const cookie = new Cookie({key: name, value});
        jar.jar.setCookieSync(cookie, url);
    }
}


export default http;
