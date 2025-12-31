// grpc.js – FINAL VERSION (2025) – full reflection support in asyncInvoke

import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {spawnSync} from "child_process";
import grpcJs from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

/* -------------------------------------------------------------------------
   gRPC status codes
   ------------------------------------------------------------------------- */
export const StatusOK = 0;
export const StatusCanceled = 1;
export const StatusUnknown = 2;
export const StatusInvalidArgument = 3;
export const StatusDeadlineExceeded = 4;
export const StatusNotFound = 5;
export const StatusAlreadyExists = 6;
export const StatusPermissionDenied = 7;
export const StatusResourceExhausted = 8;
export const StatusFailedPrecondition = 9;
export const StatusAborted = 10;
export const StatusOutOfRange = 11;
export const StatusUnimplemented = 12;
export const StatusInternal = 13;
export const StatusUnavailable = 14;
export const StatusDataLoss = 15;
export const StatusUnauthenticated = 16;

/* -------------------------------------------------------------------------
   Health check statuses
   ------------------------------------------------------------------------- */
export const HealthCheckServing = 1;
export const HealthCheckNotServing = 2;
export const HealthCheckUnknown = 0;
export const HealthCheckServiceUnknown = 3;

/* -------------------------------------------------------------------------
   Lazy load grpc-reflection-js
   ------------------------------------------------------------------------- */
let ReflectionClient = null;

async function getReflectionClientClass() {
    if (!ReflectionClient) {
        const mod = await import("grpc-reflection-js");
        ReflectionClient = mod.Client;
    }
    return ReflectionClient;
}

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */
function parseTimeout(v) {
    if (!v) return undefined;
    if (typeof v === "number") return v > 0 ? v : undefined;
    const m = String(v).trim().match(/^(\d+)(ms|s|m)?$/);
    if (!m) return undefined;
    const n = Number(m[1]);
    const u = m[2] || "ms";
    return u === "s" ? n * 1000 : u === "m" ? n * 60 * 1000 : n;
}

function normalizeFsPath(p) {
    if (!p) return p;
    if (p.startsWith("file:")) {
        try {
            return fileURLToPath(p);
        } catch {
        }
    }
    return p;
}

function resolveProtoPathWithIncludes(protoPath, includeDirs = [], scriptPath) {
    if (path.isAbsolute(protoPath)) return path.normalize(protoPath);
    const scriptDir = scriptPath ? path.dirname(normalizeFsPath(scriptPath)) : process.cwd();
    const inc = (Array.isArray(includeDirs) ? includeDirs : [includeDirs])
        .filter(Boolean)
        .map(d => normalizeFsPath(d))
        .map(d => path.isAbsolute(d) ? d : path.resolve(scriptDir, d));

    const candidates = [
        path.resolve(scriptDir, protoPath),
        ...inc.map(d => path.resolve(d, protoPath)),
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return path.resolve(process.cwd(), protoPath);
}

function toGrpcMetadata(obj = {}) {
    const md = new grpcJs.Metadata();
    for (const [k, v] of Object.entries(obj)) md.set(k, String(v));
    return md;
}

// Fixed for Node.js 20+ – getMap() returns plain object
function mdToObject(md) {
    return md ? Object.assign({}, md.getMap()) : {};
}

/* -------------------------------------------------------------------------
   Find client constructor – works with all @grpc/grpc-js versions
   ------------------------------------------------------------------------- */
function findClientConstructor(root, servicePath) {
    const parts = servicePath.split(".");
    let current = root;

    for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
            current = current[part];
        } else {
            return null;
        }
    }

    if (typeof current === "function") {
        const proto = current.prototype;
        if (proto && (proto.makeUnaryRequest || proto.close || proto.getChannel)) {
            return current;
        }
    }

    const parentPath = parts.slice(0, -1);
    let parent = root;
    for (const p of parentPath) parent = parent?.[p];
    const name = parts[parts.length - 1];
    return parent?.[name + "Client"] || parent?.[name + "ServiceClient"] || parent?.Client || null;
}

/* -------------------------------------------------------------------------
   Sync invoke (k6-safe)
   ------------------------------------------------------------------------- */
