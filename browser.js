import {chromium, firefox, webkit} from 'playwright';

const DEFAULT_BROWSER_TYPE = 'chromium';
const DEFAULT_TIMEOUT = '30s';

class Browser {
    constructor() {
        this.browser = null;
        this.context = null;
    }

    async launch(browserType = DEFAULT_BROWSER_TYPE) {
        const browserOptions = {
            headless: (process.env.K6_BROWSER_HEADLESS ?? 'true') === 'true',
            timeout: this.parseTimeout(process.env.K6_BROWSER_TIMEOUT || DEFAULT_TIMEOUT),
        };

        if (process.env.K6_BROWSER_EXECUTABLE_PATH) {
            browserOptions.executablePath = process.env.K6_BROWSER_EXECUTABLE_PATH;
        }

        if (process.env.K6_BROWSER_ARGS) {
            browserOptions.args = process.env.K6_BROWSER_ARGS.split(' ');
        }

        if (process.env.K6_BROWSER_IGNORE_DEFAULT_ARGS) {
            browserOptions.ignoreDefaultArgs = process.env.K6_BROWSER_IGNORE_DEFAULT_ARGS.split(' ');
        }

        console.log('Launching browser with options:', browserOptions);

        switch (browserType) {
            case 'firefox':
                this.browser = await firefox.launch(browserOptions);
                break;
            case 'webkit':
                this.browser = await webkit.launch(browserOptions);
                break;
            case DEFAULT_BROWSER_TYPE:
            default:
                this.browser = await chromium.launch(browserOptions);
        }
    }

    async closeContext() {
        if (!this.context) {
            throw new Error('No active BrowserContext to close.');
        }
        await this.context.close();
        this.context = null;
    }

    context() {
        return this.context;
    }

    isConnected() {
        return this.browser && this.browser.isConnected();
    }

    async newContext(options) {
        if (this.context) {
            throw new Error('A BrowserContext has already been initialized. Close it before creating a new one.');
        }
        this.context = await this.browser.newContext(options);
        return this.context;
    }

    async newPage(options) {
        if (!this.context) {
            await this.newContext(options);
        }
        return await this.context.newPage();
    }

    async userAgent() {
        if (!this.context) {
            throw new Error('No active BrowserContext. Cannot get user agent.');
        }
        return await this.context.userAgent();
    }

    async version() {
        if (!this.browser) {
            throw new Error('Browser not launched. Cannot get version.');
        }
        return await this.browser.version();
    }

    parseTimeout(timeoutStr) {
        const match = timeoutStr.match(/(\d+)([smh]?)/);
        if (!match) {
            throw new Error(`Invalid timeout format: ${timeoutStr}`);
        }
        const [, value, unit] = match;
        const timeValue = parseInt(value, 10);
        switch (unit) {
            case 'h':
                return timeValue * 3600 * 1000;
            case 'm':
                return timeValue * 60 * 1000;
            case 's':
                return timeValue * 1000;
            default:
                return timeValue * 1000;
        }
    }
}

const browserInstance = new Browser();
await browserInstance.launch()
export const browser = browserInstance;
