export const SharedArray = function (name, callback) {
    if (!globalThis.__sharedArrays) {
        globalThis.__sharedArrays = {};
    }

    if (!globalThis.__sharedArrays[name]) {
        globalThis.__sharedArrays[name] = callback();
    }

    return globalThis.__sharedArrays[name];
};