function syncInvokeViaChild(payload) {
    const __filename = fileURLToPath(import.meta.url);
    const runnerPath = path.join(path.dirname(__filename), "sync-runner.js");

    const child = spawnSync(process.execPath, [runnerPath], {
        input: JSON.stringify(payload),
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30_000,
    });

    if (child.error || child.status !== 0) {
        throw new Error(`gRPC child failed: ${child.stderr || child.error}`);
    }

    const out = (child.stdout || "").trim();
    if (!out) throw new Error("Empty response from gRPC child");

    let parsed;
    try {
        parsed = JSON.parse(out);
    } catch (e) {
        throw new Error(`Invalid JSON from child: ${e.message}\n${out}`);
    }

    if (!parsed.ok) {
        const err = parsed.error || {};
        const e = new Error(err.message || "gRPC call failed");
        e.code = err.code ?? StatusUnknown;
        e.childStack = err.stack;
        throw e;
    }

    return {
        status: parsed.response?.status ?? StatusOK,
        message: parsed.response?.message ?? {},
        headers: parsed.response?.headers ?? {},
        trailers: parsed.response?.trailers ?? {},
        error: parsed.response?.error ?? null,
    };
}

/* -------------------------------------------------------------------------
   Main Client class – asyncInvoke now fully supports reflection
   ------------------------------------------------------------------------- */
export class Client {
    constructor() {
        this._address = null;
        this._creds = null;
        this._params = {};
        this._grpcPackage = null;
        this._reflectionEnabled = false;
        this._reflectionClient = null;
        this._serviceClients = new Map();
        this._protosetPath = null;
        this._loadedFiles = [];
        this._includeDirs = [];
        this._scriptPath = process.env["debug-starter-script"] || null;
    }

    /* ---------------------------------------------------------------------
         Load .proto files from disk
         --------------------------------------------------------------------- */
    load(importPaths, ...protoFiles) {
        if (this._grpcPackage) throw new Error("load() already called");

        const includeDirs = Array.isArray(importPaths) ? importPaths : (importPaths ? [importPaths] : []);
        this._includeDirs = includeDirs.map(normalizeFsPath);

        if (!protoFiles.length) return;

        const resolved = protoFiles.map(p => {
            const full = resolveProtoPathWithIncludes(p, this._includeDirs, this._scriptPath);
            if (!fs.existsSync(full)) throw new Error(`Proto file not found: ${full}`);
            return full;
        });

        const options = {
            keepCase: false,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: this._includeDirs,
        };

        const merged = resolved.reduce((acc, f) => {
            this._loadedFiles.push(f);
            return Object.assign(acc, protoLoader.loadSync(f, options));
        }, {});

        this._packageDefinition = merged;
        this._grpcPackage = grpcJs.loadPackageDefinition(merged);
    }

    /* ---------------------------------------------------------------------
       Load a pre-compiled FileDescriptorSet (protoset)
       --------------------------------------------------------------------- */
    loadProtoset(protosetPath) {
        const resolved = resolveProtoPathWithIncludes(protosetPath, this._includeDirs, this._scriptPath);
        if (!fs.existsSync(resolved)) throw new Error(`Protoset not found: ${resolved}`);

        const buffer = fs.readFileSync(resolved);
        const pd = protoLoader.loadFileDescriptorSetFromBuffer(buffer);
        this._packageDefinition = pd;
        this._grpcPackage = grpcJs.loadPackageDefinition(pd);
        this._protosetPath = resolved;
        this._loadedFiles = [];
    }

    connect(address, params = {}) {
        if (!params.reflect && !this._grpcPackage) {
            throw new Error("Call load(), loadProtoset() or use reflect: true");
        }
        this._address = address;
        this._params = params;
        this._reflectionEnabled = !!params.reflect;

        const insecure = !!(params.plaintext || params.plainText || params.insecure);
        this._creds = insecure
            ? grpcJs.credentials.createInsecure()
            : params.rootCerts
                ? grpcJs.credentials.createSsl(Buffer.isBuffer(params.rootCerts) ? params.rootCerts : Buffer.from(String(params.rootCerts)))
                : grpcJs.credentials.createSsl();
    }

