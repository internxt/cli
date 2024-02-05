import express, { Express } from "express";
import { IncomingMessage, Server, ServerResponse } from "http";



interface startServerOptions {
    portParam: number;
    hostname: string;
}

const app: Express = express();
let server: Server<typeof IncomingMessage, typeof ServerResponse> = null;

export const startWebDAV = (options: startServerOptions, callback?: () => void) => {
    const port = options.portParam || 3000;


    server = app.listen(port, options.hostname, callback);
}

export function stopWebDAV(callback?: () => void) {
    if (server) {
        server.close(callback);
        server = null;
    } else {
        process.nextTick(callback);
    }
}

interface processMessage {
    message: string,
    params: startServerOptions
}

process.on('message', (message: processMessage) => {
    if (message.message == 'start') {
        startWebDAV(message.params, () => {
            process.send('starting webdav server at port: ' + message.params.portParam);
        });
    } else if (message.message == 'stop') {
        if (server !== null) {
            process.send('stopping webdav server');
            stopWebDAV(() => {
                process.send('succesfully stopped webdav server');
            });
        } else {
            process.send('webdav server not started');
        }
    }
});