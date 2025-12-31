// sync-runner.js
import fs from "fs";
import protoLoader from "@grpc/proto-loader";
import grpc from "@grpc/grpc-js";

import {Client as ReflectionClient} from "grpc-reflection-js/build/src/client.js";

function toGrpcMetadata(obj = {}) {
    const md = new grpc.Metadata();
    for (const [k, v] of Object.entries(obj)) {
        md.set(k, String(v));
    }
    return md;
}

function mdToObject(md) {
    if (!md) return {};
    const map = md.getMap();
    const out = {};
    for (const k in map) {
        out[k] = map[k];
    }
    return out;
}

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

    // Case 1: new versions of @grpc/grpc-js
    if (typeof current === "function") {
        const proto = current.prototype;
        if (proto && (proto.makeUnaryRequest || proto.close || proto.getChannel)) {
            return current;
        }
    }

    // Case 2: for XxxClient  (old versions)
    if (current && typeof current === "object") {
        const serviceName = parts[parts.length - 1];
        const clientKey = serviceName + "Client";
        if (current[clientKey] && typeof current[clientKey] === "function") {
            return current[clientKey];
        }
    }

    return null;
}

(async () => {
    try {
        const inputJson = fs.readFileSync(0, "utf8").trim();
        if (!inputJson) {
            throw new Error("Empty input: expected JSON from stdin");
        }

        const input = JSON.parse(inputJson);

        const {
            protoFiles = [],
            includeDirs = [],
            protosetPath,
            address,
            methodPath, // "my.package.v1.MyService/MethodName"
            request = {},
            metadata = {},
            timeoutMs,
            useReflection = false,
            plaintext = false,
        } = input;

        if (!address || !methodPath) {
            throw new Error("Missing required fields: address and methodPath");
        }

        const [servicePath, methodName] = methodPath.split("/");
        if (!servicePath || !methodName) {
            throw new Error(`Invalid methodPath format. Expected: "package.Service/Method", got: ${methodPath}`);
        }

        const creds = plaintext
            ? grpc.credentials.createInsecure()
            : grpc.credentials.createSsl();

        let packageDefinition;

        if (useReflection) {
            const reflectionClient = new ReflectionClient(address, creds);
            const services = await reflectionClient.listServices();

            const realServices = services.filter(s => s !== "grpc.reflection.v1alpha.ServerReflection");

            const fileDescriptors = await Promise.all(
                realServices.map(s => reflectionClient.fileContainingSymbol(s))
            );

            const jsonDescriptors = fileDescriptors.map(fd => fd.toJSON());
            const combined = jsonDescriptors.reduce((acc, json) => {
                return Object.assign(acc, protoLoader.fromJSON(json));
            }, {});

            packageDefinition = grpc.loadPackageDefinition(combined);

        } else if (protosetPath) {
            const buffer = fs.readFileSync(protosetPath);
            packageDefinition = protoLoader.loadFileDescriptorSetFromBuffer(buffer);
            packageDefinition = grpc.loadPackageDefinition(packageDefinition);

        } else if (protoFiles.length > 0) {
            const loadOptions = {
                keepCase: false,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
                includeDirs: includeDirs || [],
            };

            const loaded = protoFiles.map(file => protoLoader.loadSync(file, loadOptions));
            const combined = loaded.reduce((acc, pkg) => Object.assign(acc, pkg), {});
            packageDefinition = grpc.loadPackageDefinition(combined);

        } else {
            throw new Error("No proto source provided: need protoFiles, protosetPath or useReflection");
        }

        const root = packageDefinition;

        const ClientCtor = findClientConstructor(packageDefinition, servicePath);
        if (!ClientCtor) throw new Error(`Client constructor not found for ${servicePath}`);

        const client = new ClientCtor(address, creds);

        const methodFunc = client[methodName];
        if (typeof methodFunc !== "function") {
            throw new Error(`Method ${methodName} not found on client. Available: ${Object.keys(client).filter(k => typeof client[k] === "function")}`);
        }

        const deadline = timeoutMs ? new Date(Date.now() + Number(timeoutMs)) : undefined;
        const md = toGrpcMetadata(metadata);

        methodFunc.call(client, request, md, {deadline}, (err, response) => {
            const out = {
                ok: !err,
                response: {
                    status: err?.code ?? 0,
                    message: response ?? null,
                    headers: mdToObject(md),
                    trailers: err?.metadata ? mdToObject(err.metadata) : {},
                    error: err ? {code: err.code, message: err.message, details: err.details} : null,
                },
                error: err ? {message: err.message, code: err.code, stack: err.stack} : null,
            };
            process.stdout.write(JSON.stringify(out));
            process.exit(0);
        });
    } catch (e) {
        const result = {
            ok: false,
            response: null,
            error: {
                message: e.message || "Unknown error",
                stack: e.stack || null,
            },
        };
        process.stdout.write(JSON.stringify(result, null, 2));
        process.exit(1);
    }
})();