    /* Lazy load service via reflection if not already loaded */
    async _ensureServiceLoaded(servicePath) {
        if (this._grpcPackage) return;

        if (!this._reflectionEnabled) {
            throw new Error("Reflection disabled and no proto loaded");
        }

        if (!this._reflectionClient) {
            const RC = await getReflectionClientClass();
            this._reflectionClient = new RC(this._address, this._creds);
        }

        const descriptor = await this._reflectionClient.fileContainingSymbol(servicePath);
        const pd = protoLoader.fromJSON(descriptor.toJSON());
        this._grpcPackage = grpcJs.loadPackageDefinition(pd);
    }

    async getClient(servicePath) {
        if (this._serviceClients.has(servicePath)) {
            return this._serviceClients.get(servicePath);
        }

        await this._ensureServiceLoaded(servicePath);

        const ClientCtor = findClientConstructor(this._grpcPackage, servicePath);
        if (!ClientCtor) throw new Error(`Service client not found: ${servicePath}`);

        const client = new ClientCtor(this._address, this._creds);
        this._serviceClients.set(servicePath, client);
        return client;
    }

    async listServices() {
        if (!this._reflectionEnabled) throw new Error("Reflection not enabled");
        if (!this._reflectionClient) {
            const RC = await getReflectionClientClass();
            this._reflectionClient = new RC(this._address, this._creds);
        }
        const services = await this._reflectionClient.listServices();
        return services.filter(s => !s.startsWith("grpc.reflection"));
    }

    invoke(methodPath, data = {}, metadata = {}, params = {}) {
        if (!this._address) throw new Error("Not connected");

        const timeoutMs = parseTimeout(params.timeout ?? this._params.timeout) || 0;
        const plaintext = !!(this._params.plaintext || this._params.plainText || this._params.insecure);

        const payload = {
            address: this._address,
            methodPath,
            request: data,
            metadata,
            timeoutMs,
            plaintext,
            useReflection: this._reflectionEnabled && !this._protosetPath,
            protosetPath: this._protosetPath || undefined,
            protoFiles: this._loadedFiles,
            includeDirs: this._includeDirs,
        };

        return syncInvokeViaChild(payload);
    }

    /* Now fully async + reflection-aware */
    async asyncInvoke(methodPath, data = {}, metadata = {}, params = {}) {
        if (!this._address) throw new Error("Client not connected");

        const [servicePath, methodName] = String(methodPath).split("/");
        if (!servicePath || !methodName) throw new Error(`Invalid methodPath: ${methodPath}`);

        const client = await this.getClient(servicePath);
        const methodFunc = client[methodName];
        if (typeof methodFunc !== "function") {
            throw new Error(`Method not found: ${methodName}`);
        }

        const md = toGrpcMetadata(metadata);
        const timeoutMs = parseTimeout(params.timeout ?? this._params.timeout);
        const opts = timeoutMs ? {deadline: new Date(Date.now() + timeoutMs)} : {};

        if (params.waitForReady) {
            await new Promise((res, rej) => {
                client.waitForReady(Date.now() + 10000, err => (err ? rej(err) : res()));
            });
        }

        return new Promise((resolve) => {
            methodFunc.call(client, data, md, opts, (err, response) => {
                resolve({
                    status: err?.code ?? StatusOK,
                    message: response ?? {},
                    headers: mdToObject(md),
                    trailers: err?.metadata ? mdToObject(err.metadata) : {},
                    error: err ? {code: err.code, message: err.message} : null,
                });
            });
        });
    }

    healthCheck(service = "") {
        try {
            const r = this.invoke("grpc.health.v1.Health/Check", {service});
            const map = {SERVING: 1, NOT_SERVING: 2, UNKNOWN: 0};
            return {Status: map[r.message?.status] ?? 0};
        } catch {
            return {Status: HealthCheckUnknown};
        }
    }

    close() {
        for (const c of this._serviceClients.values()) {
            try {
                c.close?.() || c.getChannel?.().close?.();
            } catch {
            }
        }
        this._serviceClients.clear();
    }
}

export default {
    Client,
    StatusOK, StatusCanceled, StatusUnknown, StatusInvalidArgument,
    StatusDeadlineExceeded, StatusNotFound, StatusAlreadyExists, StatusPermissionDenied,
    StatusResourceExhausted, StatusFailedPrecondition, StatusAborted, StatusOutOfRange,
    StatusUnimplemented, StatusInternal, StatusUnavailable, StatusDataLoss, StatusUnauthenticated,
    HealthCheckServing, HealthCheckNotServing, HealthCheckUnknown, HealthCheckServiceUnknown,
};
