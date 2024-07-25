import fs from "fs";
import {starterScript, strict} from "./execution.js";
import chalk from 'chalk';

/**
 * Run checks on a value.
 * https://k6.io/docs/javascript-api/k6/check-val-sets-tags/
 * @template VT - Value type.
 * @param val - Value to test.
 * @param sets - Tests (checks) to run on the value.
 * @param tags - Extra tags to attach to metrics emitted.
 * @returns `true` if all checks have succeeded, otherwise `false`.
 * @example
 * check(res, {
 *  "response code was 200": (res) => res.status == 200,
 *  "body size was 1234 bytes": (res) => res.body.length == 1234,
 * });
 */
export function check(val, sets, tags) {
    let res = true;
    Object.entries(sets).forEach(e => {
        let curCheck = doCheck(e[0], e[1], val);
        console.log(`${curCheck === true ? chalk.green("✓") : chalk.red("✗")} check '${e[0]}' result: ${curCheck}`)
        return res = curCheck && res;
    })
    return res;
}

function doCheck(name, v, val) {
    if (typeof v === "boolean") {
        return v
    }
    if (typeof v !== "function") {
        console.error(`Check '${name}' is not a function: ${JSON.stringify(v)}`)
        return false
    }
    if (strict) {
        v(val)
    } else {
        try {
            return v(val)
        } catch (e) {
            let place = findPlace(e);
            console.error(`Check '${name}' evaluation failed: ${e} ${place === undefined ? "" : place}`)
            return false
        }
    }
}

const script = starterScript.replace("file:/", "")

function findPlace(e) {
    return e.stack.split("\n").find(l => l.includes(script))
}

/**
 * Immediately throw an error, aborting the current script iteration.
 * https://k6.io/docs/javascript-api/k6/fail-err/
 * @param err - Error message that gets printed to stderr.
 * @example
 * fail("abort current iteration");
 */
export function fail(err) {
    throw err
}

/**
 * Run code inside a group.
 * https://k6.io/docs/javascript-api/k6/group-name-fn/
 * @template RT - Return type.
 * @param name - Name of the group.
 * @param fn - Group body. Code to be executed in the group context.
 * @returns The return value of `fn`.
 * @example
 * group("group name", function() {
 *  ..
 * });
 */
export function group(name, fn) {
    if (strict) {
        fn()
    } else {
        try {
            fn()
        } catch (e) {
            let place = findPlace(e);
            console.error(`Group '${name}' evaluation failed: ${e} ${place === undefined ? "" : place}`)
        }
    }
}

/**
 * Set seed to get a reproducible pseudo-random number using Math.random.
 * https://k6.io/docs/javascript-api/k6/randomseed/
 * @param int - The seed value.
 * @example
 * randomSeed(123456789);
 */
export function randomSeed(int) {

}

/**
 * Suspend VU execution for the specified duration.
 * https://k6.io/docs/javascript-api/k6/sleep-t/
 * @param t - Duration, in seconds.
 * @example
 * sleep(3);
 */
export function sleep(t) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, t * 1000);
}

export function open(filePath, mode = 't') {
    if (mode === 'b') {
        // Read the file as a binary buffer
        return fs.readFileSync(filePath);
    } else {
        // Read the file as a UTF-8 string
        return fs.readFileSync(filePath, 'utf8');
    }
}
