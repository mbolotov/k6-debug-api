import WebSocket from 'ws';

class Socket {
    constructor(ws) {
        this.ws = ws;
    }

    close(code) {
        this.ws.close(code);
    }

    on(event, handler) {
        this.ws.on(event, (e) => {
            if (event === 'error') {
                e.error = function () {
                    return e.message
                }
            }
            handler(e)
        });
    }

    ping() {
        this.ws.ping();
    }

    send(data) {
        this.ws.send(data);
    }

    sendBinary(data) {
        this.ws.send(data);
    }

    setInterval(handler, interval) {
        setInterval(handler, interval);
    }

    setTimeout(handler, delay) {
        setTimeout(handler, delay);
    }
}

function connect(url, paramsOrCallback, callback) {
    let params = null;
    if (typeof paramsOrCallback === 'function') {
        callback = paramsOrCallback;
    } else {
        params = paramsOrCallback;
    }

    const headers = (params && params.headers) || {};
    const options = {headers};

    try {
        const ws = new WebSocket(url, options);
        const socket = new Socket(ws);
        if (callback) callback(socket);

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        return {
            url,
            status: 101,
            headers: {},
            body: '',
            error: ''
        };
    } catch (error) {
        return {
            url,
            status: 500,
            headers: {},
            body: '',
            error: error.message
        };
    }
}

const ws = {
    connect
};

export default ws;
