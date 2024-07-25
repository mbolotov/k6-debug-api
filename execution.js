export const starterScript = process.env["debug-starter-script"]
export const strict = process.env["strict"] === "true";

const execution = {
    scenario: {
        name: new URL(starterScript).pathname.split("/").splice(-1)[0].replace(/\.\w+$/, ""), // Will be populated with the current scenario name
        executor: 'constant-vus', // Will be populated with the current executor type
        startTime: Date.now(), // Unix timestamp in milliseconds when the scenario started
        progress: 0, // Percentage in a 0 to 1 interval of the scenario progress
        iterationInInstance: 0, // The unique and zero-based sequential number of the current iteration in the scenario, across the current instance
        iterationInTest: 0, // The unique and zero-based sequential number of the current iteration in the scenario
    },

    instance: {
        iterationsInterrupted: 0, // The number of prematurely interrupted iterations in the current instance
        iterationsCompleted: 0, // The number of completed iterations in the current instance
        vusActive: 1, // The number of active VUs
        vusInitialized: 1, // The number of currently initialized VUs
        currentTestRunDuration: 100, // The time passed from the start of the current test run in milliseconds
    },

    test: {
        abort(input) {
            console.log(`Test aborted: ${input || ''}`);
            process.exit(108); // Aborts the test run with the exit code 108
        },
        options: {}, // Placeholder for Options
    },

    vu: {
        iterationInInstance: 0, // The identifier of the iteration in the current instance
        iterationInScenario: 0, // The identifier of the iteration in the current scenario
        idInInstance: 0, // The identifier of the VU across the instance
        idInTest: 0, // The globally unique (across the whole test run) identifier of the VU
        tags: {}, // Map to set or get VU tags (deprecated)
        metrics: {
            tags: {}, // Map to set or get VU tags
            metadata: {}, // Map to set or get VU metadata
        },
    },
};

export default execution;
